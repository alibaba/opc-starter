/**
 * Profile 页面 E2E 测试
 * 测试个人中心页面的显示和功能
 *
 * FIXME: 这些测试依赖测试用户 test@example.com 存在
 * 需要先在 Supabase 中创建或确认测试用户
 */

import { test, expect } from '@playwright/test'

const TEST_USER = {
  email: 'test@example.com',
  password: '888888',
}

async function login(page: import('@playwright/test').Page) {
  await page.goto('/login')
  await page.fill('input[type="email"]', TEST_USER.email)
  await page.fill('input[type="password"]', TEST_USER.password)
  await page.click('button[type="submit"]')
  await expect(page).toHaveURL('http://localhost:5173/', { timeout: 10000 })
}

test.describe.fixme('[P1] Profile 页面', () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
  })

  test('[P1] 应该能够访问个人中心页面', async ({ page }) => {
    await page.goto('/profile')
    await expect(page.locator('text=个人中心')).toBeVisible()
    await expect(page.locator('text=管理您的个人信息和头像')).toBeVisible()
  })

  test('[P1] 应该显示组织信息区域', async ({ page }) => {
    await page.goto('/profile')
    await expect(page.locator('text=组织信息')).toBeVisible()
  })

  test('[P1] 应该显示头像上传区域', async ({ page }) => {
    await page.goto('/profile')
    await expect(page.locator('text=头像')).toBeVisible()
  })

  test('[P1] 应该显示个人信息表单', async ({ page }) => {
    await page.goto('/profile')
    await page.waitForLoadState('networkidle')
    const inputs = page.locator('input')
    const count = await inputs.count()
    expect(count).toBeGreaterThan(0)
  })
})

test.describe.fixme('[P2] Profile 页面导航', () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
  })

  test('[P2] 从 Dashboard 导航到 Profile', async ({ page }) => {
    await expect(page.locator('text=OPC-Starter')).toBeVisible()
    await page.click('text=个人中心')
    await expect(page).toHaveURL(/.*profile.*/)
    await expect(page.locator('text=个人中心')).toBeVisible()
  })
})
