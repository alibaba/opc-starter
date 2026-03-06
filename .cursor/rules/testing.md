---
description: 测试规范，编辑测试文件时应用
globs: ["app/src/**/*.test.ts", "app/src/**/*.test.tsx", "app/src/**/*.spec.ts", "app/cypress/**/*"]
---

# 测试规范

## 单元测试 (Vitest)

- 框架: Vitest + @testing-library/react
- 配置: `app/vitest.config.ts`
- 覆盖率阈值: 80% (lines/functions/branches/statements)

```bash
npm test              # 运行所有测试
npm run coverage      # 运行覆盖率检查
npm run test:tools    # 仅运行 Agent Tools 测试
```

## E2E 测试 (Cypress)

- 测试凭证从 `cypress/fixtures/users.json` 读取，**不要**用环境变量
- Mock 数据在 `src/mocks/handlers/` 中定义

```javascript
// 正确：从 fixture 读取凭证
cy.fixture('users').then((users) => {
  const { email, password } = users.testUser
})
```

## MSW Mock

- 认证 API: `src/mocks/handlers/authHandlers.ts`
- REST API: `src/mocks/handlers/supabaseRestHandlers.ts`
- Agent API: `src/mocks/handlers/agentHandlers.ts`
