/**
 * Cypress E2E 测试支持文件
 * 在每个测试文件执行前自动加载
 */

// 导入自定义命令
import './commands'

// 全局配置
Cypress.on('uncaught:exception', (err, runnable) => {
  // 忽略某些不影响测试的错误
  // 例如：React 开发环境的警告
  if (err.message.includes('ResizeObserver')) {
    return false
  }
  
  // 允许测试继续执行
  return true
})

// 测试前钩子
beforeEach(() => {
  // 清除本地存储和 Session Storage
  cy.clearLocalStorage()
  cy.clearCookies()
  
  // 注意：不需要显式等待 MSW
  // MSW 会在应用加载时自动启动
  // cy.visit() 会等待页面完全加载，包括 MSW 初始化
})

// 测试后钩子
afterEach(function() {
  // 测试失败时截图
  if (this.currentTest.state === 'failed') {
    const testName = this.currentTest.title
    cy.screenshot(`failed-${testName}`, { capture: 'fullPage' })
  }
})

// 全局日志配置
Cypress.on('log:added', (attrs, log) => {
  // 可以在这里添加自定义日志处理
})

// 添加自定义 Cypress 配置
Cypress.Commands.overwrite('visit', (originalFn, url, options) => {
  // 在访问页面前添加自定义逻辑
  return originalFn(url, {
    ...options,
    onBeforeLoad: (win) => {
      // 可以在页面加载前注入代码
      if (options && options.onBeforeLoad) {
        options.onBeforeLoad(win)
      }
    },
  })
})

// 打印测试环境信息
console.log('🧪 Cypress E2E 测试环境已加载')
console.log('📧 测试用户:', Cypress.env('TEST_USER_EMAIL'))
