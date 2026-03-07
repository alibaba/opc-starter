---
description: 项目扩展指南，添加新页面、数据实体或 Cypress 测试时应用
globs: ["app/src/pages/**/*", "app/src/types/**/*", "app/src/services/data/**/*", "app/cypress/**/*"]
---

# 项目扩展指南

## 添加新页面

1. 在 `src/pages/` 创建页面组件
2. 在 `src/config/routes.tsx` 添加路由
3. 在 `src/components/layout/MainLayout.tsx` 添加导航入口

## 添加新数据实体

1. 在 `src/types/` 定义类型
2. 在 `src/services/data/adapters/` 创建适配器
3. 在 `src/stores/` 创建 Zustand Store
4. 更新 `app/supabase/setup.sql` 添加表结构

## Cypress E2E 测试

测试凭证从 `cypress/fixtures/users.json` 读取，**不要**用环境变量：

```javascript
cy.fixture('users').then((users) => {
  const { email, password } = users.testUser
})
```

MSW Mock 数据位置：
- 认证 API：`src/mocks/handlers/authHandlers.ts`
- REST API：`src/mocks/handlers/supabaseRestHandlers.ts`
- Agent API：`src/mocks/handlers/agentHandlers.ts`
