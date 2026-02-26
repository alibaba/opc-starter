# OPC-Starter AI Coding 指南

> 一人公司启动器 AI 开发规范 | v1.0

## 核心原则

1. **优先更新现有文档**，不创建新文档
2. **SQL 变更集中管理** → `app/supabase/setup.sql`
3. **操作文档更新** → `app/supabase/SUPABASE_COOKBOOK.md`

## 技术栈版本

| 技术 | 版本 | 注意事项 |
|------|------|----------|
| React | 19.1 | |
| TypeScript | 5.9 | |
| Vite | 7.1 | |
| **Tailwind CSS** | **4.1** | ⚠️ 使用 v4 语法，禁用 v2/v3 语法 |
| Supabase | 2.80 | Auth + Storage + Realtime + Edge Functions |
| Zustand | 5.0 | |
| **Qwen-Plus** | via 百炼 API | OpenAI SDK 兼容模式（通义千问） |
| **A2UI** | v0.8 | Agent 动态 UI 协议 |

## 项目能力概览

| 能力模块 | 描述 | 关键文件 |
|----------|------|----------|
| 认证系统 | Supabase Auth | `src/auth/` |
| 组织架构 | 多层级团队、成员管理 | `src/components/organization/` |
| 个人中心 | 用户信息、头像 | `src/pages/ProfilePage.tsx` |
| 云存储 | Supabase Storage 管理 | `src/pages/CloudStorageSettingsPage.tsx` |
| **Agent Studio** | 自然语言驱动的 AI 助手 | `src/components/agent/` |
| 数据同步 | IndexedDB + Realtime | `src/services/data/DataService.ts` |

## Tailwind CSS v4 规范

> ⚠️ **必须遵守**: 本项目使用 Tailwind CSS v4.1，禁止使用 v2/v3 语法！

### 渐变语法

```tsx
// ❌ 禁止：v3 语法
<div className="bg-gradient-to-r from-purple-500 to-pink-500" />

// ✅ 正确：v4 语法
<div className="bg-linear-to-r from-purple-500 to-pink-500" />
```

| v3 (兼容但不推荐) | v4 (规范语法) |
|------------------|--------------|
| `bg-gradient-to-t` | `bg-linear-to-t` |
| `bg-gradient-to-r` | `bg-linear-to-r` |
| `bg-gradient-to-b` | `bg-linear-to-b` |
| `bg-gradient-to-l` | `bg-linear-to-l` |

### 透明度语法

```tsx
// ❌ 禁止：v2/v3 语法
<div className="bg-opacity-50 text-opacity-75 border-opacity-50" />

// ✅ 正确：v4 语法
<div className="bg-black/50 text-white/75 border-gray-500/50" />
```

| v2/v3 (禁用) | v4 (使用) |
|-------------|-----------|
| `bg-opacity-*` | `bg-color/opacity` |
| `text-opacity-*` | `text-color/opacity` |
| `border-opacity-*` | `border-color/opacity` |
| `ring-opacity-*` | `ring-color/opacity` |
| `divide-opacity-*` | `divide-color/opacity` |
| `placeholder-opacity-*` | `placeholder:text-color/opacity` |

## 技术文档

| 文档 | 用途 |
|------|------|
| `docs/Architecture.md` | 系统架构 |
| `docs/Epics.yaml` | 项目进度 |
| `docs/Epic-25-OPC-Starter.md` | 开源化计划 |
| `app/supabase/SUPABASE_COOKBOOK.md` | 数据库操作 |
| `app/supabase/setup.sql` | 数据库脚本 |

## 开发规范

- 使用 `DataService` 进行数据操作
- 遵循乐观更新模式
- RLS 策略使用 `SECURITY DEFINER` 函数
- **Tailwind CSS 必须使用 v4 语法**

## Agent Studio 开发规范 (v1.0)

### 架构概览

```
用户 ←→ AgentWindow (悬浮对话框)
           ↓
      useAgentChat Hook
           ↓
      SSE Client ←→ ai-assistant (Edge Function)
           ↓                    ↓
      Tool Executor         Qwen-Plus (百炼 API)
           ↓
      A2UI Renderer (动态 UI)
```

### 核心文件

| 文件 | 职责 |
|------|------|
| `src/components/agent/AgentWindow.tsx` | 悬浮对话窗口 |
| `src/hooks/useAgentChat.ts` | Agent 对话状态管理 |
| `src/lib/agent/sseClient.ts` | SSE 流式客户端 |
| `src/lib/agent/toolExecutor.ts` | 本地工具执行器 |
| `src/components/agent/a2ui/A2UIRenderer.tsx` | A2UI 组件渲染器 |
| `src/components/agent/a2ui/registry.ts` | 组件白名单注册表 |
| `supabase/functions/ai-assistant/` | AI 助手后端（单文件） |

### 添加新 Agent Tool

1. **后端**: 在 `ai-assistant/index.ts` 的 TOOLS 数组添加工具定义
2. **前端**: 在 `src/lib/agent/tools/` 创建工具目录
3. **注册**: 在 `src/lib/agent/tools/registry.ts` 注册

```typescript
// 工具定义示例 (OpenAI 格式)
{
  type: "function",
  function: {
    name: "myNewTool",
    description: "工具描述",
    parameters: {
      type: "object",
      properties: { /* ... */ },
      required: ["param1"],
    },
  },
}
```

### 添加新 A2UI 组件

1. 在 `src/components/agent/a2ui/components/` 创建组件
2. 在 `registry.ts` 注册组件
3. 在 `src/types/a2ui.ts` 添加类型定义

```typescript
// registry.ts 注册示例
export const A2UI_REGISTRY: A2UIComponentRegistry = {
  // ... 现有组件
  'my-component': MyComponent,
};
```

### A2UI Action ID 规范

| 类别 | Action ID 格式 | 示例 |
|------|---------------|------|
| 导航 | `navigation.*` | `navigation.goTo` |
| 用户 | `user.*` | `user.updateProfile` |
| 组织 | `org.*` | `org.createTeam` |

### Mock LLM 测试

使用 MSW 模拟 Agent 响应：

```typescript
// src/mocks/handlers/agentHandlers.ts
http.post('*/functions/v1/ai-assistant', async ({ request }) => {
  // 返回 SSE 流式响应
});
```

## 禁止事项

- ❌ 创建独立 SQL 文件
- ❌ 直接操作 IndexedDB 或 Supabase（使用 DataService）
- ❌ 创建新的文档文件
- ❌ 使用 Tailwind CSS v2/v3 的 opacity 语法
- ❌ 使用 `bg-gradient-to-*`（应使用 `bg-linear-to-*`）
- ❌ 在 A2UI 中使用未注册的组件类型
- ❌ 直接调用 LLM API（通过 ai-assistant Edge Function）

## Cypress E2E 测试规范

### 测试用户凭证

从 `cypress/fixtures/users.json` 读取，**不要**使用环境变量：

```javascript
// ❌ 禁止：从环境变量读取
const testEmail = Cypress.env('TEST_USER_EMAIL')

// ✅ 正确：从 fixture 读取
cy.fixture('users').then((users) => {
  const { email, password } = users.testUser
})

// 或使用 this 上下文（需要 function 而非箭头函数）
describe('测试', function() {
  beforeEach(function() {
    cy.fixture('users').as('users')
  })
  
  it('测试用例', function() {
    const { email, password } = this.users.testUser
  })
})
```

### MSW Mock 数据

- 认证 API：`src/mocks/handlers/authHandlers.ts`
- REST API：`src/mocks/handlers/supabaseRestHandlers.ts`
- 测试用户凭证需与 `authHandlers.ts` 中的 mock 保持一致

## Supabase 注意事项

### PromiseLike vs Promise

Supabase 的 `.then()` 返回 `PromiseLike` 而非 `Promise`，**没有** `.finally()` 方法：

```typescript
// ❌ 错误：PromiseLike 没有 finally
const promise = supabase.from('table').select().then(...).finally(...)

// ✅ 正确：使用 async IIFE
const promise = (async () => {
  try {
    const { data, error } = await supabase.from('table').select()
    return data
  } finally {
    // 清理逻辑
  }
})()
```

## 项目扩展指南

### 添加新页面

1. 在 `src/pages/` 创建页面组件
2. 在 `src/config/routes.tsx` 添加路由
3. 在 `src/components/layout/MainLayout.tsx` 添加导航入口

### 添加新数据实体

1. 在 `src/types/` 定义类型
2. 在 `src/services/data/adapters/` 创建适配器
3. 在 `src/stores/` 创建 Zustand Store
4. 更新 `supabase/setup.sql` 添加表结构

## Cursor Cloud specific instructions

### Project layout

All application code lives under `app/`. Run all npm commands from `/workspace/app`.

### Running without Supabase (MSW mock mode)

The app can run fully locally without a real Supabase project by using MSW mocks:

1. Ensure `app/.env.test` exists with `VITE_ENABLE_MSW=true` (created automatically by the update script if missing).
2. `npm run dev:test` — starts Vite on port **5173** with MSW intercepting all Supabase API calls.
3. Test credentials (from `cypress/fixtures/users.json`): `test@example.com` / `888888`.

### Gotchas

- The original `package-lock.json` referenced Alibaba's internal npm registry (`registry.anpm.alibaba-inc.com`), which is unreachable from Cloud VMs. If `npm install` fails with `ECONNRESET` errors from that registry, delete `package-lock.json` and `node_modules`, then run `npm install --registry https://registry.npmjs.org/`.
- The `prepare` script runs `cd .. && husky app/.husky` which installs git hooks from the repo root. This is expected and runs automatically during `npm install`.
- Lint command (`npm run lint`) applies `--fix` by default.

### Key commands (run from `app/`)

| Task | Command |
|------|---------|
| Dev server (mock) | `npm run dev:test` |
| Dev server (real Supabase) | `npm run dev` |
| Lint | `npm run lint` |
| Type check | `npm run type-check` |
| Unit tests | `npm test` |
| E2E tests | `npm run test:e2e` |
| Build | `npm run build` |
