/**
 * Dashboard 页面 E2E 测试
 * 测试首页仪表盘的显示和导航功能
 *
 * FIXME: 这些测试依赖测试用户 test@example.com 存在
 * 需要先在 Supabase 中创建或确认测试用户
 */

import { test, expect } from '@playwright/test'

// 测试用户数据
const TEST_USER = {
  email: 'test@example.com',
  password: '888888',
}

// 登录辅助函数
async function login(page: import('@playwright/test').Page) {
  await page.goto('/login')
  await page.fill('input[type="email"]', TEST_USER.email)
  await page.fill('input[type="password"]', TEST_USER.password)
  await page.click('button[type="submit"]')
  await expect(page).toHaveURL('http://localhost:5173/', { timeout: 10000 })
}

test.describe.fixme('[P1] Dashboard 页面', () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
  })

  test('[P1] 登录后应该显示 Dashboard 页面', async ({ page }) => {
    await expect(page.locator('text=OPC-Starter')).toBeVisible()
    await expect(page.locator('text=一人公司启动器')).toBeVisible()
  })

  test('[P1] 应该显示快速入口卡片', async ({ page }) => {
    await expect(page.locator('text=组织管理')).toBeVisible()
    await expect(page.locator('text=个人中心')).toBeVisible()
    await expect(page.locator('text=云存储设置')).toBeVisible()
    await expect(page.locator('text=系统设置')).toBeVisible()
  })

  test('[P1] 应该显示系统状态', async ({ page }) => {
    await expect(page.locator('text=系统状态')).toBeVisible()
    await expect(page.locator('text=网络状态')).toBeVisible()
    await expect(page.locator('text=同步状态')).toBeVisible()
  })

  test('[P1] 应该显示已集成功能列表', async ({ page }) => {
    await expect(page.locator('text=已集成功能')).toBeVisible()
    await expect(page.locator('text=Supabase Auth 认证')).toBeVisible()
    await expect(page.locator('text=组织架构管理')).toBeVisible()
    await expect(page.locator('text=Agent Studio (A2UI)')).toBeVisible()
  })
})

test.describe.fixme('[P1] Dashboard 导航功能', () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
  })

  test('[P1] 点击组织管理应该跳转到人员页面', async ({ page }) => {
    await page.click('text=组织管理')
    await expect(page).toHaveURL(/.*persons.*/)
  })

  test('[P1] 点击个人中心应该跳转到个人页面', async ({ page }) => {
    await page.click('text=个人中心')
    await expect(page).toHaveURL(/.*profile.*/)
  })

  test('[P1] 点击云存储设置应该跳转到设置页面', async ({ page }) => {
    await page.click('text=云存储设置')
    await expect(page).toHaveURL(/.*settings\/cloud-storage.*/)
  })

  test('[P1] 点击系统设置应该跳转到设置页面', async ({ page }) => {
    await page.click('text=系统设置')
    await expect(page).toHaveURL(/.*settings.*/)
  })
})
