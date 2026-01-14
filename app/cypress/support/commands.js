/**
 * Cypress 自定义命令
 * 提供可复用的测试操作
 */

/**
 * 等待 MSW (Mock Service Worker) 启动
 * 确保在测试开始前 MSW 已经准备好拦截请求
 */
Cypress.Commands.add('waitForMSW', () => {
  // 简单等待一段时间让 MSW 启动
  // MSW 会在应用启动时自动初始化
  cy.wait(1000)
  cy.log('⏳ 等待 MSW 初始化完成')
  
  // 检查控制台是否有 MSW 启动日志
  cy.window().then((win) => {
    // 如果有 Service Worker 支持，检查状态
    if (win.navigator.serviceWorker) {
      cy.log('✅ Service Worker 支持已启用')
    } else {
      cy.log('⚠️ 浏览器不支持 Service Worker')
    }
  })
})

/**
 * 登录命令
 * 从 fixture 读取测试用户凭证进行登录
 * 
 * @example
 * cy.login()
 * cy.login('custom@email.com', 'customPassword')
 */
Cypress.Commands.add('login', (email, password) => {
  cy.log('🔐 开始登录流程')
  
  // 如果提供了自定义凭证，直接使用
  if (email && password) {
    cy.log(`📧 用户: ${email}`)
    performLogin(email, password)
    return
  }
  
  // 否则从 fixture 读取
  cy.fixture('users').then((users) => {
    const { email: testEmail, password: testPassword } = users.testUser
    cy.log(`📧 用户: ${testEmail}`)
    performLogin(testEmail, testPassword)
  })
})

/**
 * 执行登录操作
 */
function performLogin(email, password) {
  // 访问登录页面
  cy.visit('/login')
  
  // 等待页面加载完成
  cy.get('h1').should('contain', '照片时光机')
  
  // 填写登录表单
  cy.get('input[type="email"]').clear().type(email)
  cy.get('input[type="password"]').clear().type(password)
  
  // 点击登录按钮
  cy.get('button[type="submit"]').click()
  
  // 等待登录完成（跳转到首页）
  cy.url().should('not.include', '/login')
  cy.url().should('eq', Cypress.config().baseUrl + '/')
  
  cy.log('✅ 登录成功')
}

/**
 * 登出命令
 * 清除认证状态并返回登录页
 */
Cypress.Commands.add('logout', () => {
  cy.log('🚪 开始登出流程')
  
  // 方式1: 通过 UI 登出（如果有登出按钮）
  // cy.get('[data-testid="logout-button"]').click()
  
  // 方式2: 直接清除认证状态
  cy.clearLocalStorage()
  cy.clearCookies()
  
  // 访问首页，应该自动跳转到登录页
  cy.visit('/')
  cy.url().should('include', '/login')
  
  cy.log('✅ 登出成功')
})

/**
 * 清除认证状态
 * 清除所有与认证相关的本地存储
 */
Cypress.Commands.add('clearAuth', () => {
  cy.log('🧹 清除认证状态')
  
  // 清除 localStorage 中的认证信息
  cy.clearLocalStorage()
  
  // 清除 cookies
  cy.clearCookies()
  
  // 清除 sessionStorage
  cy.window().then((win) => {
    win.sessionStorage.clear()
  })
  
  // 清除 IndexedDB（如果需要）
  cy.clearIndexedDB()
  
  cy.log('✅ 认证状态已清除')
})

/**
 * 清除 IndexedDB
 * 清除应用的所有 IndexedDB 数据
 */
Cypress.Commands.add('clearIndexedDB', () => {
  cy.log('🗑️ 清除 IndexedDB')
  
  cy.window().then((win) => {
    const databases = ['photo-wall-db']
    
    databases.forEach((dbName) => {
      // 同步删除数据库，不等待回调
      win.indexedDB.deleteDatabase(dbName)
    })
  })
  
  // 等待一小段时间确保删除完成
  cy.wait(100)
  cy.log('✅ IndexedDB 清除完成')
})

/**
 * 等待元素可见并可交互
 * 
 * @param {string} selector - CSS 选择器
 * @param {number} timeout - 超时时间（毫秒）
 */
Cypress.Commands.add('waitForElement', (selector, timeout = 10000) => {
  cy.get(selector, { timeout })
    .should('be.visible')
    .should('not.be.disabled')
})

/**
 * 检查是否已登录
 * 通过检查 URL 和页面内容判断登录状态
 */
Cypress.Commands.add('checkLoggedIn', () => {
  cy.url().should('not.include', '/login')
  cy.url().should('not.include', '/register')
  
  // 可以添加更多检查，例如检查用户头像或用户名是否显示
  cy.log('✅ 用户已登录')
})

/**
 * 检查是否未登录
 * 应该在登录页或注册页
 */
Cypress.Commands.add('checkLoggedOut', () => {
  cy.url().should('match', /\/(login|register)/)
  cy.log('✅ 用户未登录')
})

/**
 * 等待加载完成
 * 等待页面上的加载指示器消失
 */
Cypress.Commands.add('waitForLoading', () => {
  // 等待骨架屏或加载动画消失
  cy.get('[data-testid="loading"]', { timeout: 10000 }).should('not.exist')
  cy.get('[data-testid="skeleton"]', { timeout: 10000 }).should('not.exist')
})

// 类型定义（用于 IDE 智能提示，即使不使用 TypeScript）
// 在 cypress/support/index.d.ts 中定义类型
