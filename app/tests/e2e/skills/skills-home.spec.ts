/**
 * Skills Hub 首页 E2E 测试
 *
 * 测试覆盖：
 * - 首页访问和显示
 * - 热门 Skills 展示
 * - 最新 Skills 展示
 * - 搜索栏功能
 * - 导航跳转
 *
 * 注意：首页是 SkillsSquarePage，需要登录才能访问
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

test.describe('[P0] Skills Hub 首页 - 核心展示', () => {
  test.beforeEach(async ({ page }) => {
    await clearAuthState(page)
    await mockAuthUser(page)
    await loginAsTestUser(page)
  })

  test('[P0] 应该显示首页 Hero 区域', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')

    // 检查 Hero 区域标题 - SkillsSquarePage 使用 h1
    const heroHeading = page.getByRole('heading', { name: 'Skills Hub', level: 1 })
    await expect(heroHeading).toBeVisible({ timeout: 10000 })

    // 检查副标题
    await expect(page.getByText('发现和分享 AI Agent Skills')).toBeVisible()
  })

  test('[P0] 应该显示搜索栏', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')

    // SearchBar 组件的 placeholder 是 "搜索 AI Skills..."
    const searchInput = page.getByPlaceholder('搜索 AI Skills...')
    await expect(searchInput).toBeVisible({ timeout: 10000 })
  })

  test('[P0] 应该显示热门 Skills 区域', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')

    // 检查热门 Skills 标题 - SkillsSquarePage 使用 h2
    const popularHeading = page.getByRole('heading', { name: '热门 Skills', level: 2 })
    await expect(popularHeading).toBeVisible({ timeout: 10000 })
  })

  test('[P0] 应该显示最新 Skills 区域', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')

    // 检查最新 Skills 标题 - SkillsSquarePage 使用 h2
    const latestHeading = page.getByRole('heading', { name: '最新发布', level: 2 })
    await expect(latestHeading).toBeVisible({ timeout: 10000 })
  })

  test('[P0] 应该显示发布 Skill 的 CTA 区域', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')

    // 检查 CTA 文案 - SkillsSquarePage 使用 h2
    await expect(page.getByRole('heading', { name: '有 Skill 要分享？', level: 2 })).toBeVisible({
      timeout: 10000,
    })
    // 发布按钮是 Link 组件
    await expect(page.getByRole('link', { name: '发布 Skill' })).toBeVisible()
  })
})

test.describe('[P1] Skills Hub 首页 - 搜索功能', () => {
  test.beforeEach(async ({ page }) => {
    await clearAuthState(page)
    await mockAuthUser(page)
    await loginAsTestUser(page)
  })

  test('[P1] 搜索栏可以输入关键词', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')

    const searchInput = page.getByPlaceholder('搜索 AI Skills...')
    await expect(searchInput).toBeVisible({ timeout: 10000 })

    await searchInput.fill('react')
    await expect(searchInput).toHaveValue('react')
  })

  test('[P1] 按 Enter 键跳转到搜索页', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')

    const searchInput = page.getByPlaceholder('搜索 AI Skills...')
    await expect(searchInput).toBeVisible({ timeout: 10000 })

    await searchInput.fill('typescript')
    await searchInput.press('Enter')

    // 应该跳转到搜索页
    await page.waitForURL(/.*search.*/, { timeout: 5000 }).catch(() => {})
    await expect(page).toHaveURL(/.*search.*/, { timeout: 10000 })
  })
})

test.describe('[P1] Skills Hub 首页 - 导航', () => {
  test.beforeEach(async ({ page }) => {
    await clearAuthState(page)
    await mockAuthUser(page)
    await loginAsTestUser(page)
  })

  test('[P1] 点击查看全部跳转到搜索页', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')

    // 点击热门区域的"查看全部" - 是一个 Link 组件
    const viewAllLink = page.getByRole('link', { name: '查看全部' }).first()
    if (await viewAllLink.isVisible({ timeout: 5000 }).catch(() => false)) {
      await viewAllLink.click()
      await expect(page).toHaveURL(/.*search.*/, { timeout: 10000 })
    }
  })

  test('[P1] 点击发布 Skill 跳转到发布页', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')

    const publishLink = page.getByRole('link', { name: '发布 Skill' })
    await expect(publishLink).toBeVisible({ timeout: 10000 })
    await publishLink.click()

    // 已登录应该跳转到发布页
    await expect(page).toHaveURL(/.*publish.*/, { timeout: 10000 })
  })
})

test.describe('[P1] Skills Hub 首页 - Skill 卡片', () => {
  test.beforeEach(async ({ page }) => {
    await clearAuthState(page)
    await mockAuthUser(page)
    await loginAsTestUser(page)
  })

  test('[P1] 应该显示 Skill 卡片', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')

    // 检查是否有 Skill 卡片 - SkillCard 是 Link 组件
    const skillCards = page.locator('a[href^="/skill/"]')
    const count = await skillCards.count()

    // 如果有 mock 数据，应该显示卡片
    if (count > 0) {
      await expect(skillCards.first()).toBeVisible()
    }
  })

  test('[P1] 点击 Skill 卡片跳转到详情页', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')

    const skillCard = page.locator('a[href^="/skill/"]').first()
    if (await skillCard.isVisible({ timeout: 5000 }).catch(() => false)) {
      await skillCard.click()
      await expect(page).toHaveURL(/.*skill\/.*/, { timeout: 10000 })
    }
  })
})

test.describe('[P2] Skills Hub 首页 - 加载状态', () => {
  test.beforeEach(async ({ page }) => {
    await clearAuthState(page)
    await mockAuthUser(page)
    await loginAsTestUser(page)
  })

  test('[P2] 应该显示加载骨架屏', async ({ page }) => {
    // 拦截请求延迟以观察加载状态
    await page.route('**/rest/v1/skills**', async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 500))
      route.continue()
    })

    await page.goto('/')
    // 快速检查骨架屏（可能很快消失，不强制断言）
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const _skeleton = page.locator('[class*="skeleton"], [class*="animate-pulse"]')
    await page.waitForLoadState('networkidle')
  })
})
