import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 120000,
  use: {
    baseURL: 'http://localhost:5174',
    trace: 'on-first-retry',
    video: 'on-first-retry',
    screenshot: 'only-on-failure',
    actionTimeout: 30000,
    navigationTimeout: 60000,
    // 禁用可能引起问题的特性
    acceptDownloads: true,
    bypassCSP: true,
  },
  projects: [
    {
      name: 'chromium',
      use: {
        channel: 'chrome',
        baseURL: 'http://localhost:5174',
        // 禁用沙盒模式（在某些环境中可能更快）
        launchOptions: {
          args: ['--no-sandbox', '--disable-setuid-sandbox'],
        },
      },
    },
  ],
  webServer: {
    command: 'npm run dev:test',
    url: 'http://localhost:5174',
    reuseExistingServer: true,
    timeout: 120000,
  },
})
