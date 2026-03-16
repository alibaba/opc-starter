/**
 * Profile 页面 E2E 测试
 */

import { test, expect } from '@playwright/test'

test.describe('[P1] Profile 页面', () => {
  test.use({ storageState: '.playwright/user.json' })

  test.beforeEach(async ({ page }) => {
    await page.goto('/profile')
  })

  test('[P1] 应该能够访问个人中心页面', async ({ page }) => {
    await expect(page.getByRole('heading', { name: '个人中心', level: 1 })).toBeVisible()
    await expect(page.locator('text=管理您的个人信息和头像')).toBeVisible()
  })

  test('[P1] 应该显示组织信息区域', async ({ page }) => {
    await expect(page.locator('text=组织信息')).toBeVisible()
  })

  test('[P1] 应该显示头像上传区域', async ({ page }) => {
    await expect(page.getByRole('heading', { name: '头像' })).toBeVisible()
  })

  test('[P1] 应该显示个人信息表单', async ({ page }) => {
    await page.waitForLoadState('networkidle')
    const count = await page.locator('input').count()
    expect(count).toBeGreaterThan(0)
  })
})

test.describe('[P2] Profile 页面导航', () => {
  test.use({ storageState: '.playwright/user.json' })

  test.beforeEach(async ({ page }) => {
    await page.goto('/')
  })

  test('[P2] 从 Dashboard 导航到 Profile', async ({ page }) => {
    await expect(page.locator('main').getByRole('heading').first()).toBeVisible()
    await page.locator('main').getByRole('heading', { name: '个人中心' }).click()
    await expect(page).toHaveURL(/.*profile.*/)
    await expect(page.getByRole('heading', { name: '个人中心', level: 1 })).toBeVisible()
  })
})
