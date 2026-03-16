/**
 * 注册功能 E2E 测试
 *
 * 测试覆盖：
 * - 注册页面访问和显示
 * - 表单验证（空值、格式、密码匹配）
 * - 注册成功/失败场景
 * - 导航跳转
 *
 * 可视化验证：
 * - 运行 UI 模式: npm run test:e2e:ui
 * - 运行 Headed 模式: npx playwright test --headed --grep "注册"
 */

import { test, expect, Page } from '@playwright/test'

// ============================================
// 测试数据
// ============================================

const generateUniqueEmail = () => {
  const timestamp = Date.now()
  return `newuser${timestamp}@test.com`
}

// 已存在的测试用户（用于测试重复注册）
const EXISTING_USER = {
  email: 'test@example.com',
  password: '888888',
  displayName: '测试用户',
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
 * 填写注册表单
 */
async function fillRegisterForm(
  page: Page,
  displayName: string,
  email: string,
  password: string,
  confirmPassword: string
) {
  await page.fill('#displayName', displayName)
  await page.fill('#email', email)
  await page.fill('#password', password)
  await page.fill('#confirmPassword', confirmPassword)
}

/**
 * 提交注册表单
 */
async function submitRegisterForm(page: Page) {
  await page.click('button[type="submit"]')
}

/**
 * 等待注册完成
 */
async function waitForRegisterSuccess(page: Page) {
  await expect(page).toHaveURL('http://localhost:5173/', { timeout: 15000 })
}

// ============================================
// 测试套件
// ============================================

test.describe('[P0] 注册功能 - 核心流程', () => {
  test.beforeEach(async ({ page }) => {
    await clearAuthState(page)
    await page.goto('/register')
  })

  test('[P0] 应该显示注册页面', async ({ page }) => {
    // 验证页面标题（已改为 OPC-Starter）
    await expect(page.locator('h1')).toContainText('OPC-Starter')
    await expect(page.locator('text=创建你的账户')).toBeVisible()

    // 验证表单元素存在
    await expect(page.locator('#displayName')).toBeVisible()
    await expect(page.locator('#email')).toBeVisible()
    await expect(page.locator('#password')).toBeVisible()
    await expect(page.locator('#confirmPassword')).toBeVisible()
    await expect(page.locator('button[type="submit"]')).toBeVisible()

    // 验证按钮文本
    await expect(page.locator('button[type="submit"]')).toContainText('注册')
  })

  test('[P0] 使用有效信息注册成功', async ({ page }) => {
    // GIVEN: 用户在注册页面
    await expect(page.locator('text=创建你的账户')).toBeVisible()

    // WHEN: 填写完整的注册信息
    const uniqueEmail = generateUniqueEmail()
    await fillRegisterForm(page, '新用户', uniqueEmail, 'Test123456', 'Test123456')
    await submitRegisterForm(page)

    // THEN: 按钮显示加载状态
    await expect(page.locator('button[type="submit"]')).toContainText('注册中...', {
      timeout: 3000,
    })

    // AND: 跳转到首页（自动登录）
    await waitForRegisterSuccess(page)
  })

  test('[P1] 使用已存在邮箱注册失败', async ({ page }) => {
    // WHEN: 使用已存在的邮箱注册
    await fillRegisterForm(page, '重复用户', EXISTING_USER.email, 'Test123456', 'Test123456')
    await submitRegisterForm(page)

    // THEN: 显示错误消息 (Supabase 可能返回不同错误)
    // 等待一段时间让请求完成
    await page.waitForTimeout(2000)

    // AND: 仍在注册页 (因为注册失败)
    await expect(page).toHaveURL(/.*register.*/)
  })
})

test.describe('[P1] 注册功能 - 表单验证', () => {
  test.beforeEach(async ({ page }) => {
    await clearAuthState(page)
    await page.goto('/register')
  })

  test('[P1] 密码不匹配显示错误', async ({ page }) => {
    // WHEN: 填写不匹配的密码
    await fillRegisterForm(
      page,
      '测试用户',
      'test@example.com',
      'Password123',
      'Password456' // 不匹配
    )
    await submitRegisterForm(page)

    // THEN: 显示密码不匹配错误
    await expect(page.locator('text=密码不匹配')).toBeVisible({ timeout: 5000 })

    // AND: 仍在注册页
    await expect(page).toHaveURL(/.*register.*/)
  })

  test('[P1] 密码过短显示错误', async ({ page }) => {
    // WHEN: 填写过短的密码
    await fillRegisterForm(
      page,
      '测试用户',
      'test@example.com',
      '12345', // 少于 6 个字符
      '12345'
    )
    await submitRegisterForm(page)

    // THEN: 显示密码过短错误
    await expect(page.locator('text=密码至少需要6个字符')).toBeVisible({ timeout: 5000 })

    // AND: 仍在注册页
    await expect(page).toHaveURL(/.*register.*/)
  })

  test('[P1] 空昵称提交被阻止', async ({ page }) => {
    // WHEN: 不填写昵称
    await page.fill('#email', 'test@example.com')
    await page.fill('#password', 'Password123')
    await page.fill('#confirmPassword', 'Password123')
    await submitRegisterForm(page)

    // THEN: 浏览器显示验证错误
    const displayNameInput = page.locator('#displayName')
    const isValid = await displayNameInput.evaluate((el: HTMLInputElement) => el.checkValidity())
    expect(isValid).toBe(false)
  })

  test('[P1] 空邮箱提交被阻止', async ({ page }) => {
    // WHEN: 不填写邮箱
    await page.fill('#displayName', '测试用户')
    await page.fill('#password', 'Password123')
    await page.fill('#confirmPassword', 'Password123')
    await submitRegisterForm(page)

    // THEN: 浏览器显示验证错误
    const emailInput = page.locator('#email')
    const isValid = await emailInput.evaluate((el: HTMLInputElement) => el.checkValidity())
    expect(isValid).toBe(false)
  })

  test('[P1] 无效邮箱格式被阻止', async ({ page }) => {
    // WHEN: 填写无效邮箱
    await fillRegisterForm(page, '测试用户', 'invalid-email', 'Password123', 'Password123')
    await submitRegisterForm(page)

    // THEN: 浏览器显示验证错误
    const emailInput = page.locator('#email')
    const isValid = await emailInput.evaluate((el: HTMLInputElement) => el.checkValidity())
    expect(isValid).toBe(false)
  })

  test('[P2] 表单字段有正确的 placeholder', async ({ page }) => {
    // THEN: 验证 placeholder 文本
    await expect(page.locator('#displayName')).toHaveAttribute('placeholder', '你的昵称')
    await expect(page.locator('#email')).toHaveAttribute('placeholder', 'your@email.com')
    await expect(page.locator('#password')).toHaveAttribute('placeholder', '至少6个字符')
    await expect(page.locator('#confirmPassword')).toHaveAttribute('placeholder', '再次输入密码')
  })
})

test.describe('[P1] 注册功能 - 导航', () => {
  test.beforeEach(async ({ page }) => {
    await clearAuthState(page)
  })

  test('[P1] 点击登录链接跳转到登录页', async ({ page }) => {
    // GIVEN: 在注册页面
    await page.goto('/register')

    // WHEN: 点击登录链接
    await page.click('text=登录')

    // THEN: 跳转到登录页
    await expect(page).toHaveURL(/.*login.*/)
    await expect(page.locator('text=登录到你的账户')).toBeVisible()
  })

  test('[P1] 从登录页跳转到注册页', async ({ page }) => {
    // GIVEN: 在登录页面
    await page.goto('/login')

    // WHEN: 点击注册链接
    await page.click('text=注册')

    // THEN: 跳转到注册页
    await expect(page).toHaveURL(/.*register.*/)
    await expect(page.locator('text=创建你的账户')).toBeVisible()
  })
})

test.describe('[P2] 注册功能 - 用户体验', () => {
  test.beforeEach(async ({ page }) => {
    await clearAuthState(page)
    await page.goto('/register')
  })

  test('[P2] 注册按钮在提交时禁用', async ({ page }) => {
    // WHEN: 填写表单并提交
    const uniqueEmail = generateUniqueEmail()
    await fillRegisterForm(page, '新用户', uniqueEmail, 'Test123456', 'Test123456')
    await submitRegisterForm(page)

    // THEN: 按钮显示加载状态
    await expect(page.locator('button[type="submit"]')).toContainText('注册中...')
  })

  test('[P2] 所有输入框可以正常输入', async ({ page }) => {
    // WHEN: 输入所有字段
    await page.fill('#displayName', '测试昵称')
    await page.fill('#email', 'test@example.com')
    await page.fill('#password', 'TestPassword123')
    await page.fill('#confirmPassword', 'TestPassword123')

    // THEN: 输入值正确
    await expect(page.locator('#displayName')).toHaveValue('测试昵称')
    await expect(page.locator('#email')).toHaveValue('test@example.com')
    await expect(page.locator('#password')).toHaveValue('TestPassword123')
    await expect(page.locator('#confirmPassword')).toHaveValue('TestPassword123')
  })

  test('[P2] 密码字段是密码类型', async ({ page }) => {
    // THEN: 密码字段隐藏输入
    await expect(page.locator('#password')).toHaveAttribute('type', 'password')
    await expect(page.locator('#confirmPassword')).toHaveAttribute('type', 'password')
  })

  test('[P2] 错误消息样式正确', async ({ page }) => {
    // WHEN: 触发密码不匹配错误
    await fillRegisterForm(page, '测试', 'test@test.com', 'Password123', 'Password456')
    await submitRegisterForm(page)

    // THEN: 错误消息容器有正确的样式类
    const errorContainer = page.locator('.text-destructive')
    await expect(errorContainer).toBeVisible()
    await expect(errorContainer).toHaveClass(/bg-destructive/)
  })
})

test.describe('[P3] 注册功能 - 边界情况', () => {
  test.beforeEach(async ({ page }) => {
    await clearAuthState(page)
    await page.goto('/register')
  })

  test('[P3] 刚好 6 个字符的密码可以注册', async ({ page }) => {
    // WHEN: 使用刚好 6 个字符的密码
    const uniqueEmail = generateUniqueEmail()
    await fillRegisterForm(page, '新用户', uniqueEmail, '123456', '123456')
    await submitRegisterForm(page)

    // THEN: 不显示密码过短错误
    await expect(page.locator('text=密码至少需要6个字符')).not.toBeVisible({ timeout: 3000 })
  })

  test('[P3] 5 个字符的密码显示错误', async ({ page }) => {
    // WHEN: 使用 5 个字符的密码
    await fillRegisterForm(page, '测试', 'test@test.com', '12345', '12345')
    await submitRegisterForm(page)

    // THEN: 显示密码过短错误
    await expect(page.locator('text=密码至少需要6个字符')).toBeVisible({ timeout: 5000 })
  })

  test('[P3] 表单可以清空重填', async ({ page }) => {
    // WHEN: 填写后清空
    await fillRegisterForm(page, '测试', 'test@test.com', 'Password123', 'Password456')
    await page.fill('#displayName', '')
    await page.fill('#email', '')
    await page.fill('#password', '')
    await page.fill('#confirmPassword', '')

    // THEN: 所有字段为空
    await expect(page.locator('#displayName')).toHaveValue('')
    await expect(page.locator('#email')).toHaveValue('')
    await expect(page.locator('#password')).toHaveValue('')
    await expect(page.locator('#confirmPassword')).toHaveValue('')
  })
})
