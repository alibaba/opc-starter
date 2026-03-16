/**
 * Dashboard 页面 E2E 测试
 */

import { test, expect } from '@playwright/test'

test.describe('[P1] Dashboard 页面', () => {
  // 这些测试需要登录状态
  test.use({ storageState: '.playwright/user.json' })

  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    // 等待页面完全加载
    await page.waitForLoadState('networkidle')
  })

  test('[P1] 登录后应该显示 Dashboard 页面', async ({ page }) => {
    // 页面大标题 h1（有两个，取 main 里的那个）
    await expect(page.locator('main').getByRole('heading', { name: 'OPC-Starter' })).toBeVisible()
    // 项目描述段落
    await expect(page.getByText(/AI-Friendly|React|Boilerplate/)).toBeVisible()
  })

  test('[P1] 应该显示快速入口卡片', async ({ page }) => {
    // 快速入口区域标题
    await expect(page.getByRole('heading', { name: '快速入口' })).toBeVisible()
    // 四个功能卡片 - 使用 main 内的 link 以避免与侧边栏 nav 重复
    await expect(
      page.locator('main').getByRole('link', { name: '组织管理 管理团队成员和组织架构 进入' })
    ).toBeVisible()
    await expect(
      page.locator('main').getByRole('link', { name: '个人中心 更新个人信息和头像 进入' })
    ).toBeVisible()
    await expect(page.locator('main').getByRole('link', { name: /云存储设置/ })).toBeVisible()
    await expect(page.locator('main').getByRole('link', { name: /系统设置/ })).toBeVisible()
  })

  test('[P1] 应该显示系统状态', async ({ page }) => {
    // 系统状态卡片标题
    await expect(page.getByRole('heading', { name: '系统状态' })).toBeVisible()
    // 网络状态和同步状态文本
    await expect(page.getByText('网络状态')).toBeVisible()
    await expect(page.getByText('同步状态')).toBeVisible()
  })

  test('[P1] 应该显示已集成功能列表', async ({ page }) => {
    // 已集成功能标题
    await expect(page.getByRole('heading', { name: '已集成功能' })).toBeVisible()
    // 功能列表项
    await expect(page.getByText('Supabase Auth 认证')).toBeVisible()
    await expect(page.getByText('组织架构管理')).toBeVisible()
    await expect(page.getByText('Agent Studio (A2UI)')).toBeVisible()
  })
})

test.describe('[P1] Dashboard 导航功能', () => {
  // 这些测试需要登录状态
  test.use({ storageState: '.playwright/user.json' })

  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')
  })

  test('[P1] 点击组织管理应该跳转到人员页面', async ({ page }) => {
    // 使用 main 区域的卡片链接（包含描述文字的那个）
    await page
      .locator('main')
      .getByRole('link', { name: '组织管理 管理团队成员和组织架构 进入' })
      .click()
    await expect(page).toHaveURL(/.*persons.*/)
  })

  test('[P1] 点击个人中心应该跳转到个人页面', async ({ page }) => {
    await page
      .locator('main')
      .getByRole('link', { name: '个人中心 更新个人信息和头像 进入' })
      .click()
    await expect(page).toHaveURL(/.*profile.*/)
  })

  test('[P1] 点击云存储设置应该跳转到设置页面', async ({ page }) => {
    await page
      .locator('main')
      .getByRole('link', { name: /云存储设置/ })
      .click()
    await expect(page).toHaveURL(/.*settings\/cloud-storage.*/)
  })

  test('[P1] 点击系统设置应该跳转到设置页面', async ({ page }) => {
    await page
      .locator('main')
      .getByRole('link', { name: /系统设置/ })
      .click()
    await expect(page).toHaveURL(/.*settings.*/)
  })
})
