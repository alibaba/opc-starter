/**
 * Settings 页面 E2E 测试
 */

import { test, expect } from '../fixtures'
import { STORAGE_STATE } from '../../playwright.config'

test.describe('[P2] Settings 页面', () => {
  test.use({ storageState: STORAGE_STATE })

  test.beforeEach(async ({ authedPage: page }) => {
    await page.goto('/settings')
  })

  test('[P2] 应该能够访问设置页面', async ({ authedPage: page }) => {
    // SettingsPage 的 h1 在 bg-card border-b 区块内，不在 main 中
    await expect(page.getByRole('heading', { name: '设置', level: 1 })).toBeVisible()
    await expect(page.locator('text=管理应用配置和偏好设置')).toBeVisible()
  })

  test('[P2] 应该显示云存储设置入口', async ({ authedPage: page }) => {
    await expect(page.locator('text=管理存储空间和同步设置')).toBeVisible()
  })

  test('[P2] 应该显示关于信息', async ({ authedPage: page }) => {
    await expect(page.locator('text=关于')).toBeVisible()
    // 精确匹配 about 区块中的 OPC-Starter span
    await expect(page.locator('main').getByText('OPC-Starter').first()).toBeVisible()
    await expect(page.locator('text=React 19')).toBeVisible()
  })
})

test.describe('[P2] Settings 页面导航', () => {
  test.use({ storageState: STORAGE_STATE })

  test.beforeEach(async ({ authedPage: page }) => {
    await page.goto('/settings')
  })

  test('[P2] 点击云存储应该跳转到云存储设置页面', async ({ authedPage: page }) => {
    await page.locator('text=管理存储空间和同步设置').click()
    await expect(page).toHaveURL(/.*settings\/cloud-storage.*/)
  })

  test('[P2] 从 Dashboard 导航到 Settings', async ({ authedPage: page }) => {
    await page.goto('/')
    await expect(page.locator('main').getByRole('heading', { name: 'OPC-Starter' })).toBeVisible()
    await page.locator('main').getByRole('heading', { name: '系统设置' }).click()
    await expect(page).toHaveURL(/.*settings.*/)
    await expect(page.getByRole('heading', { name: '设置', level: 1 })).toBeVisible()
  })
})
