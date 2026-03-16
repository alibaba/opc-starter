import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 60000,
  use: {
    baseURL: 'http://localhost:5174',
    trace: 'on-first-retry',
    video: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: {
        channel: 'chrome',
        baseURL: 'http://localhost:5174',
      },
    },
  ],
  webServer: {
    command: 'npm run dev:test:e2e',
    url: 'http://localhost:5174',
    reuseExistingServer: true,
    timeout: 120000,
  },
})
