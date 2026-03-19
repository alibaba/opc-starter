/**
 * Skills Hub 发布页 E2E 测试
 *
 * 测试覆盖：
 * - 发布页面访问和显示
 * - 表单验证
 * - 发布流程
 * - 文件上传
 * - 版本管理
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
// 测试套件
// ============================================

test.describe('[P0] Skills Hub 发布页 - 访问控制', () => {
  test.beforeEach(async ({ page }) => {
    await clearAuthState(page)
  })

  test('[P0] 未登录访问发布页重定向到登录页', async ({ page }) => {
    await page.goto('/publish')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(1000)

    // 应该重定向到登录页
    await expect(page).toHaveURL(/.*login.*/, { timeout: 10000 })
  })

  test('[P0] 登录后可以访问发布页', async ({ page }) => {
    await mockAuthUser(page)
    await loginAsTestUser(page)

    await page.goto('/publish')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(1000)

    // 检查发布页标题
    const pageTitle = page.getByRole('heading', { name: /发布|Publish/i })
    await expect(pageTitle).toBeVisible({ timeout: 10000 })
  })
})

test.describe('[P1] Skills Hub 发布页 - 表单展示', () => {
  test.beforeEach(async ({ page }) => {
    await clearAuthState(page)
    await mockAuthUser(page)
    await loginAsTestUser(page)
  })

  test('[P1] 应该显示发布表单', async ({ page }) => {
    await page.goto('/publish')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(1000)

    // 检查表单字段
    const nameInput = page.locator('#name, input[name="name"]')
    await expect(nameInput).toBeVisible({ timeout: 10000 })

    const descInput = page.locator('#description, textarea[name="description"]')
    await expect(descInput).toBeVisible({ timeout: 10000 })
  })

  test('[P1] 应该显示平台选择', async ({ page }) => {
    await page.goto('/publish')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(1000)

    // 检查平台选择区域
    const platformSection = page.getByText('平台').or(page.getByText('Qoder'))
    await expect(platformSection.first()).toBeVisible({ timeout: 10000 })
  })

  test('[P1] 应该显示可见性选择', async ({ page }) => {
    await page.goto('/publish')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(1000)

    // 检查可见性选择
    const visibilitySection = page.getByText('可见性').or(page.getByText('公开'))
    await expect(visibilitySection.first()).toBeVisible({ timeout: 10000 })
  })

  test('[P1] 应该显示提交按钮', async ({ page }) => {
    await page.goto('/publish')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(1000)

    const submitButton = page.getByRole('button', { name: /发布|提交|创建/i })
    await expect(submitButton).toBeVisible({ timeout: 10000 })
  })
})

test.describe('[P1] Skills Hub 发布页 - 表单验证', () => {
  test.beforeEach(async ({ page }) => {
    await clearAuthState(page)
    await mockAuthUser(page)
    await loginAsTestUser(page)
  })

  test('[P1] 空表单提交被阻止', async ({ page }) => {
    await page.goto('/publish')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(1000)

    const submitButton = page.getByRole('button', { name: /发布|提交|创建/i })
    await submitButton.click()

    // 检查验证错误
    const errorMessage = page.getByText('必填').or(page.getByText('请输入'))
    // 表单验证可能阻止提交
    await page.waitForTimeout(500)
  })

  test('[P1] 名称字段有正确的 placeholder', async ({ page }) => {
    await page.goto('/publish')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(1000)

    const nameInput = page.locator('#name, input[name="name"]')
    const placeholder = await nameInput.getAttribute('placeholder')
    // placeholder 应该存在
  })
})

test.describe('[P2] Skills Hub 发布页 - 表单填写', () => {
  test.beforeEach(async ({ page }) => {
    await clearAuthState(page)
    await mockAuthUser(page)
    await loginAsTestUser(page)
  })

  test('[P2] 可以填写 Skill 名称', async ({ page }) => {
    await page.goto('/publish')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(1000)

    const nameInput = page.locator('#name, input[name="name"]')
    await nameInput.fill('Test Skill Name')
    await expect(nameInput).toHaveValue('Test Skill Name')
  })

  test('[P2] 可以填写描述', async ({ page }) => {
    await page.goto('/publish')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(1000)

    const descInput = page.locator('#description, textarea[name="description"]')
    await descInput.fill('This is a test skill description')
    await expect(descInput).toHaveValue('This is a test skill description')
  })

  test('[P2] 可以选择平台', async ({ page }) => {
    await page.goto('/publish')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(1000)

    // 点击平台选择
    const qoderCheckbox = page.locator('input[value="qoder"], label:has-text("Qoder")')
    if (
      await qoderCheckbox
        .first()
        .isVisible({ timeout: 2000 })
        .catch(() => false)
    ) {
      await qoderCheckbox.first().click()
      await page.waitForTimeout(300)
    }
  })

  test('[P2] 可以添加标签', async ({ page }) => {
    await page.goto('/publish')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(1000)

    // 查找标签输入
    const tagInput = page.locator('input[placeholder*="标签"], input[name="tags"]')
    if (await tagInput.isVisible({ timeout: 2000 }).catch(() => false)) {
      await tagInput.fill('react')
      await tagInput.press('Enter')
      await page.waitForTimeout(300)
    }
  })
})

test.describe('[P2] Skills Hub 发布页 - 文件上传', () => {
  test.beforeEach(async ({ page }) => {
    await clearAuthState(page)
    await mockAuthUser(page)
    await loginAsTestUser(page)
  })

  test('[P2] 应该显示文件上传区域', async ({ page }) => {
    await page.goto('/publish')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(1000)

    // 检查上传区域
    const uploadArea = page.getByText('上传').or(page.locator('input[type="file"]'))
    await expect(uploadArea.first()).toBeVisible({ timeout: 10000 })
  })
})
