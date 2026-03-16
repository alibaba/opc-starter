/**
 * Settings 页面 E2E 测试
 * 测试设置页面的显示和导航功能
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

test.describe.fixme('[P2] Settings 页面', () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
  })

  test('[P2] 应该能够访问设置页面', async ({ page }) => {
    await page.goto('/settings')
    await expect(page.locator('text=设置')).toBeVisible()
    await expect(page.locator('text=管理应用配置和偏好设置')).toBeVisible()
  })

  test('[P2] 应该显示云存储设置入口', async ({ page }) => {
    await page.goto('/settings')
    await expect(page.locator('text=云存储')).toBeVisible()
    await expect(page.locator('text=管理存储空间和同步设置')).toBeVisible()
  })

  test('[P2] 应该显示关于信息', async ({ page }) => {
    await page.goto('/settings')
    await expect(page.locator('text=关于')).toBeVisible()
    await expect(page.locator('text=OPC-Starter')).toBeVisible()
    await expect(page.locator('text=React 19')).toBeVisible()
  })
})

test.describe.fixme('[P2] Settings 页面导航', () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
  })

  test('[P2] 点击云存储应该跳转到云存储设置页面', async ({ page }) => {
    await page.goto('/settings')
    await page.click('text=云存储')
    await expect(page).toHaveURL(/.*settings\/cloud-storage.*/)
  })

  test('[P2] 从 Dashboard 导航到 Settings', async ({ page }) => {
    await expect(page.locator('text=OPC-Starter')).toBeVisible()
    await page.click('text=系统设置')
    await expect(page).toHaveURL(/.*settings.*/)
    await expect(page.locator('text=设置')).toBeVisible()
  })
})
