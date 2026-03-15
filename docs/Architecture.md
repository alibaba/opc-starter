# OPC-Starter 系统架构

> 版本: v1.1.0 | 更新: 2026-03-07

## 项目定位

OPC-Starter (一人公司启动器) 是一个 AI 亲和的 React Boilerplate，专为使用 Cursor、Qoder 等 AI Coding 工具的开发者设计。

## 技术栈

| 技术 | 版本 | 说明 |
|------|------|------|
| React | 19.1 | 最新稳定版 |
| TypeScript | 5.9 | 严格类型 |
| Vite | 7.1 | 构建工具 |
| Tailwind CSS | 4.1 | v4 语法 |
| Supabase | 2.80 | Auth + Storage + Realtime + Edge Functions |
| Zustand | 5.0 | 状态管理 |
| Zod | 4.1 | 运行时类型校验 |
| Qwen-Plus | via 百炼 API | Agent LLM（通义千问） |

## 架构图

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                            前端 (React 19)                                       │
│  UI 组件 → Zustand Store → DataService → IndexedDB                              │
└─────────────────────────────────────────────────────────────────────────────────┘
                               ↓ ↑
┌─────────────────────────────────────────────────────────────────────────────────┐
│                         Supabase (BaaS 平台)                                     │
│            Auth + PostgreSQL + Storage + Edge Functions + Realtime              │
└─────────────────────────────────────────────────────────────────────────────────┘
                               ↓ ↑
┌─────────────────────────────────────────────────────────────────────────────────┐
│                      百炼 AI API (OpenAI 兼容)                                   │
│                          Qwen-Plus Agent                                         │
└─────────────────────────────────────────────────────────────────────────────────┘
```

## 核心模块

### 1. 认证系统 (Auth)

```
src/auth/
├── AuthContext.tsx       # 认证上下文
├── AuthProvider.tsx      # 认证提供者
└── ProtectedRoute.tsx    # 路由守卫
```

- Supabase Auth 集成
- JWT Token 管理
- 会话持久化

### 2. 组织架构 (Organization)

```
src/components/organization/
├── OrgTree.tsx                 # 组织架构树
├── OrgTreeSelector.tsx         # 组织选择器下拉
├── OrganizationBreadcrumb.tsx  # 组织路径面包屑
├── TeamMembersList.tsx         # 团队成员列表
├── AddMemberDialog.tsx         # 添加成员对话框
├── CreateOrgDialog.tsx         # 创建组织/团队对话框
├── AssignTeamDialog.tsx        # 分配团队对话框
└── ChangeRoleDialog.tsx        # 修改角色对话框
```

- 多层级组织结构
- 角色权限管理 (admin/manager/member)
- RLS 策略保护

### 3. Agent Studio

```
src/components/agent/
├── AgentWindow.tsx           # 悬浮对话框
├── AgentThread.tsx           # 对话列表
├── AgentInput.tsx            # 输入组件
└── a2ui/                     # A2UI 渲染系统
    ├── registry.ts           # 组件注册表
    ├── A2UIRenderer.tsx      # 渲染器
    └── components/           # A2UI 业务组件

src/lib/agent/
├── sseClient.ts              # SSE 流客户端
├── toolExecutor.ts           # 工具执行器
└── tools/                    # 工具定义
    ├── registry.ts           # 工具注册
    ├── navigation/           # 导航工具
    └── context/              # 上下文工具
```

#### Agent 架构流程

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

### 4. 数据同步层 (DataService)

```
src/services/data/
├── DataService.ts            # 核心服务（统一数据访问入口）
├── network/                  # 网络状态管理
│   └── networkManager.ts
├── sync/                     # 同步引擎
│   ├── syncManager.ts
│   └── syncOrchestrator.ts
├── offline-queue/            # 离线队列
│   └── offlineQueueManager.ts
├── conflict/                 # 冲突解决
│   └── conflictResolver.ts
├── realtime/                 # Realtime 订阅
│   └── realtimeManager.ts
├── remote/                   # 远程 API 封装
│   └── remoteApi.ts
└── adapters/                 # 数据适配器
    └── personAdapter.ts
```

#### 数据流原则: Cache + Realtime

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                    简化架构: Cache + Realtime                                    │
├─────────────────────────────────────────────────────────────────────────────────┤
│  UI Layer → Zustand Stores → DataService                                        │
│                                    │                                             │
│                    ┌───────────────┼───────────────┐                            │
│                    │               ▼               │                            │
│                    │         IndexedDB             │                            │
│                    │  ┌─────────────────────────┐  │                            │
│                    │  │ profiles│organizations │  │                            │
│                    │  └─────────────────────────┘  │                            │
│                    │               │               │                            │
│                    │         CacheManager          │                            │
│                    │    • 读: 100% 本地            │                            │
│                    │    • 写: 乐观更新             │                            │
│                    │    • 同步: Realtime          │                            │
│                    └───────────────┼───────────────┘                            │
│                                    │                                             │
│                    ┌───────────────┼───────────────┐                            │
│                    │         Supabase              │                            │
│                    │  • Postgres Changes (全表)    │                            │
│                    │  • profiles/organizations    │                            │
│                    └───────────────────────────────┘                            │
└─────────────────────────────────────────────────────────────────────────────────┘
```

## 目录结构

```
app/
├── src/
│   ├── auth/              # 认证模块
│   ├── components/        # React 组件
│   │   ├── agent/         # Agent Studio
│   │   ├── business/      # 业务组件（头像、同步状态等）
│   │   ├── layout/        # 布局组件（Header/Sidebar/MainLayout）
│   │   ├── organization/  # 组织架构
│   │   └── ui/            # 基础 UI (shadcn)
│   ├── config/            # 路由、常量配置
│   ├── pages/             # 页面组件
│   ├── services/          # 服务层
│   │   ├── api/           # API 客户端
│   │   ├── cache/         # 缓存服务
│   │   ├── data/          # DataService（核心数据访问层）
│   │   ├── db/            # IndexedDB 封装
│   │   ├── organization/  # 组织服务（查询 + 变更）
│   │   └── storage/       # 存储服务
│   ├── stores/            # Zustand Store
│   ├── lib/               # 工具库
│   │   ├── agent/         # Agent 客户端（SSE/工具）
│   │   ├── reactive/      # 响应式数据层
│   │   └── supabase/      # Supabase 客户端 & 类型
│   ├── hooks/             # 自定义 Hooks
│   ├── types/             # TypeScript 类型
│   ├── mocks/             # MSW Mock 处理器
│   └── utils/             # 工具函数
├── supabase/
│   ├── functions/         # Edge Functions
│   │   └── ai-assistant/  # Agent 网关（多模块）
│   ├── setup.sql          # 数据库初始化
│   └── SUPABASE_COOKBOOK.md
└── cypress/               # E2E 测试
```

## 数据库 Schema

### 核心表

```sql
-- 用户信息
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  full_name TEXT,
  avatar_url TEXT,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 组织架构
CREATE TABLE organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  display_name TEXT NOT NULL,
  parent_id UUID REFERENCES organizations(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 组织成员
CREATE TABLE organization_memberships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id),
  organization_id UUID REFERENCES organizations(id),
  role TEXT CHECK (role IN ('admin', 'manager', 'member')),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, organization_id)
);
```

## Edge Functions

| Function | 模块 | 职责 |
|----------|------|------|
| `ai-assistant` | `index.ts` | 入口，路由与认证 |
| | `agentLoop.ts` | Agent 循环，多轮工具调用 |
| | `tools.ts` | 工具定义（OpenAI 格式） |
| | `sse.ts` | SSE 流式响应、系统提示词 |
| | `types.ts` | TypeScript 类型定义 |

## RLS 策略

使用 `SECURITY DEFINER` 函数处理层级数据，避免无限递归：

```sql
CREATE FUNCTION get_user_accessible_organizations(user_uuid UUID)
RETURNS TABLE(organization_id UUID)
SECURITY DEFINER;
```

## 核心 Store

| Store | 职责 |
|-------|------|
| `useAuthStore` | 用户认证、会话管理 |
| `useProfileStore` | 用户信息管理 |
| `useAgentStore` | Agent 对话状态 |
| `useUIStore` | UI 状态（侧边栏、主题等） |

## 扩展指南

### 添加新页面

1. 在 `src/pages/` 创建页面组件
2. 在 `src/config/routes.tsx` 添加路由
3. 在 `src/components/layout/MainLayout.tsx` 添加导航入口

### 添加新数据实体

1. 在 `src/types/` 定义类型
2. 在 `src/services/data/adapters/` 创建适配器
3. 在 `src/stores/` 创建 Zustand Store
4. 更新 `app/supabase/setup.sql` 添加表结构

### 添加新 Agent Tool

1. **后端**: 在 `ai-assistant/tools.ts` 添加工具定义
2. **前端**: 在 `src/lib/agent/tools/` 创建工具目录
3. **注册**: 在 `src/lib/agent/tools/registry.ts` 注册

详见 [AGENTS.md](/AGENTS.md) AI Coding 指南。
