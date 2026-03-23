# OPC-Starter 项目文档索引

> 生成日期: 2026-03-19 | 项目类型: Web Application (Monolith)

## 项目概述

**OPC-Starter (一人公司启动器)** 是一个 AI 亲和的 React Boilerplate，专为使用 Cursor、Qoder 等 AI Coding 工具的开发者设计。

### 快速参考

| 属性 | 值 |
|------|------|
| **类型** | Web Application (SPA) |
| **主要语言** | TypeScript 5.9 |
| **前端框架** | React 19.1 |
| **构建工具** | Vite 7.1 |
| **样式方案** | Tailwind CSS 4.1 |
| **后端服务** | Supabase 2.80 (BaaS) |
| **状态管理** | Zustand 5.0 |
| **AI 集成** | Qwen-Plus (百炼) + A2UI |

### 架构模式

```
React SPA (前端) + Supabase (BaaS) + Edge Functions (无服务器)
```

## 文档导航

### 核心文档

| 文档 | 说明 | 路径 |
|------|------|------|
| 项目说明 | 项目介绍和快速入门 | [README.md](../README.md) |
| AI Coding 指南 | AI 开发规范和迭代地图 | [AGENTS.md](../AGENTS.md) |
| 系统架构 | 技术栈和模块关系 | [Architecture.md](./Architecture.md) |
| API 文档 | AI Assistant Edge Function 接口 | [API.md](./API.md) |
| 设计系统 | 设计令牌规范 | [DESIGN_TOKENS.md](./DESIGN_TOKENS.md) |
| 编码规范 | 命名、分层、错误处理 | [CONVENTIONS.md](./CONVENTIONS.md) |

### Supabase 相关

| 文档 | 说明 | 路径 |
|------|------|------|
| 数据库操作手册 | Migration、RLS、Edge Functions | [app/supabase/SUPABASE_COOKBOOK.md](../app/supabase/SUPABASE_COOKBOOK.md) |
| 数据库 Schema | 完整表结构 | [app/supabase/setup.sql](../app/supabase/setup.sql) |
| Migration 清单 | 迁移版本管理 | [app/supabase/migration-manifest.yaml](../app/supabase/migration-manifest.yaml) |

### 项目管理

| 文档 | 说明 | 路径 |
|------|------|------|
| Epic 规划 | 项目进度和迭代计划 | [Epics.yaml](./Epics.yaml) |
| 贡献指南 | 开发流程和代码规范 | [CONTRIBUTING.md](../CONTRIBUTING.md) |

## 源代码结构

```
app/src/
├── main.tsx              # 应用入口
├── App.tsx               # 根组件
├── auth/                 # 认证模块 (登录/注册)
├── components/           # React 组件
│   ├── ui/               # 基础 UI (shadcn 风格)
│   ├── agent/            # Agent Studio (A2UI)
│   ├── business/         # 业务组件
│   ├── layout/           # 布局组件
│   ├── organization/     # 组织架构
│   └── skills/           # Skills 组件
├── config/               # 路由配置
├── hooks/                # 自定义 Hooks
├── lib/                  # 库封装
│   ├── agent/            # Agent 核心逻辑
│   ├── reactive/         # 响应式数据层
│   └── supabase/         # Supabase 客户端
├── pages/                # 页面组件
├── services/             # 服务层
│   ├── data/             # DataService (核心)
│   ├── api/              # API 客户端
│   ├── organization/     # 组织服务
│   ├── skill/            # Skills 服务
│   ├── db/               # IndexedDB
│   └── storage/          # Supabase Storage
├── stores/               # Zustand 状态管理
├── types/                # TypeScript 类型
└── utils/                # 工具函数
```

## 技术栈详情

### 前端

| 技术 | 版本 | 用途 |
|------|------|------|
| React | 19.1 | UI 框架 |
| TypeScript | 5.9 | 类型安全 |
| Vite | 7.1 | 构建工具 |
| Tailwind CSS | 4.1 | 样式方案 |
| Zustand | 5.0 | 状态管理 |
| React Router | 7.9 | 路由 |
| React Hook Form | 7.66 | 表单处理 |
| Zod | 4.1 | 运行时校验 |
| Radix UI | - | 无障碍组件 |
| Lucide React | 0.553 | 图标库 |

### 后端 (Supabase)

| 服务 | 用途 |
|------|------|
| Auth | 用户认证 (JWT) |
| PostgreSQL | 数据存储 (RLS 策略) |
| Storage | 文件存储 |
| Realtime | 实时同步 |
| Edge Functions | 无服务器函数 |

### AI 集成

| 组件 | 说明 |
|------|------|
| Qwen-Plus | Agent LLM (百炼 API) |
| A2UI | 动态 UI 协议 |
| Edge Function | ai-assistant 网关 |

## 开发指南

### 快速启动

```bash
# 安装依赖
npm --prefix app install

# MSW Mock 模式 (推荐，无需真实 Supabase)
npm run dev:test

# 真实 Supabase 模式
cp app/env.local.example app/.env.local
npm run dev
```

### 测试账号 (Mock 模式)

| 邮箱 | 密码 |
|------|------|
| `test@example.com` | `888888` |

### 常用命令

| 命令 | 说明 |
|------|------|
| `npm run dev:test` | Mock 模式开发 |
| `npm run build` | 构建生产版本 |
| `npm run lint` | ESLint 检查 |
| `npm run type-check` | TypeScript 检查 |
| `npm test` | 单元测试 |
| `npm run test:e2e:headless` | E2E 测试 |
| `npm run ai:check` | 完整质量检查 |

## 核心模块

### 认证系统

- **路径**: `src/auth/`
- **技术**: Supabase Auth + JWT
- **组件**: LoginForm, RegisterForm, ProtectedRoute

### 组织架构

- **路径**: `src/components/organization/`
- **功能**: 多层级组织、角色权限、团队管理
- **数据表**: organizations, organization_memberships

### Agent Studio

- **路径**: `src/components/agent/`, `src/lib/agent/`
- **功能**: AI 对话、工具调用、A2UI 动态 UI
- **Edge Function**: ai-assistant

### 数据同步层

- **路径**: `src/services/data/`
- **功能**: IndexedDB 缓存 + Supabase Realtime
- **特性**: 离线支持、冲突解决、乐观更新

### Skills 系统

- **路径**: `src/pages/skills/`, `src/services/skill/`
- **功能**: 技能发布、搜索、收藏、下载
- **数据表**: skills, skill_versions, skill_downloads

## 部署

### CI/CD

- **平台**: GitHub Actions
- **流程**: lint → test → build
- **配置**: `.github/workflows/`

### Docker

- **Dockerfile**: `app/Dockerfile`
- **模式**: dev (5173), preview (4173)

### 阿里云 ESA

- **指南**: `ALIYUN-DEPLOY.md`
- **配置**: `app/esa.jsonc`

## 扩展指南

### 添加新页面

1. 在 `src/pages/` 创建页面组件
2. 在 `src/config/routes.tsx` 添加路由
3. 在 `src/components/layout/Sidebar/` 添加导航入口

### 添加新数据实体

1. 在 `src/types/` 定义类型
2. 在 `src/services/data/adapters/` 创建适配器
3. 在 `src/stores/` 创建 Zustand Store
4. 在 `app/supabase/migrations/` 添加迁移

### 添加新 Agent Tool

1. **后端**: 在 `ai-assistant/tools.ts` 添加工具定义
2. **前端**: 在 `src/lib/agent/tools/` 创建工具目录
3. **注册**: 在 `src/lib/agent/tools/registry.ts` 注册

---

*此文档由 BMAD Document Project Workflow 自动生成*
