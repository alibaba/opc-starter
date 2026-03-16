/**
 * Playwright 全局 Setup（作为 Playwright project 运行）
 * 登录测试用户并保存认证状态，供需要登录的测试复用
 *
 * 注意：MSW Service Worker 在首次访问时注册，但需要页面刷新才能激活。
 * 这里使用 Playwright 原生的 page.route() 直接 mock 认证请求，
 * 不依赖 MSW SW 的激活时序，更加可靠。
 */

import { test as setup, expect } from '@playwright/test'
import path from 'path'
import { fileURLToPath } from 'url'
import fs from 'fs'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

export const STORAGE_STATE = path.resolve(__dirname, '../../.playwright/user.json')

const MOCK_USER = {
  id: 'test-user-id-12345',
  email: 'test@example.com',
  aud: 'authenticated',
  role: 'authenticated',
  created_at: '2024-01-01T00:00:00.000Z',
  updated_at: '2024-01-01T00:00:00.000Z',
  user_metadata: { display_name: '测试用户' },
  app_metadata: {},
}

const MOCK_SESSION = {
  access_token: 'mock-access-token-setup',
  refresh_token: 'mock-refresh-token-setup',
  expires_in: 3600,
  expires_at: Date.now() / 1000 + 3600,
  token_type: 'bearer',
  user: MOCK_USER,
}

setup('authenticate test user', async ({ page }) => {
  // 确保目录存在
  const dir = path.dirname(STORAGE_STATE)
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }

  // 使用 Playwright route 直接 mock 认证请求（不依赖 MSW SW 激活时序）
  await page.route('**/auth/v1/token**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(MOCK_SESSION),
    })
  })

  await page.route('**/auth/v1/user', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(MOCK_USER),
    })
  })

  // 访问登录页
  await page.goto('/login')
  await page.waitForSelector('#email', { timeout: 30000 })

  // 填写凭证并提交
  await page.fill('#email', 'test@example.com')
  await page.fill('#password', '888888')
  await page.click('button[type="submit"]')

  // 等待跳转到首页
  await expect(page).toHaveURL('http://localhost:5173/', { timeout: 15000 })

  // 保存认证状态（localStorage 中有 supabase session）
  await page.context().storageState({ path: STORAGE_STATE })
})
