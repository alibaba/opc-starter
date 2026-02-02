# OPC-Starter 项目结构

> 一人公司启动器 - AI 亲和的 React Boilerplate

## 目录结构

```
opc-starter/
├── app/                          # 主应用
│   ├── src/
│   │   ├── auth/                 # 认证模块
│   │   │   ├── components/       # 认证组件
│   │   │   └── pages/            # 认证页面
│   │   ├── components/
│   │   │   ├── agent/            # Agent Studio ⭐
│   │   │   │   ├── a2ui/         # A2UI 渲染系统
│   │   │   │   │   ├── components/  # A2UI 业务组件
│   │   │   │   │   ├── registry.ts  # 组件白名单
│   │   │   │   │   └── A2UIRenderer.tsx
│   │   │   │   ├── AgentWindow.tsx
│   │   │   │   ├── AgentThread.tsx
│   │   │   │   └── AgentInput.tsx
│   │   │   ├── business/         # 业务组件
│   │   │   ├── layout/           # 布局组件
│   │   │   │   ├── Header/
│   │   │   │   ├── MainLayout/
│   │   │   │   └── Sidebar/
│   │   │   ├── organization/     # 组织架构
│   │   │   └── ui/               # 基础 UI (shadcn)
│   │   ├── pages/                # 页面组件
│   │   │   ├── DashboardPage.tsx
│   │   │   ├── ProfilePage.tsx
│   │   │   └── SettingsPage.tsx
│   │   ├── services/
│   │   │   ├── data/             # DataService (核心) ⭐
│   │   │   │   └── DataService.ts
│   │   │   ├── api/              # API 服务
│   │   │   └── storage/          # 存储服务
│   │   ├── stores/               # Zustand Store
│   │   │   ├── useAuthStore.ts
│   │   │   ├── useProfileStore.ts
│   │   │   ├── useAgentStore.ts
│   │   │   └── useUIStore.ts
│   │   ├── lib/
│   │   │   ├── agent/            # Agent 客户端 ⭐
│   │   │   │   ├── sseClient.ts     # SSE 流客户端
│   │   │   │   ├── toolExecutor.ts  # 工具执行器
│   │   │   │   └── tools/           # 前端工具
│   │   │   │       ├── registry.ts
│   │   │   │       ├── navigation/
│   │   │   │       └── context/
│   │   │   ├── reactive/         # 响应式适配器
│   │   │   └── supabase/         # Supabase 客户端
│   │   │       └── client.ts
│   │   ├── hooks/                # 自定义 Hooks
│   │   │   ├── useAgentChat.ts
│   │   │   ├── useOrganization.ts
│   │   │   ├── useSyncStatus.ts
│   │   │   └── useTheme.ts
│   │   ├── types/                # TypeScript 类型
│   │   │   ├── a2ui.ts
│   │   │   ├── agent.ts
│   │   │   ├── auth.ts
│   │   │   └── person.ts
│   │   ├── config/               # 配置
│   │   │   ├── routes.tsx
│   │   │   └── constants.ts
│   │   ├── utils/                # 工具函数
│   │   └── mocks/                # MSW Mock
│   │       ├── handlers/
│   │       │   ├── authHandlers.ts
│   │       │   ├── agentHandlers.ts
│   │       │   └── supabaseRestHandlers.ts
│   │       └── data/
│   └── supabase/
│       ├── functions/
│       │   └── ai-assistant/    # Agent SSE 网关 ⭐
│       │       ├── index.ts
│       │       ├── tools.ts
│       │       └── prompts/
│       ├── setup.sql             # 数据库脚本 (所有变更集中于此)
│       └── SUPABASE_COOKBOOK.md
├── cypress/                      # E2E 测试
│   ├── e2e/
│   ├── fixtures/
│   │   └── users.json            # 测试用户凭证
│   └── support/
├── docs/
│   ├── Architecture.md           # 系统架构
│   └── Epics.yaml                # 项目进度
├── _bmad/                        # BMAD 方法论 (可选参考)
│   ├── bmm/agents/               # Agent 角色定义
│   └── bmm/workflows/            # 标准化工作流
├── .qoder/skills/                # Qoder 技能
│   └── auto-develop/             # 当前技能
├── AGENTS.md                     # AI Coding 快速指南
└── package.json
```

## 核心文件

| 文件 | 职责 |
|------|------|
| `app/src/services/data/DataService.ts` | 统一数据访问层，所有数据操作必须通过此服务 |
| `app/supabase/setup.sql` | 所有数据库变更集中管理 |
| `app/src/lib/agent/toolExecutor.ts` | Agent 工具前端执行器 |
| `app/supabase/functions/ai-assistant/` | Agent SSE 网关后端 |
| `docs/Architecture.md` | 完整系统架构文档 |
| `AGENTS.md` | AI Coding 快速指南 |

## 核心 Store

| Store | 职责 |
|-------|------|
| `useAuthStore` | 用户认证、会话管理 |
| `useProfileStore` | 用户信息管理 |
| `useAgentStore` | Agent 对话状态 |
| `useUIStore` | UI 状态（侧边栏、主题等） |

## 文档更新策略

| 内容类型 | 目标文件 |
|----------|----------|
| SQL 变更 | `app/supabase/setup.sql` |
| 数据库操作指南 | `app/supabase/SUPABASE_COOKBOOK.md` |
| 项目进度 | `docs/Epics.yaml` |
| 系统架构 | `docs/Architecture.md` |

## 扩展指南

### 添加新页面

1. 在 `app/src/pages/` 创建页面组件
2. 在 `app/src/config/routes.tsx` 添加路由
3. 在 `app/src/components/layout/MainLayout/` 添加导航入口

### 添加新数据实体

1. 在 `app/src/types/` 定义类型
2. 在 `app/src/services/data/adapters/` 创建适配器
3. 在 `app/src/stores/` 创建 Zustand Store
4. 更新 `app/supabase/setup.sql` 添加表结构

### 添加新 Agent Tool

1. **后端**: 在 `ai-assistant/tools.ts` 添加工具定义 (OpenAI 格式)
2. **前端**: 在 `app/src/lib/agent/tools/` 创建工具目录
3. **注册**: 在 `app/src/lib/agent/tools/registry.ts` 注册
4. **System Prompt**: 在 `ai-assistant/prompts/` 添加使用说明

### 添加新 A2UI 组件

1. 在 `app/src/components/agent/a2ui/components/` 创建组件
2. 在 `registry.ts` 注册组件 (白名单模式)
3. 在 `app/src/types/a2ui.ts` 添加类型定义

## NPM Scripts

```bash
# 开发
npm run dev           # 启动开发服务器
npm run dev:test      # 测试模式 (MSW mock)

# 测试
npm run test          # 单元测试
npm run test:watch    # 监听模式
npm run coverage      # 覆盖率报告
npm run test:e2e      # Cypress 交互模式
npm run test:e2e:headless  # Cypress 无头模式

# 质量检查
npm run lint          # ESLint 检查并修复
npm run lint:check    # ESLint 仅检查
npm run format        # Prettier 格式化
npm run format:check  # Prettier 检查
npm run type-check    # TypeScript 类型检查

# 构建
npm run build         # 生产构建
npm run preview       # 预览构建结果
```
