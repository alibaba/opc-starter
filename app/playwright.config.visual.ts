import { defineConfig, devices } from '@playwright/test'

/**
 * Playwright 可视化演示配置文件
 * 使用真实 Supabase 环境，非 MSW mock 模式
 */
export default defineConfig({
  testDir: './tests/e2e/visual-demo',
  timeout: 300000, // 5分钟超时
  expect: {
    timeout: 15000,
  },
  use: {
    // 使用真实环境（非 mock）
    baseURL: 'http://localhost:5173',
    trace: 'on',
    video: 'on',
    screenshot: 'on',
    actionTimeout: 15000,
    navigationTimeout: 30000,
    acceptDownloads: true,
    bypassCSP: true,
    // 浏览器上下文选项
    contextOptions: {
      viewport: { width: 1440, height: 900 },
    },
  },
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        launchOptions: {
          args: ['--no-sandbox', '--disable-setuid-sandbox'],
          slowMo: 50, // 慢动作模式，便于观察
        },
      },
    },
  ],
  webServer: {
    command: 'npm run dev', // 使用真实 Supabase 环境
    url: 'http://localhost:5173',
    reuseExistingServer: true,
    timeout: 120000,
  },
  reporter: [['list'], ['html', { outputFolder: 'playwright-visual-report', open: 'never' }]],
  outputDir: 'test-results/visual-demo',
})
