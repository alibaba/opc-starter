---
name: auto-develop
description: OPC-Starter 智能开发技能。AI 亲和的 React Boilerplate 项目开发规范，支持动态上下文感知、TDD 驱动开发、Agent Studio 扩展。适用于认证系统、组织架构、Agent 工具、数据同步等模块的迭代开发。
---

# OPC-Starter 智能开发技能

> **项目定位**: OPC-Starter (一人公司启动器) 是一个 AI 亲和的 React Boilerplate，专为使用 Cursor、Qoder 等 AI Coding 工具的开发者设计。
>
> **核心理念**: 像高级研发专家 Amelia 一样执行 —— 测试即规范，代码即实现，精准定位，无冗余输出。

---

## 🎯 动态上下文系统

### 上下文感知规则

根据任务类型自动加载相关文档和约束，避免无关信息干扰。

| 任务关键词 | 触发上下文 | 加载文档 |
|------------|------------|----------|
| `Agent`、`工具`、`Tool`、`A2UI` | Agent Studio 开发 | `AGENTS.md` → Agent 规范章节 |
| `组件`、`页面`、`UI`、`样式` | 前端 UI 开发 | `references/coding-constraints.md` → 设计系统 |
| `数据库`、`SQL`、`表`、`字段` | 数据库变更 | `references/db-sync-checklist.md` |
| `Supabase`、`MCP`、`后端` | Supabase 后端操作 | SKILL.md → Supabase MCP 规范章节 |
| `测试`、`TDD`、`Cypress`、`Vitest` | 测试开发 | `references/tdd-workflow.md` |
| `Bug`、`修复`、`异常`、`报错` | 问题排查 | `references/troubleshooting.md` |
| `架构`、`模块`、`服务` | 系统设计 | `docs/Architecture.md` |

### 执行前自检

开始任务前，检测以下条件并动态加载规则：

```yaml
context_check:
  - keyword_match: 检测任务描述关键词
  - file_scope: 检测涉及的文件路径
  - change_type: 判断是新功能/Bug修复/重构
  
auto_load:
  agent_module: "app/src/components/agent/**" | "app/src/lib/agent/**"
  ui_module: "app/src/components/**" | "app/src/pages/**"
  data_module: "app/src/services/data/**" | "app/supabase/**"
  test_module: "**/*.test.ts" | "**/*.spec.ts" | "cypress/**"
```

---

## 📊 项目核心架构

### 技术栈

| 技术 | 版本 | 注意事项 |
|------|------|----------|
| React | 19.1 | 最新稳定版 |
| TypeScript | 5.9 | 严格类型 |
| Vite | 7.1 | 构建工具 |
| **Tailwind CSS** | **4.1** | ⚠️ 必须使用 v4 语法 |
| Supabase | 2.80 | Auth + Storage + Realtime + Edge Functions |
| Zustand | 5.0 | 状态管理 |
| **Vitest** | **4.0** | 单元测试框架 |
| **Cypress** | **15.7** | E2E 测试框架 |
| **Qwen-Plus** | via 百炼 API | Agent LLM（通义千问） |
| **A2UI** | v0.8 | Agent 动态 UI 协议 |

### 目录结构

```
opc-starter/
├── app/                          # 主应用
│   ├── src/
│   │   ├── auth/                 # 认证模块
│   │   ├── components/
│   │   │   ├── agent/            # Agent Studio ⭐
│   │   │   │   └── a2ui/         # A2UI 渲染系统
│   │   │   ├── business/         # 业务组件
│   │   │   ├── layout/           # 布局组件
│   │   │   ├── organization/     # 组织架构
│   │   │   └── ui/               # 基础 UI (shadcn)
│   │   ├── pages/                # 页面组件
│   │   ├── services/
│   │   │   └── data/             # DataService (核心) ⭐
│   │   ├── stores/               # Zustand Store
│   │   ├── lib/
│   │   │   ├── agent/            # Agent 客户端 ⭐
│   │   │   │   └── tools/        # 前端工具执行器
│   │   │   └── supabase/         # Supabase 客户端
│   │   ├── hooks/                # 自定义 Hooks
│   │   ├── types/                # TypeScript 类型
│   │   └── mocks/                # MSW Mock
│   └── supabase/
│       ├── functions/
│       │   └── ai-assistant/    # Agent SSE 网关 ⭐
│       └── setup.sql             # 数据库脚本 (所有变更集中于此)
├── docs/
│   ├── Architecture.md           # 系统架构
│   └── Epics.yaml                # 项目进度
├── _bmad/                        # BMAD 方法论 (可选参考)
└── AGENTS.md                     # AI Coding 快速指南
```

### 核心能力模块

| 模块 | 关键文件 | 说明 |
|------|----------|------|
| 认证系统 | `app/src/auth/` | Supabase Auth + JWT |
| 组织架构 | `app/src/components/organization/` | 多层级团队、成员、角色 |
| **Agent Studio** | `app/src/components/agent/` | 自然语言 AI 助手 ⭐ |
| 数据同步 | `app/src/services/data/DataService.ts` | IndexedDB + Realtime |
| 个人中心 | `app/src/pages/ProfilePage.tsx` | 用户信息、头像 |

---

## 🔴🟢🔵 TDD 核心原则

### 红-绿-重构循环

```
┌─────────────────────────────────────────────────────────────┐
│                    TDD 循环 (每个功能点)                     │
│                                                             │
│     🔴 RED          🟢 GREEN         🔵 REFACTOR           │
│   ┌─────────┐     ┌─────────┐     ┌─────────┐              │
│   │ 写失败  │────▶│ 写最小  │────▶│ 优化    │──┐           │
│   │ 的测试  │     │ 实现代码 │     │ 重构    │  │           │
│   └─────────┘     └─────────┘     └─────────┘  │           │
│        ▲                                        │           │
│        └────────────────────────────────────────┘           │
│                    (下一个功能点)                            │
└─────────────────────────────────────────────────────────────┘
```

| 阶段 | 目标 | 规则 |
|------|------|------|
| 🔴 RED | 编写失败的测试 | 测试必须明确表达需求意图 |
| 🟢 GREEN | 写最小代码通过测试 | 只写刚好让测试通过的代码 |
| 🔵 REFACTOR | 优化代码结构 | 测试保持通过，消除重复 |

### 测试先行原则 ⚠️ MANDATORY

```
❌ 禁止：先写代码再补测试
❌ 禁止：提交没有测试覆盖的新功能
❌ 禁止：修改代码后不运行测试就提交

✅ 必须：新功能先写测试用例
✅ 必须：Bug 修复先写复现测试
✅ 必须：每次提交前运行完整测试套件
```

### 测试金字塔

| 层级 | 测试类型 | 覆盖目标 | 运行频率 |
|------|----------|----------|----------|
| 底层 | 单元测试 (Vitest) | 工具函数、Services、Hooks | 每次保存 |
| 中层 | 集成测试 (Vitest) | DataService、Store 交互 | 每次提交 |
| 顶层 | E2E 测试 (Cypress) | 登录、核心用户流程 | PR 合并前 |

---

## 🤖 Agent Studio 开发规范

> 当任务涉及 Agent 相关开发时，自动加载此章节。

### 架构流程

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
| `app/src/components/agent/AgentWindow.tsx` | 悬浮对话窗口 |
| `app/src/hooks/useAgentChat.ts` | Agent 对话状态管理 |
| `app/src/lib/agent/sseClient.ts` | SSE 流式客户端 |
| `app/src/lib/agent/toolExecutor.ts` | 本地工具执行器 |
| `app/src/components/agent/a2ui/A2UIRenderer.tsx` | A2UI 组件渲染器 |
| `app/src/components/agent/a2ui/registry.ts` | 组件白名单注册表 |
| `app/supabase/functions/ai-assistant/` | Agent 后端网关 |

### 添加新 Agent Tool

1. **后端**: 在 `ai-assistant/tools.ts` 添加工具定义 (OpenAI 格式)
2. **前端**: 在 `app/src/lib/agent/tools/` 创建工具目录
3. **注册**: 在 `app/src/lib/agent/tools/registry.ts` 注册
4. **System Prompt**: 在 `ai-assistant/prompts/` 添加使用说明

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

1. 在 `app/src/components/agent/a2ui/components/` 创建组件
2. 在 `registry.ts` 注册组件 (白名单模式)
3. 在 `app/src/types/a2ui.ts` 添加类型定义

```typescript
// registry.ts 注册示例
export const A2UI_REGISTRY: A2UIComponentRegistry = {
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
// app/src/mocks/handlers/agentHandlers.ts
http.post('*/functions/v1/ai-assistant', async ({ request }) => {
  // 返回 SSE 流式响应
});
```

---

## 🎨 设计系统规范

> 当任务涉及 UI 组件开发时，自动加载此章节。

### Tailwind CSS v4 语法 (Mandatory)

```tsx
// ❌ 禁止：v2/v3 语法
className="bg-opacity-50 bg-gradient-to-r"

// ✅ 正确：v4 语法
className="bg-black/50 bg-linear-to-r"
```

| 禁止 (v2/v3) | 使用 (v4) |
|--------------|-----------|
| `bg-opacity-*` | `bg-color/opacity` |
| `bg-gradient-to-*` | `bg-linear-to-*` |

### 语义化颜色 (暗色模式适配)

**核心原则**: 使用语义化颜色，禁止硬编码颜色值。

| 语义化颜色 | 用途 | ❌ 禁止使用 |
|------------|------|-------------|
| `bg-background` | 页面背景 | `bg-gray-50`, `bg-white` |
| `bg-card` | 卡片/容器背景 | `bg-white` |
| `text-foreground` | 主要文字 | `text-gray-900`, `text-black` |
| `text-muted-foreground` | 次要文字 | `text-gray-500` |
| `border` | 边框 | `border-gray-200` |
| `bg-primary` | 主色按钮 | `bg-blue-600` |
| `bg-destructive` | 危险操作 | `bg-red-600` |

```tsx
// ❌ 禁止：硬编码颜色
<div className="bg-white text-gray-900 border-gray-200">

// ✅ 正确：语义化颜色
<div className="bg-card text-foreground border">
```

### 移动端覆盖组件 ⚠️ CRITICAL

**Sidebar、Modal、Dropdown 等覆盖层必须使用显式颜色 + `dark:` 前缀**

```tsx
// ❌ 错误：CSS 变量在移动端覆盖层可能失效
<aside className="bg-card text-foreground">

// ✅ 正确：显式颜色
<aside className="bg-white dark:bg-slate-900 text-gray-900 dark:text-gray-100">
```

---

## 💾 数据访问规范

### DataService 统一访问

```typescript
// ✅ 正确：通过 DataService 访问
import { dataService } from '@/services/data/DataService'
await dataService.getAll('profiles')

// ❌ 禁止：直接访问
import { supabase } from '@/lib/supabase/client'  // 禁止
```

### 数据流架构

```
┌─────────────────────────────────────────────────┐
│  UI Layer → Zustand Stores → DataService        │
│                                   │             │
│                    ┌──────────────┼──────────┐  │
│                    │         IndexedDB       │  │
│                    │    • 读: 100% 本地      │  │
│                    │    • 写: 乐观更新       │  │
│                    │    • 同步: Realtime     │  │
│                    └──────────────┼──────────┘  │
│                                   │             │
│                    ┌──────────────┼──────────┐  │
│                    │         Supabase        │  │
│                    │    • Postgres Changes   │  │
│                    └─────────────────────────┘  │
└─────────────────────────────────────────────────┘
```

### SQL 变更集中管理

所有数据库变更 → `app/supabase/setup.sql`（禁止创建独立 SQL 文件）

---

## 🔌 Supabase MCP 操作规范

> 开发过程中对 Supabase 后端的状态读取和写入，**默认使用 MCP 提供的 supabase 工具**。

### 核心原则

1. **实时状态操作** → 使用 MCP `mcp__supabase__*` 系列工具
2. **持久化变更同步** → 所有结构性变更必须同步到 `app/supabase/` 目录

### MCP 工具使用场景

| 场景 | MCP 工具 | 说明 |
|------|----------|------|
| 查询表结构 | `mcp__supabase__list_table` | 获取数据库表列表 |
| 查询列信息 | `mcp__supabase__list_columns` | 获取表字段详情 |
| 执行 SQL | `mcp__supabase__execute_sql` | 查询/修改数据 |
| 用户管理 | `mcp__supabase__list_auth_users` | 认证用户列表 |
| Edge Functions | `mcp__supabase__list_edge_functions` | 查看部署的函数 |
| Storage 管理 | `mcp__supabase__list_storage_buckets` | 存储桶管理 |

### 变更同步规范

```
┌────────────────────────────────────────────────────────────┐
│           Supabase 变更同步流程                             │
│                                                            │
│  MCP 执行变更 ──┬──▶ DDL (表/RLS/函数)                      │
│                │     └──▶ 同步到 app/supabase/setup.sql    │
│                │                                           │
│                └──▶ Edge Function 部署                     │
│                      └──▶ 同步到 app/supabase/functions/   │
└────────────────────────────────────────────────────────────┘
```

### 同步检查清单

| 变更类型 | 需同步位置 | 操作 |
|----------|-----------|------|
| 新建/修改表 | `app/supabase/setup.sql` | 追加 DDL 语句 |
| RLS 策略 | `app/supabase/setup.sql` | 追加 POLICY 语句 |
| PostgreSQL 函数 | `app/supabase/setup.sql` | 追加 FUNCTION 定义 |
| Edge Function | `app/supabase/functions/<name>/` | 更新对应目录代码 |
| 索引/约束 | `app/supabase/setup.sql` | 追加 INDEX/CONSTRAINT |

### 示例工作流

```bash
# 1. 使用 MCP 查询当前表结构
mcp__supabase__list_columns(table_name="profiles")

# 2. 使用 MCP 执行 DDL 变更
mcp__supabase__execute_sql(sql="ALTER TABLE profiles ADD COLUMN bio TEXT;")

# 3. 将变更同步到 setup.sql (⚠️ 必须执行)
# 在 app/supabase/setup.sql 末尾追加:
# -- [2026-01-18] Add bio column to profiles
# ALTER TABLE profiles ADD COLUMN bio TEXT;

# 4. 如果涉及 Edge Function，同步到对应目录
# app/supabase/functions/ai-assistant/index.ts
```

### 禁止事项

```
❌ 使用 MCP 执行 DDL 后不同步到 setup.sql
❌ 直接修改 setup.sql 而不通过 MCP 验证执行
❌ 创建独立的 SQL 迁移文件
❌ Edge Function 仅部署不同步代码
```

---

## 🐛 Bug 修复规范

> 当任务为 Bug 修复时，自动加载此章节。

### 核心原则：先查数据，再改代码

```
发现问题 → 浏览器调试验证 → 定位根因 → 一次性修复 → 验证通过
```

### 调试步骤

1. **使用浏览器 DevTools**
   - Network 面板：检查 API 请求和响应数据
   - Console 面板：查看日志和错误信息

2. **添加临时调试日志**
   ```typescript
   console.log('[Debug] 数据状态:', JSON.stringify(data, null, 2));
   ```

3. **常见数据完整性问题**

| 问题场景 | 症状 | 排查方法 |
|----------|------|----------|
| 外键引用失效 | 关联查询返回 `null` | 检查被引用记录是否存在 |
| 数组包含无效 ID | 批量查询返回部分数据 | 对比请求 ID 和响应数据 |
| 字段为空 | 功能不生效 | 检查数据库记录实际值 |

### 防御性编码

```typescript
// ❌ 假设数据一定有效
const coverUrl = await getPhotoUrl(album.photoIds[0]);

// ✅ 遍历找到第一个有效项
for (const photoId of album.photoIds) {
  const url = photoUrlMap.get(photoId);
  if (url) {
    album.coverPhotoUrl = url;
    break;
  }
}
```

---

## ✅ 开发工作流

### 完整流程

```
需求/Bug → BMAD 方案讨论(可选) → Epic/Story/Task → 🔴测试先行 → 🟢代码实现 → 🔵重构优化 → 质量验证 → 人工审查 → 上线
```

### Phase 1: TDD 测试先行 🔴

```bash
npm run test:watch    # 监听模式（开发时）
```

**测试文件命名**: `*.test.ts` 或 `*.spec.ts`，与源文件同目录

```typescript
// app/src/services/example.test.ts
import { describe, it, expect, vi } from 'vitest'

describe('ExampleService', () => {
  it('应该完成预期功能', async () => {
    // Arrange - 准备测试数据
    // Act - 执行待测函数
    // Assert - 验证结果
  })
})
```

### Phase 2: 代码实现 🟢

遵循技术约束完成代码实现。详见 `references/coding-constraints.md`。

### Phase 3: 重构优化 🔵

```
✅ 测试全部通过后再重构
✅ 每次小步重构后运行测试
✅ 提取公共方法、消除重复

❌ 不要在重构时添加新功能
```

### Phase 4: 质量验证

```bash
# 一键质量验证
./scripts/quality_check.sh

# 核心校验（不含 E2E）
npm run ai:check

# 或手动执行
npm run lint:check        # ESLint 检查
npm run format:check      # Prettier 格式检查
npm run type-check        # TypeScript 类型检查
npm run test              # 单元测试
npm run test:e2e:headless # E2E 回归测试
npm run build             # 构建验证
```

| 检查项 | 命令 | 通过标准 |
|--------|------|----------|
| ESLint | `npm run lint:check` | 0 错误 |
| TypeScript | `npm run type-check` | 0 错误 |
| 单元测试 | `npm run test` | 全部通过 |
| E2E 测试 | `npm run test:e2e:headless` | 全部通过 |
| 构建 | `npm run build` | 成功 |

---

## 🚫 禁止清单

### 编码禁止

| 类别 | 禁止事项 |
|------|----------|
| **Tailwind** | `*-opacity-*` 语法、`bg-gradient-to-*` |
| **颜色** | 硬编码颜色如 `bg-white`、`text-gray-900`、`bg-blue-600` |
| **覆盖层** | Sidebar/Modal/Dropdown 使用 CSS 变量颜色 |
| **数据访问** | 直接导入 `supabase` client |
| **文件管理** | 创建独立 SQL 迁移文件、创建新文档文件 |
| **MCP Supabase** | 执行 DDL 后不同步 `setup.sql`、Edge Function 部署后不同步代码 |
| **TypeScript** | 使用 `any` 类型 |
| **React Hooks** | `useCallback` 作为 `useEffect` 依赖（无 ref guard） |
| **Agent** | 在 A2UI 中使用未注册的组件类型 |
| **Agent** | 直接调用 LLM API（必须通过 ai-assistant Edge Function） |

### TDD 禁止

| 禁止事项 | 后果 |
|----------|------|
| 先写代码再补测试 | 代码设计不佳，难以测试 |
| 提交无测试覆盖的新功能 | 回归风险，无法保证质量 |
| 不运行测试就提交代码 | CI 失败，阻塞其他人 |
| 忽略测试失败继续开发 | 问题堆积，修复成本增加 |

---

## 📚 参考文档

### 按需加载

| 文档 | 内容 | 触发关键词 |
|------|------|------------|
| `references/tdd-workflow.md` | TDD 完整流程、测试编写规范 | vitest, cypress, test |
| `references/coding-constraints.md` | 编码约束、React Hooks 反模式 | useEffect, hooks, ltree |
| `references/project-structure.md` | 项目结构、NPM 命令 | structure, npm |
| `references/db-sync-checklist.md` | 数据库一致性检查 | CHECK, migration, sql |
| `references/troubleshooting.md` | 常见问题与解决方案 | error, fix, debug |

### 外部文档

| 文档 | 用途 |
|------|------|
| `docs/Architecture.md` | 完整系统架构 |
| `docs/Epics.yaml` | 项目进度追踪 |
| `AGENTS.md` | AI Coding 快速指南 |
| `app/supabase/SUPABASE_COOKBOOK.md` | 数据库操作手册 |

### BMAD 方法论参考 (可选)

当需要规范化需求分析、方案设计时，可参考 BMAD 工作流：

| Agent | 用途 |
|-------|------|
| `_bmad/bmm/agents/dev.md` (Amelia) | 高级研发专家，精准执行 Story |
| `_bmad/bmm/agents/architect.md` | 系统架构师，技术方案设计 |
| `_bmad/bmm/workflows/` | 标准化工作流 |

---

## 🚀 快速命令

```bash
# 开发
npm run dev           # 启动开发服务器
npm run dev:test      # 测试模式 (MSW mock)

# TDD 测试
npm run test          # 运行单元测试
npm run test:watch    # 监听模式（开发时推荐）
npm run coverage      # 生成覆盖率报告

# E2E 测试
npm run cypress:open  # 在已启动 dev:test 时交互运行 Cypress
npm run test:e2e      # 启动 dev:test 后无头运行 E2E
npm run test:e2e:headless  # Cypress 无头模式 (CI)

# 质量检查
npm run lint          # ESLint 检查并修复
npm run format        # Prettier 格式化
npm run type-check    # TypeScript 类型检查
npm run build         # 生产构建

# 一键质量验证
npm run ai:check
./scripts/quality_check.sh
```

### 推荐工作流

```bash
# 1. 启动测试监听（新终端窗口）
npm run test:watch

# 2. 启动开发服务器（另一个终端窗口）
npm run dev:test

# 3. 🔴 编写测试 → 看到红色失败
# 4. 🟢 实现代码 → 看到绿色通过
# 5. 🔵 重构优化
# 6. 提交前运行完整质量检查
./scripts/quality_check.sh
```
