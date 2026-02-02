# OPC-Starter 系统架构

> 一人公司启动器 - AI 亲和的 React Boilerplate

## 技术栈

| 技术 | 版本 | 说明 |
|------|------|------|
| React | 19.1 | 最新稳定版 |
| TypeScript | 5.9 | 严格类型 |
| Vite | 7.1 | 构建工具 |
| **Tailwind CSS** | **4.1** | ⚠️ 必须使用 v4 语法 |
| Supabase | 2.80 | Auth + Storage + Realtime + Edge Functions |
| Zustand | 5.0 | 状态管理 |
| Vitest | 4.0 | 单元测试框架 |
| Cypress | 15.7 | E2E 测试框架 |
| **Qwen-Plus** | via 百炼 API | Agent LLM（通义千问） |
| **A2UI** | v0.8 | Agent 动态 UI 协议 |

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

## 数据流架构

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

## Agent Studio 架构

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

### Agent 核心组件

| 组件 | 位置 | 职责 |
|------|------|------|
| AgentWindow | `app/src/components/agent/` | 悬浮对话窗口 |
| useAgentChat | `app/src/hooks/` | 对话状态管理 |
| SSE Client | `app/src/lib/agent/` | 流式通信客户端 |
| Tool Executor | `app/src/lib/agent/` | 本地工具执行器 |
| A2UI Renderer | `app/src/components/agent/a2ui/` | 动态 UI 渲染器 |
| ai-assistant | `app/supabase/functions/` | SSE 网关 Edge Function |

## 核心模块

### 1. 认证系统 (Auth)

- Supabase Auth 集成
- JWT Token 管理
- 会话持久化

### 2. 组织架构 (Organization)

- 多层级组织结构
- 角色权限管理 (admin/manager/member)
- RLS 策略保护

### 3. 数据同步层 (DataService)

- 统一数据访问入口
- IndexedDB 本地缓存
- Supabase Realtime 同步
- 乐观更新模式

## 数据访问模式

| 操作 | 策略 |
|------|------|
| 读取 | IndexedDB 本地优先 |
| 写入 | 乐观更新 + Realtime 同步 |
| 同步 | Supabase Postgres Changes |

**所有数据操作必须通过 `DataService`**

## Edge Functions

| Function | 职责 |
|----------|------|
| `ai-assistant` | Agent SSE 网关，LLM 交互、工具调用代理 |

## 核心 Store

| Store | 职责 |
|-------|------|
| `useAuthStore` | 用户认证、会话管理 |
| `useProfileStore` | 用户信息管理 |
| `useAgentStore` | Agent 对话状态 |
| `useUIStore` | UI 状态 |

## RLS 策略

使用 `SECURITY DEFINER` 函数处理层级数据，避免无限递归：

```sql
CREATE FUNCTION get_user_accessible_organizations(user_uuid UUID)
RETURNS TABLE(organization_id UUID)
SECURITY DEFINER;
```
