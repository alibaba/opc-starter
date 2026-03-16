/**
 * Profile 页面 E2E 测试
 */

import { test, expect } from '@playwright/test'

test.describe('[P1] Profile 页面', () => {
  // 这些测试需要登录状态
  test.use({ storageState: '.playwright/user.json' })

  test.beforeEach(async ({ page }) => {
    await page.goto('/profile')
    await page.waitForLoadState('networkidle')
  })

  test('[P1] 应该能够访问个人中心页面', async ({ page }) => {
    await expect(page.getByRole('heading', { name: '个人中心', level: 1 })).toBeVisible()
    await expect(page.getByText('管理您的个人信息和头像')).toBeVisible()
  })

  test('[P1] 应该显示组织信息区域', async ({ page }) => {
    await expect(page.getByRole('heading', { name: '组织信息' })).toBeVisible()
  })

  test('[P1] 应该显示头像上传区域', async ({ page }) => {
    await expect(page.getByRole('heading', { name: '头像' })).toBeVisible()
  })

  test('[P1] 应该显示个人信息表单', async ({ page }) => {
    const count = await page.locator('input').count()
    expect(count).toBeGreaterThan(0)
  })
})

test.describe('[P2] Profile 页面导航', () => {
  // 这些测试需要登录状态
  test.use({ storageState: '.playwright/user.json' })

  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')
  })

  test('[P2] 从 Dashboard 导航到 Profile', async ({ page }) => {
    // 点击个人中心链接（使用 main 区域的卡片，避免与侧边栏重复）
    await page
      .locator('main')
      .getByRole('link', { name: '个人中心 更新个人信息和头像 进入' })
      .click()
    await expect(page).toHaveURL(/.*profile.*/)
    await expect(page.getByRole('heading', { name: '个人中心', level: 1 })).toBeVisible()
  })
})
