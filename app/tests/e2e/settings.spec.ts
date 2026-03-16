/**
 * Settings 页面 E2E 测试
 */

import { test, expect } from '@playwright/test'

test.describe('[P2] Settings 页面', () => {
  // 这些测试需要登录状态
  test.use({ storageState: '.playwright/user.json' })

  test.beforeEach(async ({ page }) => {
    await page.goto('/settings')
    await page.waitForLoadState('networkidle')
  })

  test('[P2] 应该能够访问设置页面', async ({ page }) => {
    await expect(page.getByRole('heading', { name: '设置', level: 1 })).toBeVisible()
    await expect(page.getByText('管理应用配置和偏好设置')).toBeVisible()
  })

  test('[P2] 应该显示云存储设置入口', async ({ page }) => {
    await expect(page.getByRole('link', { name: /云存储/ })).toBeVisible()
    await expect(page.getByText('管理存储空间和同步设置')).toBeVisible()
  })

  test('[P2] 应该显示关于信息', async ({ page }) => {
    await expect(page.getByRole('heading', { name: '关于' })).toBeVisible()
    await expect(page.getByText(/React 19|TypeScript/)).toBeVisible()
  })
})

test.describe('[P2] Settings 页面导航', () => {
  // 这些测试需要登录状态
  test.use({ storageState: '.playwright/user.json' })

  test('[P2] 点击云存储应该跳转到云存储设置页面', async ({ page }) => {
    await page.goto('/settings')
    await page.waitForLoadState('networkidle')
    await page.getByRole('link', { name: /云存储/ }).click()
    await expect(page).toHaveURL(/.*settings\/cloud-storage.*/)
  })

  test('[P2] 从 Dashboard 导航到 Settings', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')
    // 点击系统设置链接（使用 main 区域卡片）
    await page
      .locator('main')
      .getByRole('link', { name: /系统设置/ })
      .click()
    await expect(page).toHaveURL(/.*settings.*/)
    await expect(page.getByRole('heading', { name: '设置', level: 1 })).toBeVisible()
  })
})
