import { defineConfig, devices } from '@playwright/test'
import path from 'path'
import { fileURLToPath } from 'url'
import { config as dotenvConfig } from 'dotenv'

// ES 模块中获取 __dirname
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// 加载测试环境变量
dotenvConfig({ path: path.resolve(__dirname, '.env.test') })

/**
 * Playwright 配置文件
 * OPC-Starter E2E 测试配置
 */
export default defineConfig({
  // 测试目录
  testDir: './tests/e2e',

  // 测试文件匹配模式
  testMatch: '**/*.spec.ts',

  // 输出目录
  outputDir: './test-results',

  // 完全并行执行
  fullyParallel: true,

  // CI 环境禁止 .only()
  forbidOnly: !!process.env.CI,

  // CI 重试 2 次
  retries: process.env.CI ? 2 : 0,

  // CI 单 worker，本地多 worker
  workers: process.env.CI ? 1 : undefined,

  // 全局超时 60s
  timeout: 60000,

  // Expect 超时 10s
  expect: {
    timeout: 15000,
  },

  // 报告器
  reporter: [['html', { outputFolder: 'playwright-report', open: 'never' }], ['list']],

  // 全局设置
  use: {
    // 基础 URL
    baseURL: 'http://localhost:5173',

    // 操作超时 15s
    actionTimeout: 15000,

    // 导航超时 30s
    navigationTimeout: 30000,

    // 失败时截图
    screenshot: 'only-on-failure',

    // 失败时保留视频
    video: 'retain-on-failure',

    // 首次重试时记录 trace
    trace: 'on-first-retry',
  },

  // 项目配置
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  // 开发服务器
  webServer: {
    command: 'npm run dev:test',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
    stdout: 'pipe',
    stderr: 'pipe',
  },
})
