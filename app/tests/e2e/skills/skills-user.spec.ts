/**
 * Skills Hub 用户中心 E2E 测试
 *
 * 测试覆盖：
 * - 我的 Skills 页面
 * - 我的收藏页面
 * - 用户公开主页
 * - 访问控制
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
// 测试套件 - 我的 Skills
// ============================================

test.describe('[P0] 我的 Skills 页面 - 访问控制', () => {
  test.beforeEach(async ({ page }) => {
    await clearAuthState(page)
  })

  test('[P0] 未登录访问我的 Skills 重定向到登录页', async ({ page }) => {
    await page.goto('/my-skills')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(1000)

    // 应该重定向到登录页
    await expect(page).toHaveURL(/.*login.*/, { timeout: 10000 })
  })

  test('[P0] 登录后可以访问我的 Skills', async ({ page }) => {
    await mockAuthUser(page)
    await loginAsTestUser(page)

    await page.goto('/my-skills')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(1000)

    // 检查页面标题
    const pageTitle = page.getByRole('heading', { name: /我的.*Skill|My.*Skill/i })
    await expect(pageTitle).toBeVisible({ timeout: 10000 })
  })
})

test.describe('[P1] 我的 Skills 页面 - 内容展示', () => {
  test.beforeEach(async ({ page }) => {
    await clearAuthState(page)
    await mockAuthUser(page)
    await loginAsTestUser(page)
  })

  test('[P1] 应该显示已发布的 Skills', async ({ page }) => {
    await page.goto('/my-skills')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(2000)

    // 检查是否有 Skills 或空状态
    const skillCards = page.locator('a[href^="/skill/"]')
    const emptyState = page.getByText('暂无').or(page.getByText('还没有'))

    // 要么显示 Skills，要么显示空状态
    const hasSkills = (await skillCards.count()) > 0
    const hasEmpty = await emptyState.isVisible({ timeout: 2000 }).catch(() => false)
    expect(hasSkills || hasEmpty).toBeTruthy()
  })

  test('[P1] 应该显示发布 Skill 按钮', async ({ page }) => {
    await page.goto('/my-skills')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(1000)

    const publishButton = page.getByRole('link', { name: /发布|Publish/i })
    await expect(publishButton).toBeVisible({ timeout: 10000 })
  })
})

// ============================================
// 测试套件 - 我的收藏
// ============================================

test.describe('[P0] 我的收藏页面 - 访问控制', () => {
  test.beforeEach(async ({ page }) => {
    await clearAuthState(page)
  })

  test('[P0] 未登录访问我的收藏重定向到登录页', async ({ page }) => {
    await page.goto('/favorites')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(1000)

    // 应该重定向到登录页
    await expect(page).toHaveURL(/.*login.*/, { timeout: 10000 })
  })

  test('[P0] 登录后可以访问我的收藏', async ({ page }) => {
    await mockAuthUser(page)
    await loginAsTestUser(page)

    await page.goto('/favorites')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(1000)

    // 检查页面标题
    const pageTitle = page.getByRole('heading', { name: /收藏|Favorite/i })
    await expect(pageTitle).toBeVisible({ timeout: 10000 })
  })
})

test.describe('[P1] 我的收藏页面 - 内容展示', () => {
  test.beforeEach(async ({ page }) => {
    await clearAuthState(page)
    await mockAuthUser(page)
    await loginAsTestUser(page)
  })

  test('[P1] 应该显示收藏的 Skills', async ({ page }) => {
    await page.goto('/favorites')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(2000)

    // 检查是否有 Skills 或空状态
    const skillCards = page.locator('a[href^="/skill/"]')
    const emptyState = page.getByText('暂无').or(page.getByText('还没有'))

    const hasSkills = (await skillCards.count()) > 0
    const hasEmpty = await emptyState.isVisible({ timeout: 2000 }).catch(() => false)
    expect(hasSkills || hasEmpty).toBeTruthy()
  })
})

// ============================================
// 测试套件 - 用户公开主页
// ============================================

test.describe('[P1] 用户公开主页', () => {
  test.beforeEach(async ({ page }) => {
    await clearAuthState(page)
  })

  test('[P1] 可以访问用户公开主页', async ({ page }) => {
    await page.goto(`/user/${TEST_USER.id}`)
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(2000)

    // 检查用户信息区域
    const userInfo = page.getByRole('heading').or(page.locator('[class*="avatar"]'))
    await expect(userInfo.first()).toBeVisible({ timeout: 10000 })
  })

  test('[P1] 应该显示用户的 Skills', async ({ page }) => {
    await page.goto(`/user/${TEST_USER.id}`)
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(2000)

    // 检查 Skills 列表或空状态
    const skillCards = page.locator('a[href^="/skill/"]')
    const emptyState = page.getByText('暂无').or(page.getByText('还没有'))

    const hasSkills = (await skillCards.count()) > 0
    const hasEmpty = await emptyState.isVisible({ timeout: 2000 }).catch(() => false)
    expect(hasSkills || hasEmpty).toBeTruthy()
  })

  test('[P1] 不存在的用户显示 404', async ({ page }) => {
    await page.goto('/user/nonexistent-user-xyz-12345')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(2000)

    // 检查 404 提示
    const notFound = page.getByText('未找到').or(page.getByText('不存在'))
    await expect(notFound).toBeVisible({ timeout: 10000 })
  })
})

// ============================================
// 测试套件 - 导航
// ============================================

test.describe('[P2] 用户中心导航', () => {
  test.beforeEach(async ({ page }) => {
    await clearAuthState(page)
    await mockAuthUser(page)
    await loginAsTestUser(page)
  })

  test('[P2] 从我的 Skills 跳转到详情页', async ({ page }) => {
    await page.goto('/my-skills')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(2000)

    const skillCard = page.locator('a[href^="/skill/"]').first()
    if (await skillCard.isVisible({ timeout: 3000 }).catch(() => false)) {
      await skillCard.click()
      await expect(page).toHaveURL(/.*skill\/.*/, { timeout: 10000 })
    }
  })

  test('[P2] 从我的收藏跳转到详情页', async ({ page }) => {
    await page.goto('/favorites')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(2000)

    const skillCard = page.locator('a[href^="/skill/"]').first()
    if (await skillCard.isVisible({ timeout: 3000 }).catch(() => false)) {
      await skillCard.click()
      await expect(page).toHaveURL(/.*skill\/.*/, { timeout: 10000 })
    }
  })
})
