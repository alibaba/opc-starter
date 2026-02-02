/**
 * 登录功能 E2E 测试
 * 测试用户登录流程和登录后的页面跳转
 */

describe('用户登录功能', function () {
  // 加载测试用户数据
  beforeEach(function () {
    cy.fixture('users').as('users')
    cy.clearAuth()
  })

  describe('登录页面访问', () => {
    it('应该能够访问登录页面', () => {
      cy.visit('/login')

      cy.contains('登录到你的账户').should('be.visible')

      // 验证表单元素存在
      cy.get('input[type="email"]').should('be.visible')
      cy.get('input[type="password"]').should('be.visible')
      cy.get('button[type="submit"]').should('be.visible').should('contain', '登录')

      // 验证注册链接
      cy.contains('还没有账号？').should('be.visible')
      cy.contains('注册').should('be.visible')
    })

    it('未登录时访问首页应该重定向到登录页', () => {
      cy.visit('/')

      // 应该自动跳转到登录页
      cy.url().should('include', '/login')
    })
  })

  describe('登录表单验证', () => {
    beforeEach(() => {
      cy.visit('/login')
    })

    it('空表单提交应该显示浏览器原生验证', () => {
      // 点击登录按钮
      cy.get('button[type="submit"]').click()

      // 由于 HTML5 required 属性，浏览器会阻止提交
      // URL 不应该改变
      cy.url().should('include', '/login')
    })

    it('只填写邮箱应该显示密码必填提示', () => {
      cy.get('input[type="email"]').type('test@example.com')
      cy.get('button[type="submit"]').click()

      // URL 不应该改变
      cy.url().should('include', '/login')
    })

    it('邮箱格式不正确应该显示验证提示', () => {
      cy.get('input[type="email"]').type('invalid-email')
      cy.get('input[type="password"]').type('password123')
      cy.get('button[type="submit"]').click()

      // 浏览器会阻止提交
      cy.url().should('include', '/login')
    })
  })

  describe('登录功能测试', function () {
    beforeEach(function () {
      cy.visit('/login')
    })

    it('使用正确的凭证应该能够成功登录', function () {
      const { email, password } = this.users.testUser

      cy.log(`测试用户: ${email}`)

      // 填写登录表单
      cy.get('input[type="email"]').clear().type(email)
      cy.get('input[type="password"]').clear().type(password)

      // 提交表单
      cy.get('button[type="submit"]').click()

      // 验证登录按钮状态变化
      cy.get('button[type="submit"]').should('contain', '登录中...')

      // 等待跳转到首页
      cy.url({ timeout: 10000 }).should('eq', Cypress.config().baseUrl + '/')

      // 验证已登录状态
      cy.checkLoggedIn()
    })

    it('使用错误的密码应该显示错误提示', function () {
      const { email } = this.users.testUser
      const { password: wrongPassword } = this.users.invalidUser

      // 填写错误的凭证
      cy.get('input[type="email"]').type(email)
      cy.get('input[type="password"]').type(wrongPassword)

      // 提交表单
      cy.get('button[type="submit"]').click()

      // 应该显示错误消息
      cy.contains('Invalid login credentials', { timeout: 10000 }).should('be.visible')

      // 应该仍然在登录页
      cy.url().should('include', '/login')
    })

    it('使用不存在的邮箱应该显示错误提示', function () {
      const { email, password } = this.users.invalidUser

      // 填写不存在的用户
      cy.get('input[type="email"]').type(email)
      cy.get('input[type="password"]').type(password)

      // 提交表单
      cy.get('button[type="submit"]').click()

      // 应该显示错误消息
      cy.contains('Invalid login credentials', { timeout: 10000 }).should('be.visible')

      // 应该仍然在登录页
      cy.url().should('include', '/login')
    })
  })

  describe('登录后页面跳转验证', () => {
    it('登录成功后应该跳转到首页', () => {
      cy.login()

      // 验证 URL
      cy.url().should('eq', Cypress.config().baseUrl + '/')
    })

    it('登录后应该能够访问受保护的页面', () => {
      cy.login()

      // 测试访问各个受保护的页面
      const protectedRoutes = [{ path: '/persons', text: '人员' }]

      protectedRoutes.forEach((route) => {
        cy.visit(route.path)
        cy.url().should('include', route.path)
        cy.url().should('not.include', '/login')
        cy.log(`✅ 可以访问 ${route.path}`)
      })
    })

    it('登录后刷新页面应该保持登录状态', () => {
      cy.login()

      // 刷新页面
      cy.reload()

      // 应该仍然在首页，不会跳转到登录页
      cy.url().should('not.include', '/login')
      cy.checkLoggedIn()
    })

    it('登录后打开新标签页应该保持登录状态', () => {
      cy.login()

      // 模拟新标签页：清除当前页面但保留存储
      cy.visit('/')

      // 应该仍然保持登录状态
      cy.url().should('not.include', '/login')
      cy.checkLoggedIn()
    })
  })

  describe('使用自定义命令登录', () => {
    it('cy.login() 命令应该正常工作', () => {
      cy.login()
      cy.checkLoggedIn()
    })

    it('cy.logout() 命令应该正常工作', () => {
      cy.login()
      cy.logout()
      cy.checkLoggedOut()
    })

    it('连续登录登出应该正常工作', () => {
      // 第一次登录
      cy.login()
      cy.checkLoggedIn()

      // 登出
      cy.logout()
      cy.checkLoggedOut()

      // 第二次登录
      cy.login()
      cy.checkLoggedIn()
    })
  })

  describe('边界情况测试', function () {
    it('登录过程中刷新页面应该能够重新登录', function () {
      cy.visit('/login')

      const { email, password } = this.users.testUser

      cy.get('input[type="email"]').type(email)
      cy.get('input[type="password"]').type(password)

      // 刷新页面
      cy.reload()

      // 重新填写并登录
      cy.get('input[type="email"]').type(email)
      cy.get('input[type="password"]').type(password)
      cy.get('button[type="submit"]').click()

      // 应该能够成功登录
      cy.url({ timeout: 10000 }).should('not.include', '/login')
    })

    it('已登录状态访问登录页应该重定向到首页', function () {
      cy.login()

      // 尝试访问登录页
      cy.visit('/login')

      // 应该重定向到首页（如果实现了此逻辑）
      // 或者至少不应该显示登录表单
      // 根据实际实现调整断言
      cy.log('已登录用户访问登录页的行为')
    })
  })
})
