/**
 * Persons 页面 E2E 测试
 */

import { test, expect } from '../fixtures'
import { STORAGE_STATE } from '../../playwright.config'

test.describe('[P1] Persons 页面', () => {
  test.use({ storageState: STORAGE_STATE })

  test.beforeEach(async ({ authedPage: page }) => {
    await page.goto('/persons')
  })

  test('[P1] 应该能够访问人员管理页面', async ({ authedPage: page }) => {
    await expect(page.locator('text=组织架构与人员管理')).toBeVisible()
  })

  test('[P1] 应该显示组织树区域', async ({ authedPage: page }) => {
    await expect(page.locator('text=组织树')).toBeVisible()
  })

  test('[P1] 应该显示成员列表区域', async ({ authedPage: page }) => {
    await page.waitForLoadState('networkidle')
    const memberListVisible = await page
      .locator('text=成员')
      .first()
      .isVisible()
      .catch(() => false)
    const selectOrgVisible = await page
      .locator('text=选择一个组织')
      .isVisible()
      .catch(() => false)
    expect(memberListVisible || selectOrgVisible).toBeTruthy()
  })
})

test.describe('[P2] Persons 页面导航', () => {
  test.use({ storageState: STORAGE_STATE })

  test.beforeEach(async ({ authedPage: page }) => {
    await page.goto('/')
  })

  test('[P2] 从 Dashboard 导航到 Persons', async ({ authedPage: page }) => {
    await expect(page.locator('main').getByRole('heading', { name: 'OPC-Starter' })).toBeVisible()
    await page.locator('main').getByRole('heading', { name: '组织管理' }).click()
    await expect(page).toHaveURL(/.*persons.*/)
    await expect(page.locator('text=组织架构与人员管理')).toBeVisible()
  })
})
