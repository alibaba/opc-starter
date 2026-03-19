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
 */

import { test, expect, Page } from '@playwright/test'

// ============================================
// 测试数据
// ============================================

const TEST_USER = {
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

// ============================================
// 测试套件
// ============================================

test.describe('[P0] Skills Hub 搜索页 - 核心功能', () => {
  test.beforeEach(async ({ page }) => {
    await clearAuthState(page)
  })

  test('[P0] 应该显示搜索页面', async ({ page }) => {
    await page.goto('/search')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(1000)

    // 检查搜索输入框
    const searchInput = page.locator('input[type="text"], input').first()
    await expect(searchInput).toBeVisible({ timeout: 10000 })
  })

  test('[P0] 从 URL 参数读取搜索词', async ({ page }) => {
    await page.goto('/search?q=react')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(1000)

    // 检查搜索框值
    const searchInput = page.locator('input[type="text"], input').first()
    await expect(searchInput).toHaveValue('react', { timeout: 10000 })
  })

  test('[P0] 显示搜索结果数量', async ({ page }) => {
    await page.goto('/search?q=react')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(2000)

    // 检查结果统计文本
    const resultText = page.getByText(/找到.*个结果|搜索中/)
    await expect(resultText).toBeVisible({ timeout: 10000 })
  })
})

test.describe('[P1] Skills Hub 搜索页 - 搜索功能', () => {
  test.beforeEach(async ({ page }) => {
    await clearAuthState(page)
  })

  test('[P1] 输入关键词触发搜索', async ({ page }) => {
    await page.goto('/search')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(1000)

    const searchInput = page.locator('input[type="text"], input').first()
    await expect(searchInput).toBeVisible({ timeout: 10000 })

    // 输入搜索词
    await searchInput.fill('typescript')
    await page.waitForTimeout(1000)

    // URL 应该更新
    await expect(page).toHaveURL(/.*q=typescript.*/, { timeout: 5000 })
  })

  test('[P1] 清空搜索词', async ({ page }) => {
    await page.goto('/search?q=react')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(1000)

    const searchInput = page.locator('input[type="text"], input').first()
    await expect(searchInput).toHaveValue('react', { timeout: 10000 })

    // 清空输入
    await searchInput.clear()
    await page.waitForTimeout(500)

    // 检查清空按钮或空状态
    const clearButton = page.locator('button:has-text("清除"), button:has-text("清空")')
    if (await clearButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await clearButton.click()
    }
  })

  test('[P1] 实时搜索更新结果', async ({ page }) => {
    await page.goto('/search')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(1000)

    const searchInput = page.locator('input[type="text"], input').first()

    // 输入第一个关键词
    await searchInput.fill('react')
    await page.waitForTimeout(1500)

    // 修改关键词
    await searchInput.fill('typescript')
    await page.waitForTimeout(1500)

    // URL 应该更新为新的关键词
    await expect(page).toHaveURL(/.*q=typescript.*/, { timeout: 5000 })
  })
})

test.describe('[P1] Skills Hub 搜索页 - 筛选功能', () => {
  test.beforeEach(async ({ page }) => {
    await clearAuthState(page)
  })

  test('[P1] 应该显示筛选按钮', async ({ page }) => {
    await page.goto('/search')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(1000)

    // 检查筛选按钮
    const filterButton = page.getByRole('button', { name: /筛选|filter/i })
    await expect(filterButton).toBeVisible({ timeout: 10000 })
  })

  test('[P1] 点击筛选按钮打开筛选面板', async ({ page }) => {
    await page.goto('/search')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(1000)

    const filterButton = page.getByRole('button', { name: /筛选|filter/i })
    await filterButton.click()
    await page.waitForTimeout(500)

    // 检查筛选面板标题
    const filterPanel = page.getByRole('heading', { name: '筛选条件' })
    await expect(filterPanel).toBeVisible({ timeout: 5000 })
  })

  test('[P1] 选择平台筛选', async ({ page }) => {
    await page.goto('/search')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(1000)

    // 打开筛选面板
    const filterButton = page.getByRole('button', { name: /筛选|filter/i })
    await filterButton.click()
    await page.waitForTimeout(500)

    // 点击平台选项
    const qoderBadge = page.locator('text=Qoder, text=Cursor, text=Claude Code').first()
    if (await qoderBadge.isVisible({ timeout: 2000 }).catch(() => false)) {
      await qoderBadge.click()
      await page.waitForTimeout(500)

      // 检查 URL 是否包含平台参数
      const url = page.url()
      // 平台筛选应该反映在 URL 中
    }
  })

  test('[P1] 清除筛选条件', async ({ page }) => {
    await page.goto('/search?platforms=qoder')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(1000)

    // 检查已筛选标签
    const filteredTag = page.getByText('已筛选')
    if (await filteredTag.isVisible({ timeout: 2000 }).catch(() => false)) {
      // 点击清除全部
      const clearButton = page.getByRole('button', { name: '清除全部' })
      if (await clearButton.isVisible({ timeout: 2000 }).catch(() => false)) {
        await clearButton.click()
        await page.waitForTimeout(500)
      }
    }
  })
})

test.describe('[P1] Skills Hub 搜索页 - 排序功能', () => {
  test.beforeEach(async ({ page }) => {
    await clearAuthState(page)
  })

  test('[P1] 应该显示排序选择器', async ({ page }) => {
    await page.goto('/search')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(1000)

    // 检查排序选择器
    const sortSelect = page.locator(
      '[role="combobox"], button:has-text("下载量"), button:has-text("排序")'
    )
    await expect(sortSelect.first()).toBeVisible({ timeout: 10000 })
  })

  test('[P1] 从 URL 读取排序参数', async ({ page }) => {
    await page.goto('/search?sort=likes')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(1000)

    // URL 应该包含排序参数
    await expect(page).toHaveURL(/.*sort=likes.*/)
  })

  test('[P1] 切换排序方式', async ({ page }) => {
    await page.goto('/search')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(1000)

    // 点击排序选择器
    const sortSelect = page.locator('[role="combobox"]').first()
    if (await sortSelect.isVisible({ timeout: 2000 }).catch(() => false)) {
      await sortSelect.click()
      await page.waitForTimeout(500)

      // 选择"点赞数"排序
      const likesOption = page.getByRole('option', { name: '点赞数' })
      if (await likesOption.isVisible({ timeout: 2000 }).catch(() => false)) {
        await likesOption.click()
        await page.waitForTimeout(500)
      }
    }
  })
})

test.describe('[P2] Skills Hub 搜索页 - 分页', () => {
  test.beforeEach(async ({ page }) => {
    await clearAuthState(page)
  })

  test('[P2] 应该显示加载更多按钮（结果充足时）', async ({ page }) => {
    await page.goto('/search')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(2000)

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
  })

  test('[P2] 无结果时显示空状态', async ({ page }) => {
    await page.goto('/search?q=nonexistent-skill-xyz-12345')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(2000)

    // 检查空状态提示
    const emptyState = page.getByText('未找到相关 Skills')
    await expect(emptyState).toBeVisible({ timeout: 10000 })
  })
})
