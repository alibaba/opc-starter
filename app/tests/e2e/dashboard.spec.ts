/**
 * Dashboard 页面 E2E 测试
 */

import { test, expect } from '@playwright/test'

test.describe('[P1] Dashboard 页面', () => {
  test.use({ storageState: '.playwright/user.json' })

  test.beforeEach(async ({ page }) => {
    await page.goto('/')
  })

  test('[P1] 登录后应该显示 Dashboard 页面', async ({ page }) => {
    // main 区域的大标题 h1（使用 PROJECT_CONFIG.name）
    await expect(page.locator('main').getByRole('heading').first()).toBeVisible()
    // main 区域的副标题（包含项目描述的段落）
    await expect(
      page
        .locator('main')
        .getByText(/AI-Friendly|React|Boilerplate/)
        .first()
    ).toBeVisible()
  })

  test('[P1] 应该显示快速入口卡片', async ({ page }) => {
    // 卡片标题在 main 区域，用 heading role 精确匹配
    await expect(page.locator('main').getByRole('heading', { name: '组织管理' })).toBeVisible()
    await expect(page.locator('main').getByRole('heading', { name: '个人中心' })).toBeVisible()
    await expect(page.locator('main').getByRole('heading', { name: '云存储设置' })).toBeVisible()
    await expect(page.locator('main').getByRole('heading', { name: '系统设置' })).toBeVisible()
  })

  test('[P1] 应该显示系统状态', async ({ page }) => {
    // 系统状态在 Card 的 h2 中
    await expect(page.locator('main').getByRole('heading', { name: '系统状态' })).toBeVisible()
    await expect(page.locator('text=网络状态').first()).toBeVisible()
    await expect(page.locator('text=同步状态').first()).toBeVisible()
  })

  test('[P1] 应该显示已集成功能列表', async ({ page }) => {
    await expect(page.locator('text=已集成功能')).toBeVisible()
    await expect(page.locator('text=Supabase Auth 认证')).toBeVisible()
    await expect(page.locator('text=组织架构管理')).toBeVisible()
    await expect(page.locator('text=Agent Studio (A2UI)')).toBeVisible()
  })
})

test.describe('[P1] Dashboard 导航功能', () => {
  test.use({ storageState: '.playwright/user.json' })

  test.beforeEach(async ({ page }) => {
    await page.goto('/')
  })

  test('[P1] 点击组织管理应该跳转到人员页面', async ({ page }) => {
    await page.locator('main').getByRole('heading', { name: '组织管理' }).click()
    await expect(page).toHaveURL(/.*persons.*/)
  })

  test('[P1] 点击个人中心应该跳转到个人页面', async ({ page }) => {
    await page.locator('main').getByRole('heading', { name: '个人中心' }).click()
    await expect(page).toHaveURL(/.*profile.*/)
  })

  test('[P1] 点击云存储设置应该跳转到设置页面', async ({ page }) => {
    await page.locator('main').getByRole('heading', { name: '云存储设置' }).click()
    await expect(page).toHaveURL(/.*settings\/cloud-storage.*/)
  })

  test('[P1] 点击系统设置应该跳转到设置页面', async ({ page }) => {
    await page.locator('main').getByRole('heading', { name: '系统设置' }).click()
    await expect(page).toHaveURL(/.*settings.*/)
  })
})
