/**
 * 登录功能 E2E 测试
 *
 * 测试覆盖：
 * - 登录页面访问和显示
 * - 表单验证（空值、格式）
 * - 登录成功/失败场景
 * - 登录状态保持
 * - 导航跳转
 */

import { test, expect, Page } from '@playwright/test'

// ============================================
// 测试数据
// ============================================

const TEST_USER = {
  email: 'test@example.com',
  password: '888888',
  displayName: '测试用户',
}

const INVALID_USER = {
  email: 'nonexistent@example.com',
  password: 'wrongpassword',
}

const MOCK_USER = {
  id: 'test-user-id-12345',
  email: TEST_USER.email,
  aud: 'authenticated',
  role: 'authenticated',
  created_at: '2024-01-01T00:00:00.000Z',
  updated_at: '2024-01-01T00:00:00.000Z',
  user_metadata: { display_name: TEST_USER.displayName },
  app_metadata: {},
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

async function fillLoginForm(page: Page, email: string, password: string) {
  await page.fill('#email', email)
  await page.fill('#password', password)
}

async function submitLoginForm(page: Page) {
  await page.click('button[type="submit"]')
}

async function waitForLoginSuccess(page: Page) {
  await expect(page).toHaveURL('http://localhost:5173/', { timeout: 15000 })
}

/**
 * mock auth/v1/user 和 token，让 ProtectedRoute 在登录后验证通过
 */
async function mockAuthUser(page: Page) {
  await page.route('**/auth/v1/user', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(MOCK_USER),
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
        user: MOCK_USER,
      }),
    })
  })
}

// ============================================
// 测试套件
// ============================================

test.describe('[P0] 登录功能 - 核心流程', () => {
  test.beforeEach(async ({ page }) => {
    await clearAuthState(page)
    await page.goto('/login')
  })

  test('[P0] 应该显示登录页面', async ({ page }) => {
    await expect(page.locator('h1')).toContainText('OPC-Starter')
    await expect(page.locator('text=登录到你的账户')).toBeVisible()
    await expect(page.locator('#email')).toBeVisible()
    await expect(page.locator('#password')).toBeVisible()
    await expect(page.locator('button[type="submit"]')).toBeVisible()
    await expect(page.locator('button[type="submit"]')).toContainText('登录')
  })

  test('[P0] 使用正确凭证登录成功', async ({ page }) => {
    await mockAuthUser(page)
    await expect(page.locator('text=登录到你的账户')).toBeVisible()
    await fillLoginForm(page, TEST_USER.email, TEST_USER.password)
    await submitLoginForm(page)
    // 登录成功后跳转到首页（MSW 响应较快，loading 状态可能很短暂，直接验证最终跳转）
    await waitForLoginSuccess(page)
    await expect(page).toHaveURL('http://localhost:5173/')
  })

  test('[P1] 使用错误密码显示错误提示', async ({ page }) => {
    await fillLoginForm(page, TEST_USER.email, INVALID_USER.password)
    await submitLoginForm(page)
    await expect(page.locator('text=Invalid login credentials')).toBeVisible({ timeout: 10000 })
    await expect(page).toHaveURL(/.*login.*/)
  })

  test('[P1] 使用不存在的邮箱显示错误提示', async ({ page }) => {
    await fillLoginForm(page, INVALID_USER.email, INVALID_USER.password)
    await submitLoginForm(page)
    await expect(page.locator('text=Invalid login credentials')).toBeVisible({ timeout: 10000 })
    await expect(page).toHaveURL(/.*login.*/)
  })
})

test.describe('[P1] 登录功能 - 表单验证', () => {
  test.beforeEach(async ({ page }) => {
    await clearAuthState(page)
    await page.goto('/login')
  })

  test('[P1] 空邮箱提交被阻止', async ({ page }) => {
    await page.fill('#password', 'anypassword')
    await submitLoginForm(page)
    const isValid = await page
      .locator('#email')
      .evaluate((el: HTMLInputElement) => el.checkValidity())
    expect(isValid).toBe(false)
    await expect(page).toHaveURL(/.*login.*/)
  })

  test('[P1] 空密码提交被阻止', async ({ page }) => {
    await page.fill('#email', 'test@example.com')
    await submitLoginForm(page)
    const isValid = await page
      .locator('#password')
      .evaluate((el: HTMLInputElement) => el.checkValidity())
    expect(isValid).toBe(false)
    await expect(page).toHaveURL(/.*login.*/)
  })

  test('[P1] 无效邮箱格式被阻止', async ({ page }) => {
    await fillLoginForm(page, 'invalid-email', 'password123')
    await submitLoginForm(page)
    const isValid = await page
      .locator('#email')
      .evaluate((el: HTMLInputElement) => el.checkValidity())
    expect(isValid).toBe(false)
    await expect(page).toHaveURL(/.*login.*/)
  })

  test('[P2] 表单字段有正确的 placeholder', async ({ page }) => {
    await expect(page.locator('#email')).toHaveAttribute('placeholder', 'your@email.com')
    await expect(page.locator('#password')).toHaveAttribute('placeholder', '••••••••')
  })
})

test.describe('[P1] 登录功能 - 导航', () => {
  test.beforeEach(async ({ page }) => {
    await clearAuthState(page)
  })

  test('[P1] 未登录访问首页重定向到登录页', async ({ page }) => {
    await page.goto('/')
    await expect(page).toHaveURL(/.*login.*/)
  })

  test('[P1] 点击注册链接跳转到注册页', async ({ page }) => {
    await page.goto('/login')
    await page.click('text=注册')
    await expect(page).toHaveURL(/.*register.*/)
    await expect(page.locator('text=创建你的账户')).toBeVisible()
  })

  test('[P2] 登录后刷新页面保持登录状态', async ({ page }) => {
    // mock getUser，保证 ProtectedRoute 在刷新后也能验证通过
    await mockAuthUser(page)

    await page.goto('/login')
    await fillLoginForm(page, TEST_USER.email, TEST_USER.password)
    await submitLoginForm(page)
    await waitForLoginSuccess(page)

    await page.reload()

    await expect(page).not.toHaveURL(/.*login.*/)
  })
})

test.describe('[P2] 登录功能 - 用户体验', () => {
  test.beforeEach(async ({ page }) => {
    await clearAuthState(page)
    await page.goto('/login')
  })

  test('[P2] 登录按钮在提交时禁用', async ({ page }) => {
    await fillLoginForm(page, TEST_USER.email, TEST_USER.password)
    await submitLoginForm(page)
    await expect(page.locator('button[type="submit"]')).toContainText('登录中...')
  })

  test('[P2] 输入框可以正常输入', async ({ page }) => {
    await page.fill('#email', 'test@example.com')
    await page.fill('#password', 'testpassword123')
    await expect(page.locator('#email')).toHaveValue('test@example.com')
    await expect(page.locator('#password')).toHaveValue('testpassword123')
  })

  test('[P2] 密码字段是密码类型', async ({ page }) => {
    await expect(page.locator('#password')).toHaveAttribute('type', 'password')
  })
})
