/**
 * Dashboard 页面 E2E 测试
 */

import { test, expect } from '@playwright/test'

test.describe('[P1] Dashboard 页面', () => {
  test.use({ storageState: '.playwright/user.json' })

  test('[P1] 登录后应该显示页面', async ({ page }) => {
    await page.goto('/')
    // 验证页面能够正常加载
    await expect(page.locator('body')).toBeVisible()
  })
})
