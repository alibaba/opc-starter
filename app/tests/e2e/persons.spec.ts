/**
 * Persons 页面 E2E 测试
 */

import { test, expect } from '@playwright/test'

test.describe('[P1] Persons 页面', () => {
  test.use({ storageState: '.playwright/user.json' })

  test('[P1] 应该能够访问人员管理页面', async ({ page }) => {
    await page.goto('/persons')
    await expect(page.locator('body')).toBeVisible()
  })

  test('[P1] 页面应该正常加载', async ({ page }) => {
    await page.goto('/persons')
    await expect(page).toHaveURL(/.*persons.*/)
  })
})
