/**
 * Persons 页面 E2E 测试
 * 测试组织架构与人员管理页面
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

test.describe.fixme('[P1] Persons 页面', () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
  })

  test('[P1] 应该能够访问人员管理页面', async ({ page }) => {
    await page.goto('/persons')
    await expect(page.locator('text=组织架构与人员管理')).toBeVisible()
  })

  test('[P1] 应该显示组织树区域', async ({ page }) => {
    await page.goto('/persons')
    await expect(page.locator('text=组织树')).toBeVisible()
  })

  test('[P1] 应该显示成员列表区域', async ({ page }) => {
    await page.goto('/persons')
    await page.waitForLoadState('networkidle')

    const memberListVisible = await page
      .locator('text=成员')
      .isVisible()
      .catch(() => false)

    const selectOrgVisible = await page
      .locator('text=选择一个组织')
      .isVisible()
      .catch(() => false)

    expect(memberListVisible || selectOrgVisible).toBeTruthy()
  })
})

test.describe.fixme('[P2] Persons 页面导航', () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
  })

  test('[P2] 从 Dashboard 导航到 Persons', async ({ page }) => {
    await expect(page.locator('text=OPC-Starter')).toBeVisible()
    await page.click('text=组织管理')
    await expect(page).toHaveURL(/.*persons.*/)
    await expect(page.locator('text=组织架构与人员管理')).toBeVisible()
  })
})
