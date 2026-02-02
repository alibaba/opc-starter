# Cypress E2E 测试文档

## 📖 概述

本项目使用 Cypress 进行端到端（E2E）测试，确保应用的核心功能正常工作。

## 🚀 快速开始

### 1. 环境准备

首先，创建测试环境配置文件：

```bash
# 在 photo-wall 目录下创建 .env.test 文件
cp .env.development .env.test
```

编辑 `.env.test` 文件，配置测试环境变量：

```bash
# MSW Mock 开关
VITE_ENABLE_MSW=true

# 认证模式：true=使用MSW模拟认证，false=使用真实Supabase
VITE_USE_MOCK_AUTH=true

# Supabase 配置
VITE_SUPABASE_URL=your-supabase-url
VITE_SUPABASE_ANON_KEY=your-anon-key

# 测试用户凭证
TEST_USER_EMAIL=test@example.com
TEST_USER_PWD=Test123456
```

### 2. 运行测试

#### 交互式模式（推荐用于开发）

```bash
npm run test:e2e
```

这会启动 Cypress Test Runner，你可以：
- 选择要运行的测试文件
- 实时查看测试执行过程
- 使用时间旅行调试功能
- 查看详细的错误信息

#### 无头模式（用于 CI/CD）

```bash
npm run test:e2e:headless
```

这会在后台运行所有测试，适合集成到 CI/CD 流程中。

### 3. 单独运行 Cypress

如果开发服务器已经在运行（`npm run dev:test`），可以单独启动 Cypress：

```bash
# 交互式模式
npm run cypress:open

# 无头模式
npm run cypress:run
```

## 📁 目录结构

```
cypress/
├── e2e/                    # 测试文件
│   └── auth/              # 认证相关测试
│       └── login.cy.js    # 登录功能测试
├── fixtures/              # 测试数据
│   └── users.json        # 用户数据
├── support/               # 支持文件
│   ├── commands.js       # 自定义命令
│   └── e2e.js           # 全局配置
├── screenshots/           # 测试失败截图（自动生成）
├── videos/               # 测试录像（自动生成）
└── README.md            # 本文档
```

## 🛠️ 自定义命令

项目提供了以下自定义 Cypress 命令：

### 认证相关

```javascript
// 登录（使用环境变量中的测试用户）
cy.login()

// 使用自定义凭证登录
cy.login('custom@email.com', 'customPassword')

// 登出
cy.logout()

// 清除认证状态
cy.clearAuth()

// 检查是否已登录
cy.checkLoggedIn()

// 检查是否未登录
cy.checkLoggedOut()
```

### 数据清理

```javascript
// 清除 IndexedDB
cy.clearIndexedDB()

// 等待 MSW 启动
cy.waitForMSW()
```

### 工具方法

```javascript
// 等待元素可见并可交互
cy.waitForElement('.my-element')

// 等待加载完成
cy.waitForLoading()
```

## 📝 编写测试

### 基本测试结构

```javascript
describe('功能模块名称', () => {
  beforeEach(() => {
    // 每个测试前的准备工作
    cy.clearAuth()
  })

  it('应该能够完成某个操作', () => {
    // 1. 访问页面
    cy.visit('/some-page')
    
    // 2. 执行操作
    cy.get('button').click()
    
    // 3. 验证结果
    cy.url().should('include', '/expected-url')
    cy.contains('预期文本').should('be.visible')
  })
})
```

### 测试最佳实践

1. **使用数据属性选择器**
   ```javascript
   // 好的做法
   cy.get('[data-testid="login-button"]').click()
   
   // 避免使用（容易因样式改变而失败）
   cy.get('.btn.btn-primary.login').click()
   ```

2. **使用自定义命令**
   ```javascript
   // 好的做法
   cy.login()
   
   // 避免重复代码
   cy.visit('/login')
   cy.get('input[type="email"]').type('test@example.com')
   cy.get('input[type="password"]').type('password')
   cy.get('button').click()
   ```

3. **适当的等待**
   ```javascript
   // 好的做法
   cy.get('.element', { timeout: 10000 }).should('be.visible')
   
   // 避免硬编码延迟
   cy.wait(5000) // ❌
   ```

4. **清晰的断言**
   ```javascript
   // 好的做法
   cy.url().should('eq', 'http://localhost:5173/')
   cy.get('h1').should('contain', '照片时光机')
   
   // 避免模糊的断言
   cy.get('h1').should('exist') // 不够具体
   ```

## 🔧 配置说明

### cypress.config.js

主要配置项：

```javascript
{
  baseUrl: 'http://localhost:5173',  // 应用基础 URL
  viewportWidth: 1280,                // 视口宽度
  viewportHeight: 720,                // 视口高度
  defaultCommandTimeout: 10000,       // 命令超时时间
  video: true,                        // 是否录制视频
  screenshotOnRunFailure: true,       // 失败时截图
}
```

### 环境变量

测试可以通过 `Cypress.env()` 访问环境变量：

```javascript
const testEmail = Cypress.env('TEST_USER_EMAIL')
const testPassword = Cypress.env('TEST_USER_PWD')
```

## 🐛 调试技巧

### 1. 使用 Cypress Test Runner

交互式模式提供了强大的调试功能：
- 时间旅行：查看每一步的 DOM 状态
- 控制台日志：查看应用和测试的日志
- 网络请求：查看所有 API 请求

### 2. 使用 cy.debug()

```javascript
cy.get('.element')
  .debug()  // 在这里暂停，可以在控制台检查元素
  .click()
```

### 3. 使用 cy.pause()

```javascript
cy.visit('/login')
cy.pause()  // 测试会暂停，可以手动操作
cy.get('button').click()
```

### 4. 查看截图和视频

测试失败时会自动生成：
- 截图：`cypress/screenshots/`
- 视频：`cypress/videos/`

## 📊 测试覆盖

### 当前测试覆盖

- ✅ 用户登录功能
- ✅ 登录表单验证
- ✅ 登录后页面跳转
- ✅ 导航栏状态验证
- ✅ 认证状态持久化

### 已废弃测试（已删除）

以下测试因项目架构升级到 OSS-Native (v5.0) 而过期，已被删除：

- ❌ `cloud-storage-flow.cy.ts` - 云存储流程测试（UI 结构已重构）
- ❌ `cloud-upload.cy.ts` - 云上传测试（API 已迁移到 Supabase REST）

### 待添加测试

- ⏳ 用户注册功能
- ⏳ 照片上传功能（需要适配新的 OSS-Native 架构）
- ⏳ 相册管理功能
- ⏳ 人物识别功能
- ⏳ 搜索功能

## 🔄 CI/CD 集成

### GitHub Actions 示例

```yaml
name: E2E Tests

on: [push, pull_request]

jobs:
  cypress-run:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: 18
      - run: npm ci
      - run: npm run test:e2e:headless
      - uses: actions/upload-artifact@v3
        if: failure()
        with:
          name: cypress-screenshots
          path: cypress/screenshots
      - uses: actions/upload-artifact@v3
        if: failure()
        with:
          name: cypress-videos
          path: cypress/videos
```

## 📚 参考资源

- [Cypress 官方文档](https://docs.cypress.io/)
- [Cypress 最佳实践](https://docs.cypress.io/guides/references/best-practices)
- [MSW 文档](https://mswjs.io/)
- [项目测试清单](../TESTING.md)

## 🤝 贡献指南

添加新测试时：

1. 在 `cypress/e2e/` 下创建对应的测试文件
2. 使用描述性的测试名称
3. 添加必要的注释
4. 确保测试可以独立运行
5. 更新本文档的测试覆盖部分

## ❓ 常见问题与故障排查

### 测试运行问题

#### Q: 测试失败，提示找不到元素？
**解决方案**:
- 检查元素选择器是否正确
- 增加等待时间: `cy.get('.element', { timeout: 10000 })`
- 使用 `data-testid` 属性而非 class 选择器

#### Q: 端口被占用
**解决方案**:
```bash
# 查找占用端口的进程
lsof -i :5173
# 停止进程
kill -9 <PID>
```

### MSW Mock 问题

#### Q: MSW 没有拦截请求？
**解决方案**:
1. 确保 `VITE_ENABLE_MSW=true`
2. 检查 `public/mockServiceWorker.js` 文件存在
3. 清除浏览器缓存和 Service Worker
4. 查看浏览器控制台是否有 MSW 启动日志

#### Q: 测试用户登录失败
**解决方案**:
1. 检查 `.env.test` 文件配置
2. 确认测试用户凭证正确:
   ```bash
   TEST_USER_EMAIL=test@example.com
   TEST_USER_PWD=Test123456
   ```

### CI/CD 问题

#### Q: 测试在本地通过但 CI 失败？
**解决方案**:
- 检查环境变量配置
- 增加 CI 超时时间
- 本地模拟 CI 环境: `npm run test:e2e:headless`

### 数据问题

#### Q: IndexedDB 数据污染？
**解决方案**:
```javascript
beforeEach(() => {
  cy.clearAuth()
  cy.clearIndexedDB()
})
```

### 测试控制

#### Q: 如何跳过某个测试？
A: 使用 `it.skip()` 或 `describe.skip()`

#### Q: 如何只运行某个测试？
A: 使用 `it.only()` 或 `describe.only()`

### 调试技巧

**使用 Cypress 调试工具**:
```javascript
cy.pause()    // 暂停测试
cy.debug()    // 打印调试信息
cy.screenshot('debug-screenshot')  // 截图
```

**查看失败截图和视频**:
- 截图: `cypress/screenshots/`
- 视频: `cypress/videos/`

---

**Happy Testing! 🎉**

