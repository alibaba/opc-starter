/**
 * 演示模式测试 - 登录和注册流程
 *
 * 这个测试文件专门用于演示，带有打字机效果和元素高亮
 * 所有测试都可重复执行
 *
 * 运行方式：
 * npm run test:e2e:demo
 *
 * 或手动运行：
 * npx playwright test tests/e2e/demo/demo-auth.spec.ts --headed --workers=1
 */

import { test, expect } from '@playwright/test'
import {
  typeWithEffect,
  clickWithEffect,
  highlightElement,
  fillFormWithEffect,
} from '../../support/helpers/demo-helpers'

// ============================================
// 测试配置
// ============================================

test.use({
  launchOptions: {
    slowMo: 50, // 全局慢速模式（减半）
  },
  viewport: { width: 1280, height: 720 },
  video: 'on', // 录制视频
})

// ============================================
// 测试数据
// ============================================

// 生成唯一邮箱（确保可重复执行）
const generateUniqueEmail = () => `demo${Date.now()}@test.com`

const TEST_USER = {
  email: 'test@example.com',
  password: '888888',
}

// ============================================
// 辅助函数
// ============================================

/**
 * 清除所有认证状态
 */
async function clearAllAuthState(page: import('@playwright/test').Page) {
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
 * 等待页面稳定
 */
async function waitForPageStable(page: import('@playwright/test').Page) {
  await page.waitForLoadState('networkidle')
  await page.waitForTimeout(300)
}

// ============================================
// 演示测试
// ============================================

test.describe('🎬 演示模式 - 认证流程', () => {
  test.beforeEach(async ({ page }) => {
    await clearAllAuthState(page)
  })

  test('🎬 演示：登录流程', async ({ page }) => {
    // ============================================
    // Step 1: 访问登录页面
    // ============================================
    console.log('📍 Step 1: 访问登录页面')

    await page.goto('/login')
    await waitForPageStable(page)

    // 高亮页面标题
    await highlightElement(page, 'h1', 800)
    await expect(page.locator('h1')).toContainText('照片时光机')

    // ============================================
    // Step 2: 填写邮箱
    // ============================================
    console.log('📍 Step 2: 填写邮箱')

    await highlightElement(page, '#email', 400)
    await typeWithEffect(page, '#email', TEST_USER.email, { delay: 50 })

    // ============================================
    // Step 3: 填写密码
    // ============================================
    console.log('📍 Step 3: 填写密码')

    await highlightElement(page, '#password', 400)
    await typeWithEffect(page, '#password', TEST_USER.password, { delay: 40 })

    // ============================================
    // Step 4: 提交登录
    // ============================================
    console.log('📍 Step 4: 提交登录')

    await highlightElement(page, 'button[type="submit"]', 500)
    await clickWithEffect(page, 'button[type="submit"]', { pause: 1000 })

    // ============================================
    // Step 5: 验证结果
    // ============================================
    console.log('📍 Step 5: 验证登录结果')

    await page.waitForTimeout(1500)

    // 截图保存
    await page.screenshot({
      path: `test-results/demo-login-${Date.now()}.png`,
    })
  })

  test('🎬 演示：注册流程', async ({ page }) => {
    // 生成唯一用户数据（确保可重复执行）
    const newUser = {
      displayName: '演示用户',
      email: generateUniqueEmail(),
      password: 'Demo123456',
    }

    // ============================================
    // Step 1: 访问注册页面
    // ============================================
    console.log('📍 Step 1: 访问注册页面')

    await page.goto('/register')
    await waitForPageStable(page)

    await highlightElement(page, 'h1', 800)
    await expect(page.locator('text=创建你的账户')).toBeVisible()

    // ============================================
    // Step 2: 填写注册表单
    // ============================================
    console.log('📍 Step 2: 填写注册表单')

    await fillFormWithEffect(page, [
      { selector: '#displayName', value: newUser.displayName },
      { selector: '#email', value: newUser.email },
      { selector: '#password', value: newUser.password },
      { selector: '#confirmPassword', value: newUser.password },
    ])

    // ============================================
    // Step 3: 提交注册
    // ============================================
    console.log('📍 Step 3: 提交注册')

    await highlightElement(page, 'button[type="submit"]', 500)
    await clickWithEffect(page, 'button[type="submit"]', { pause: 1000 })

    // ============================================
    // Step 4: 验证结果
    // ============================================
    console.log('📍 Step 4: 验证注册结果')

    await page.waitForTimeout(1500)

    await page.screenshot({
      path: `test-results/demo-register-${Date.now()}.png`,
    })
  })

  test('🎬 演示：错误处理流程', async ({ page }) => {
    // ============================================
    // Step 1: 访问登录页面
    // ============================================
    console.log('📍 Step 1: 演示错误处理')

    await page.goto('/login')
    await waitForPageStable(page)

    // ============================================
    // Step 2: 输入错误凭证
    // ============================================
    console.log('📍 Step 2: 输入错误凭证')

    await fillFormWithEffect(page, [
      { selector: '#email', value: 'wrong@example.com' },
      { selector: '#password', value: 'wrongpassword' },
    ])

    // ============================================
    // Step 3: 提交并查看错误
    // ============================================
    console.log('📍 Step 3: 提交并查看错误')

    await highlightElement(page, 'button[type="submit"]', 500)
    await clickWithEffect(page, 'button[type="submit"]', { pause: 1500 })

    // 等待错误消息出现
    await page.waitForTimeout(2000)

    // 高亮错误消息（如果存在）
    const errorLocator = page.locator('.text-destructive')
    if (await errorLocator.isVisible().catch(() => false)) {
      await highlightElement(page, '.text-destructive', 1000)
    }

    await page.screenshot({
      path: `test-results/demo-error-${Date.now()}.png`,
    })
  })

  test('🎬 演示：导航流程', async ({ page }) => {
    // ============================================
    // Step 1: 从登录页到注册页
    // ============================================
    console.log('📍 Step 1: 登录页 → 注册页')

    await page.goto('/login')
    await waitForPageStable(page)

    // 高亮并点击注册链接
    await highlightElement(page, 'a[href="/register"]', 500)
    await clickWithEffect(page, 'a[href="/register"]', { pause: 500 })

    // 验证在注册页
    await expect(page.locator('text=创建你的账户')).toBeVisible()
    await page.waitForTimeout(300)

    // ============================================
    // Step 2: 从注册页到登录页
    // ============================================
    console.log('📍 Step 2: 注册页 → 登录页')

    // 高亮并点击登录链接
    await highlightElement(page, 'a[href="/login"]', 500)
    await clickWithEffect(page, 'a[href="/login"]', { pause: 500 })

    // 验证在登录页
    await expect(page.locator('text=登录到你的账户')).toBeVisible()

    await page.screenshot({
      path: `test-results/demo-navigation-${Date.now()}.png`,
    })
  })

  test('🎬 演示：完整认证流程', async ({ page }) => {
    // 这个测试演示完整的用户旅程：注册 -> 登出 -> 登录

    const newUser = {
      displayName: '完整演示',
      email: generateUniqueEmail(),
      password: 'Demo123456',
    }

    // ============================================
    // Part 1: 注册新用户
    // ============================================
    console.log('📍 Part 1: 注册新用户')

    await page.goto('/register')
    await waitForPageStable(page)

    await fillFormWithEffect(page, [
      { selector: '#displayName', value: newUser.displayName },
      { selector: '#email', value: newUser.email },
      { selector: '#password', value: newUser.password },
      { selector: '#confirmPassword', value: newUser.password },
    ])

    await highlightElement(page, 'button[type="submit"]', 500)
    await clickWithEffect(page, 'button[type="submit"]', { pause: 1500 })

    // 等待注册完成
    await page.waitForTimeout(2000)

    // ============================================
    // Part 2: 清除状态并重新登录
    // ============================================
    console.log('📍 Part 2: 清除状态并重新登录')

    await clearAllAuthState(page)

    await page.goto('/login')
    await waitForPageStable(page)

    await fillFormWithEffect(page, [
      { selector: '#email', value: newUser.email },
      { selector: '#password', value: newUser.password },
    ])

    await highlightElement(page, 'button[type="submit"]', 500)
    await clickWithEffect(page, 'button[type="submit"]', { pause: 1500 })

    // 等待登录完成
    await page.waitForTimeout(2000)

    await page.screenshot({
      path: `test-results/demo-full-flow-${Date.now()}.png`,
    })
  })
})
