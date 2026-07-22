const { defineConfig } = require('cypress')
const dotenv = require('dotenv')
const path = require('path')
const usersFixture = require('./cypress/fixtures/users.json')

// 加载 .env.test 文件
const envPath = path.resolve(__dirname, '.env.test')
const envConfig = dotenv.config({ path: envPath })

if (envConfig.error) {
  console.warn('⚠️  未找到 .env.test 文件，使用默认测试配置')
  console.warn('   如需 MSW Mock，请运行 ./setup-env.sh 或手动创建 .env.test')
}

module.exports = defineConfig({
  allowCypressEnv: false,
  e2e: {
    // 基础URL
    baseUrl: 'http://localhost:5173',
    
    // 视口大小
    viewportWidth: 1280,
    viewportHeight: 720,
    
    // 测试文件匹配模式
    specPattern: 'cypress/e2e/**/*.cy.{js,jsx,ts,tsx}',
    
    // 支持文件
    supportFile: 'cypress/support/e2e.js',
    
    // Fixtures 文件夹
    fixturesFolder: 'cypress/fixtures',
    
    // 截图配置
    screenshotsFolder: 'cypress/screenshots',
    screenshotOnRunFailure: true,
    
    // 视频配置
    videosFolder: 'cypress/videos',
    video: true,
    videoCompression: 32,
    
    // 超时配置
    defaultCommandTimeout: 10000,
    pageLoadTimeout: 30000,
    requestTimeout: 10000,
    
    // 重试配置
    retries: {
      runMode: 2,    // CI 环境重试 2 次
      openMode: 0,   // 本地开发不重试
    },
    
    // Cypress Dashboard 配置（需要注册获取 projectId）
    projectId: 'opc-starter-e2e',
    
    setupNodeEvents(on, config) {
      // 实现 node 事件监听器
      // 可以在这里添加插件或自定义任务
      
      // 打印配置信息
      on('before:run', () => {
        console.log('🚀 Cypress E2E 测试启动')
        console.log('📧 Fixture 测试用户:', usersFixture.testUser.email)
        console.log('🧾 凭证来源: cypress/fixtures/users.json')
        console.log('🔧 MSW Mock:', process.env.VITE_ENABLE_MSW === 'true' ? '已启用' : '已禁用')
      })
      
      return config
    },
  },
})
