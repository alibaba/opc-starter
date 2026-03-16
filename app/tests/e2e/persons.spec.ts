/**
 * Persons 页面 E2E 测试
 */

import { test, expect } from '@playwright/test'

test.describe('[P1] Persons 页面', () => {
  // 这些测试需要登录状态
  test.use({ storageState: '.playwright/user.json' })

  test.beforeEach(async ({ page }) => {
    await page.goto('/persons')
    await page.waitForLoadState('networkidle')
  })

  test('[P1] 应该能够访问人员管理页面', async ({ page }) => {
    await expect(page.getByRole('heading', { name: '组织架构与人员管理' })).toBeVisible()
  })

  test('[P1] 应该显示组织树区域', async ({ page }) => {
    // 组织树在左侧，检查 h2 标题"组织树"
    await expect(page.getByRole('heading', { name: '组织树' })).toBeVisible()
  })

  test('[P1] 应该显示成员列表区域', async ({ page }) => {
    // 检查成员列表或选择组织的提示
    const hasMembersContent = await page
      .getByText(/成员|选择一个组织/)
      .first()
      .isVisible()
      .catch(() => false)
    expect(hasMembersContent).toBeTruthy()
  })
})

test.describe('[P2] Persons 页面导航', () => {
  // 这些测试需要登录状态
  test.use({ storageState: '.playwright/user.json' })

  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')
  })

  test('[P2] 从 Dashboard 导航到 Persons', async ({ page }) => {
    // 点击组织管理链接（使用 main 区域卡片）
    await page
      .locator('main')
      .getByRole('link', { name: '组织管理 管理团队成员和组织架构 进入' })
      .click()
    await expect(page).toHaveURL(/.*persons.*/)
    await expect(page.getByRole('heading', { name: '组织架构与人员管理' })).toBeVisible()
  })
})
