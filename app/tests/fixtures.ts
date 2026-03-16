/* eslint-disable react-hooks/rules-of-hooks */
/**
 * Playwright カスタム Fixtures
 * 認証済みページテスト用の共通 fixture を提供する
 *
 * chromium プロジェクトは storageState でセッションを復元するが、
 * ProtectedRoute が initialize() → supabase.auth.getUser() を呼ぶため
 * auth/v1/user エンドポイントを page.route() で mock する必要がある。
 */

import { test as base, type Page } from '@playwright/test'

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

/**
 * mock auth routes on the page so ProtectedRoute can verify the session
 */
async function mockAuthRoutes(page: Page) {
  // mock getUser (called by supabase.auth.getUser())
  await page.route('**/auth/v1/user', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(MOCK_USER),
    })
  })

  // mock token refresh
  await page.route('**/auth/v1/token**', async (route) => {
    const session = {
      access_token: 'mock-access-token-' + Date.now(),
      refresh_token: 'mock-refresh-token-' + Date.now(),
      expires_in: 3600,
      expires_at: Date.now() / 1000 + 3600,
      token_type: 'bearer',
      user: MOCK_USER,
    }
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(session),
    })
  })
}

// 扩展 test，加入 authedPage fixture
export const test = base.extend<{ authedPage: Page }>({
  authedPage: async ({ page }, use) => {
    await mockAuthRoutes(page)
    await use(page)
  },
})

export { expect } from '@playwright/test'
