/**
 * Settings 页面 E2E 测试
 */

import { test, expect } from '@playwright/test'

test.describe('[P2] Settings 页面', () => {
  test.use({ storageState: '.playwright/user.json' })

  test('[P2] 应该能够访问设置页面', async ({ page }) => {
    await page.goto('/settings')
    await expect(page.locator('body')).toBeVisible()
  })

  test('[P2] 页面应该正常加载', async ({ page }) => {
    await page.goto('/settings')
    await expect(page).toHaveURL(/.*settings.*/)
  })
})
