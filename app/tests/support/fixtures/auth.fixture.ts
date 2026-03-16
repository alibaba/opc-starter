/**
 * Playwright 测试 Fixtures
 * 提供可复用的测试设置和清理
 */

import { test as base, Page } from '@playwright/test'

// 测试用户类型
export interface TestUser {
  email: string
  password: string
}

// 扩展的测试 fixtures
type MyFixtures = {
  authenticatedPage: Page
  testUser: TestUser
}

// 测试用户数据
const TEST_USER: TestUser = {
  email: 'test@example.com',
  password: '888888',
}

export const test = base.extend<MyFixtures>({
  testUser: [
    async (_, use) => {
      await use(TEST_USER)
    },
    { option: false },
  ],

  /* eslint-disable react-hooks/rules-of-hooks */
  authenticatedPage: async ({ page }, use) => {
    await page.goto('/login')
    await page.waitForLoadState('networkidle')
    await page.fill('input[type="email"]', TEST_USER.email)
    await page.fill('input[type="password"]', TEST_USER.password)
    await page.click('button[type="submit"]')
    await page.waitForURL('**/', { timeout: 10000 })
    await use(page)
    await page.context().clearCookies()
    await page.evaluate(() => localStorage.clear())
  },
  /* eslint-enable react-hooks/rules-of-hooks */
})

export { expect } from '@playwright/test'
