/**
 * 登录功能 E2E 测试
 *
 * 测试覆盖：
 * - 登录页面访问和显示
 * - 表单验证（空值、格式）
 * - 登录成功/失败场景
 * - 登录状态保持
 * - 导航跳转
 *
 * 可视化验证：
 * - 运行 UI 模式: npm run test:e2e:ui
 * - 运行 Headed 模式: npx playwright test --headed --grep "登录"
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

// ============================================
// 辅助函数
// ============================================

/**
 * 清除认证状态
 */
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

/**
 * 填写登录表单
 */
async function fillLoginForm(page: Page, email: string, password: string) {
  await page.fill('#email', email)
  await page.fill('#password', password)
}

/**
 * 提交登录表单
 */
async function submitLoginForm(page: Page) {
  await page.click('button[type="submit"]')
}

/**
 * 等待登录完成
 */
async function waitForLoginSuccess(page: Page) {
  await expect(page).toHaveURL('http://localhost:5173/', { timeout: 15000 })
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
    // 验证页面标题
    await expect(page.locator('h1')).toContainText('照片时光机')
    await expect(page.locator('text=登录到你的账户')).toBeVisible()

    // 验证表单元素存在
    await expect(page.locator('#email')).toBeVisible()
    await expect(page.locator('#password')).toBeVisible()
    await expect(page.locator('button[type="submit"]')).toBeVisible()

    // 验证按钮文本
    await expect(page.locator('button[type="submit"]')).toContainText('登录')
  })

  test('[P0] 使用正确凭证登录成功', async ({ page }) => {
    // GIVEN: 用户在登录页面
    await expect(page.locator('text=登录到你的账户')).toBeVisible()

    // WHEN: 填写正确的凭证并提交
    await fillLoginForm(page, TEST_USER.email, TEST_USER.password)
    await submitLoginForm(page)

    // THEN: 按钮显示加载状态
    await expect(page.locator('button[type="submit"]')).toContainText('登录中...', {
      timeout: 3000,
    })

    // AND: 跳转到首页
    await waitForLoginSuccess(page)

    // AND: URL 为首页
    await expect(page).toHaveURL('http://localhost:5173/')
  })

  test('[P1] 使用错误密码显示错误提示', async ({ page }) => {
    // WHEN: 填写错误的密码
    await fillLoginForm(page, TEST_USER.email, INVALID_USER.password)
    await submitLoginForm(page)

    // THEN: 显示错误消息
    await expect(page.locator('text=Invalid login credentials')).toBeVisible({ timeout: 10000 })

    // AND: 仍在登录页
    await expect(page).toHaveURL(/.*login.*/)
  })

  test('[P1] 使用不存在的邮箱显示错误提示', async ({ page }) => {
    // WHEN: 填写不存在的用户
    await fillLoginForm(page, INVALID_USER.email, INVALID_USER.password)
    await submitLoginForm(page)

    // THEN: 显示错误消息
    await expect(page.locator('text=Invalid login credentials')).toBeVisible({ timeout: 10000 })

    // AND: 仍在登录页
    await expect(page).toHaveURL(/.*login.*/)
  })
})

test.describe('[P1] 登录功能 - 表单验证', () => {
  test.beforeEach(async ({ page }) => {
    await clearAuthState(page)
    await page.goto('/login')
  })

  test('[P1] 空邮箱提交被阻止', async ({ page }) => {
    // WHEN: 只填写密码
    await page.fill('#password', 'anypassword')
    await submitLoginForm(page)

    // THEN: 浏览器显示验证错误
    const emailInput = page.locator('#email')
    const isValid = await emailInput.evaluate((el: HTMLInputElement) => el.checkValidity())
    expect(isValid).toBe(false)

    // AND: 仍在登录页
    await expect(page).toHaveURL(/.*login.*/)
  })

  test('[P1] 空密码提交被阻止', async ({ page }) => {
    // WHEN: 只填写邮箱
    await page.fill('#email', 'test@example.com')
    await submitLoginForm(page)

    // THEN: 浏览器显示验证错误
    const passwordInput = page.locator('#password')
    const isValid = await passwordInput.evaluate((el: HTMLInputElement) => el.checkValidity())
    expect(isValid).toBe(false)

    // AND: 仍在登录页
    await expect(page).toHaveURL(/.*login.*/)
  })

  test('[P1] 无效邮箱格式被阻止', async ({ page }) => {
    // WHEN: 填写无效邮箱
    await fillLoginForm(page, 'invalid-email', 'password123')
    await submitLoginForm(page)

    // THEN: 浏览器显示验证错误
    const emailInput = page.locator('#email')
    const isValid = await emailInput.evaluate((el: HTMLInputElement) => el.checkValidity())
    expect(isValid).toBe(false)

    // AND: 仍在登录页
    await expect(page).toHaveURL(/.*login.*/)
  })

  test('[P2] 表单字段有正确的 placeholder', async ({ page }) => {
    // THEN: 验证 placeholder 文本
    await expect(page.locator('#email')).toHaveAttribute('placeholder', 'your@email.com')
    await expect(page.locator('#password')).toHaveAttribute('placeholder', '••••••••')
  })
})

test.describe('[P1] 登录功能 - 导航', () => {
  test.beforeEach(async ({ page }) => {
    await clearAuthState(page)
  })

  test('[P1] 未登录访问首页重定向到登录页', async ({ page }) => {
    // WHEN: 未登录访问首页
    await page.goto('/')

    // THEN: 重定向到登录页
    await expect(page).toHaveURL(/.*login.*/)
  })

  test('[P1] 点击注册链接跳转到注册页', async ({ page }) => {
    // GIVEN: 在登录页面
    await page.goto('/login')

    // WHEN: 点击注册链接
    await page.click('text=注册')

    // THEN: 跳转到注册页
    await expect(page).toHaveURL(/.*register.*/)
    await expect(page.locator('text=创建你的账户')).toBeVisible()
  })

  test('[P2] 登录后刷新页面保持登录状态', async ({ page }) => {
    // GIVEN: 用户已登录
    await page.goto('/login')
    await fillLoginForm(page, TEST_USER.email, TEST_USER.password)
    await submitLoginForm(page)
    await waitForLoginSuccess(page)

    // WHEN: 刷新页面
    await page.reload()

    // THEN: 仍在首页，未重定向到登录页
    await expect(page).not.toHaveURL(/.*login.*/)
  })
})

test.describe('[P2] 登录功能 - 用户体验', () => {
  test.beforeEach(async ({ page }) => {
    await clearAuthState(page)
    await page.goto('/login')
  })

  test('[P2] 登录按钮在提交时禁用', async ({ page }) => {
    // WHEN: 填写表单并提交
    await fillLoginForm(page, TEST_USER.email, TEST_USER.password)
    await submitLoginForm(page)

    // THEN: 按钮显示加载状态
    await expect(page.locator('button[type="submit"]')).toContainText('登录中...')
  })

  test('[P2] 输入框可以正常输入', async ({ page }) => {
    // WHEN: 输入邮箱和密码
    await page.fill('#email', 'test@example.com')
    await page.fill('#password', 'testpassword123')

    // THEN: 输入值正确
    await expect(page.locator('#email')).toHaveValue('test@example.com')
    await expect(page.locator('#password')).toHaveValue('testpassword123')
  })

  test('[P2] 密码字段是密码类型', async ({ page }) => {
    // THEN: 密码字段隐藏输入
    const passwordInput = page.locator('#password')
    await expect(passwordInput).toHaveAttribute('type', 'password')
  })
})
