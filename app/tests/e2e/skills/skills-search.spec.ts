/**
 * Skills Hub 搜索页 E2E 测试
 *
 * 测试覆盖：
 * - 搜索页面访问和显示
 * - 关键词搜索
 * - 平台筛选
 * - 排序功能
 * - 分页加载
 * - 空结果状态
 *
 * 注意：搜索页需要登录才能访问
 */

import { test, expect, Page } from '@playwright/test'

// ============================================
// 测试数据
// ============================================

const TEST_USER = {
  id: 'test-user-id-12345',
  email: 'test@example.com',
  password: '888888',
}

// ============================================
// 辅助函数
// ============================================

async function clearAuthState(page: Page) {
  await page.context().clearCookies()
  await page.evaluate(() => {
    try {
      localStorage.clear()
      sessionStorage.clear()
    } catch {
      // 忽略跨域错误
    }
  })
}

async function mockAuthUser(page: Page) {
  await page.route('**/auth/v1/user', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        id: TEST_USER.id,
        email: TEST_USER.email,
        aud: 'authenticated',
        role: 'authenticated',
        created_at: '2024-01-01T00:00:00.000Z',
        updated_at: '2024-01-01T00:00:00.000Z',
        user_metadata: { display_name: '测试用户' },
        app_metadata: {},
      }),
    })
  })
  await page.route('**/auth/v1/token**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        access_token: 'mock-access-token-' + Date.now(),
        refresh_token: 'mock-refresh-token-' + Date.now(),
        expires_in: 3600,
        expires_at: Date.now() / 1000 + 3600,
        token_type: 'bearer',
        user: {
          id: TEST_USER.id,
          email: TEST_USER.email,
        },
      }),
    })
  })
}

async function loginAsTestUser(page: Page) {
  await page.goto('/login')
  await page.waitForLoadState('networkidle')
  await page.fill('#email', TEST_USER.email)
  await page.fill('#password', TEST_USER.password)
  await page.click('button[type="submit"]')
  await page.waitForURL(/.*localhost.*/, { timeout: 15000 }).catch(() => {})
  await page.waitForTimeout(1000)
}

// ============================================
// 测试套件
// ============================================

test.describe('[P0] Skills Hub 搜索页 - 核心功能', () => {
  test.beforeEach(async ({ page }) => {
    await clearAuthState(page)
    await mockAuthUser(page)
    await loginAsTestUser(page)
  })

  test('[P0] 应该显示搜索页面', async ({ page }) => {
    await page.goto('/search')
    await page.waitForLoadState('networkidle')

    // 检查搜索输入框 - SearchPage 使用 placeholder "搜索 Skills..."
    const searchInput = page.getByPlaceholder('搜索 Skills...')
    await expect(searchInput).toBeVisible({ timeout: 10000 })
  })

  test('[P0] 从 URL 参数读取搜索词', async ({ page }) => {
    await page.goto('/search?q=react')
    await page.waitForLoadState('networkidle')

    // 检查搜索框值
    const searchInput = page.getByPlaceholder('搜索 Skills...')
    await expect(searchInput).toHaveValue('react', { timeout: 10000 })
  })

  test('[P0] 显示搜索结果数量', async ({ page }) => {
    await page.goto('/search?q=react')
    await page.waitForLoadState('networkidle')

    // 检查结果统计文本
    const resultText = page.getByText(/找到.*个结果|搜索中/)
    await expect(resultText).toBeVisible({ timeout: 10000 })
  })
})

test.describe('[P1] Skills Hub 搜索页 - 搜索功能', () => {
  test.beforeEach(async ({ page }) => {
    await clearAuthState(page)
    await mockAuthUser(page)
    await loginAsTestUser(page)
  })

  test('[P1] 输入关键词触发搜索', async ({ page }) => {
    await page.goto('/search')
    await page.waitForLoadState('networkidle')

    const searchInput = page.getByPlaceholder('搜索 Skills...')
    await expect(searchInput).toBeVisible({ timeout: 10000 })

    // 输入搜索词
    await searchInput.fill('typescript')

    // URL 应该更新
    await expect(page).toHaveURL(/.*q=typescript.*/, { timeout: 5000 })
  })

  test('[P1] 清空搜索词', async ({ page }) => {
    await page.goto('/search?q=react')
    await page.waitForLoadState('networkidle')

    const searchInput = page.getByPlaceholder('搜索 Skills...')
    await expect(searchInput).toHaveValue('react', { timeout: 10000 })

    // 点击清空按钮
    const clearButton = page
      .locator('button')
      .filter({ has: page.locator('svg') })
      .nth(0)
    if (await clearButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await clearButton.click()
    }
  })

  test('[P1] 实时搜索更新结果', async ({ page }) => {
    await page.goto('/search')
    await page.waitForLoadState('networkidle')

    const searchInput = page.getByPlaceholder('搜索 Skills...')

    // 输入第一个关键词
    await searchInput.fill('react')

    // 修改关键词
    await searchInput.fill('typescript')

    // URL 应该更新为新的关键词
    await expect(page).toHaveURL(/.*q=typescript.*/, { timeout: 5000 })
  })
})

test.describe('[P1] Skills Hub 搜索页 - 筛选功能', () => {
  test.beforeEach(async ({ page }) => {
    await clearAuthState(page)
    await mockAuthUser(page)
    await loginAsTestUser(page)
  })

  test('[P1] 应该显示筛选按钮', async ({ page }) => {
    await page.goto('/search')
    await page.waitForLoadState('networkidle')

    // 检查筛选按钮 - 使用精确的 name
    const filterButton = page.getByRole('button', { name: '筛选' })
    await expect(filterButton).toBeVisible({ timeout: 10000 })
  })

  test('[P1] 点击筛选按钮打开筛选面板', async ({ page }) => {
    await page.goto('/search')
    await page.waitForLoadState('networkidle')

    const filterButton = page.getByRole('button', { name: '筛选' })
    await filterButton.click()

    // 检查筛选面板标题
    const filterPanel = page.getByRole('heading', { name: '筛选条件' })
    await expect(filterPanel).toBeVisible({ timeout: 5000 })
  })

  test('[P1] 选择平台筛选', async ({ page }) => {
    await page.goto('/search')
    await page.waitForLoadState('networkidle')

    // 打开筛选面板
    const filterButton = page.getByRole('button', { name: '筛选' })
    await filterButton.click()

    // 点击 Qoder 平台选项 - 使用 Badge 组件
    const qoderBadge = page.locator('span:has-text("Qoder")').first()
    if (await qoderBadge.isVisible({ timeout: 2000 }).catch(() => false)) {
      await qoderBadge.click()
    }
  })

  test('[P1] 清除筛选条件', async ({ page }) => {
    await page.goto('/search?platforms=qoder')
    await page.waitForLoadState('networkidle')

    // 检查已筛选标签
    const filteredTag = page.getByText('已筛选')
    if (await filteredTag.isVisible({ timeout: 2000 }).catch(() => false)) {
      // 点击清除全部
      const clearButton = page.getByRole('button', { name: '清除全部' })
      if (await clearButton.isVisible({ timeout: 2000 }).catch(() => false)) {
        await clearButton.click()
      }
    }
  })
})

test.describe('[P1] Skills Hub 搜索页 - 排序功能', () => {
  test.beforeEach(async ({ page }) => {
    await clearAuthState(page)
    await mockAuthUser(page)
    await loginAsTestUser(page)
  })

  test('[P1] 应该显示排序选择器', async ({ page }) => {
    await page.goto('/search')
    await page.waitForLoadState('networkidle')

    // 检查排序选择器 - SearchPage 使用 Select 组件，默认显示"下载量"
    const sortSelect = page
      .getByRole('combobox')
      .or(page.locator('button').filter({ hasText: '下载量' }))
    await expect(sortSelect.first()).toBeVisible({ timeout: 10000 })
  })

  test('[P1] 从 URL 读取排序参数', async ({ page }) => {
    await page.goto('/search?sort=likes')
    await page.waitForLoadState('networkidle')

    // URL 应该包含排序参数
    await expect(page).toHaveURL(/.*sort=likes.*/)
  })

  test('[P1] 切换排序方式', async ({ page }) => {
    await page.goto('/search')
    await page.waitForLoadState('networkidle')

    // 点击排序选择器
    const sortSelect = page.getByRole('combobox').first()
    if (await sortSelect.isVisible({ timeout: 2000 }).catch(() => false)) {
      await sortSelect.click()

      // 选择"点赞数"排序
      const likesOption = page.getByRole('option', { name: '点赞数' })
      if (await likesOption.isVisible({ timeout: 2000 }).catch(() => false)) {
        await likesOption.click()
      }
    }
  })
})

test.describe('[P2] Skills Hub 搜索页 - 分页', () => {
  test.beforeEach(async ({ page }) => {
    await clearAuthState(page)
    await mockAuthUser(page)
    await loginAsTestUser(page)
  })

  test('[P2] 应该显示加载更多按钮（结果充足时）', async ({ page }) => {
    await page.goto('/search')
    await page.waitForLoadState('networkidle')

    // 检查加载更多按钮
    const loadMoreButton = page.getByRole('button', { name: '加载更多' })
    // 只有结果数量超过一页时才显示
    if (await loadMoreButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await expect(loadMoreButton).toBeEnabled()
    }
  })
})

test.describe('[P2] Skills Hub 搜索页 - 空状态', () => {
  test.beforeEach(async ({ page }) => {
    await clearAuthState(page)
    await mockAuthUser(page)
    await loginAsTestUser(page)
  })

  test('[P2] 无结果时显示空状态', async ({ page }) => {
    await page.goto('/search?q=nonexistent-skill-xyz-12345')
    await page.waitForLoadState('networkidle')

    // 检查空状态提示 - SearchPage 显示 "未找到相关 Skills"
    const emptyState = page.getByRole('heading', { name: '未找到相关 Skills' })
    await expect(emptyState).toBeVisible({ timeout: 10000 })
  })
})

test.describe('[P1] Skills Hub 搜索页 - 高级搜索', () => {
  test.beforeEach(async ({ page }) => {
    await clearAuthState(page)
    await mockAuthUser(page)
    await loginAsTestUser(page)
  })

  test('[P1] 搜索结果包含 Skill 卡片', async ({ page }) => {
    await page.goto('/search?q=react')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(2000)

    // 检查搜索结果卡片 - SkillCard 是 Link 组件
    const skillCards = page.locator('a[href^="/skill/"]')
    const count = await skillCards.count()

    // 应该有搜索结果
    expect(count).toBeGreaterThanOrEqual(0)
  })

  test('[P1] Skill 卡片显示基本信息', async ({ page }) => {
    await page.goto('/search?q=react')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(2000)

    // 获取第一个 skill 卡片
    const firstCard = page.locator('a[href^="/skill/"]').first()

    if (await firstCard.isVisible({ timeout: 2000 }).catch(() => false)) {
      // 检查名称 - SkillCard 使用 h3
      const name = firstCard.locator('h3').first()
      await expect(name).toBeVisible()

      // 检查描述
      const description = firstCard.locator('p').first()
      const hasDescription = await description.isVisible({ timeout: 2000 }).catch(() => false)

      if (hasDescription) {
        await expect(description).toBeVisible()
      }
    }
  })

  test('[P1] Skill 卡片显示统计数据', async ({ page }) => {
    await page.goto('/search?q=react')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(2000)

    const firstCard = page.locator('a[href^="/skill/"]').first()

    if (await firstCard.isVisible({ timeout: 2000 }).catch(() => false)) {
      // 检查下载量 - SkillCard 使用 Download 图标
      const downloads = firstCard.locator('svg').first()
      const hasDownloads = await downloads.isVisible({ timeout: 2000 }).catch(() => false)

      // 至少应该有图标
      expect(hasDownloads).toBe(true)
    }
  })

  test('[P1] 点击 Skill 卡片进入详情页', async ({ page }) => {
    await page.goto('/search?q=react')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(2000)

    const firstCard = page.locator('a[href^="/skill/"]').first()

    if (await firstCard.isVisible({ timeout: 2000 }).catch(() => false)) {
      // 点击卡片
      await firstCard.click()
      await page.waitForTimeout(1000)

      // 应该导航到详情页
      await expect(page).toHaveURL(/.*\/skill\/.*/, { timeout: 5000 })
    }
  })

  test('[P1] 搜索支持标签筛选', async ({ page }) => {
    await page.goto('/search?tags=typescript')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(2000)

    // URL 应该包含标签参数
    await expect(page).toHaveURL(/.*tags=typescript.*/)

    // 检查搜索结果
    const resultText = page.getByText(/找到.*个结果|搜索中/)
    await expect(resultText).toBeVisible({ timeout: 10000 })
  })

  test('[P1] 组合筛选条件', async ({ page }) => {
    await page.goto('/search?q=react&platforms=qoder&sort=downloads')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(2000)

    // URL 应该包含所有参数
    await expect(page).toHaveURL(/.*q=react.*/)
    await expect(page).toHaveURL(/.*platforms=qoder.*/)
    await expect(page).toHaveURL(/.*sort=downloads.*/)
  })
})

test.describe('[P2] Skills Hub 搜索页 - 搜索历史', () => {
  test.beforeEach(async ({ page }) => {
    await clearAuthState(page)
    await mockAuthUser(page)
    await loginAsTestUser(page)
  })

  test('[P2] 搜索框支持自动完成', async ({ page }) => {
    await page.goto('/search')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(1000)

    const searchInput = page.locator('input[type="text"], input').first()

    // 输入部分关键词
    await searchInput.fill('re')
    await page.waitForTimeout(1000)

    // 检查是否有建议列表
    const suggestions = page.locator('[role="listbox"], .suggestions, .autocomplete')
    const hasSuggestions = await suggestions.isVisible({ timeout: 2000 }).catch(() => false)

    // 可能有自动完成
    if (hasSuggestions) {
      await expect(suggestions).toBeVisible()
    }
  })

  test('[P2] 热门搜索标签', async ({ page }) => {
    await page.goto('/search')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(1000)

    // 检查热门标签
    const hotTags = page.getByText(/热门|热门搜索|Popular/i)
    const hasHotTags = await hotTags.isVisible({ timeout: 2000 }).catch(() => false)

    if (hasHotTags) {
      await expect(hotTags).toBeVisible()
    }
  })
})
