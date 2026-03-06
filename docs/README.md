# OPC-Starter 技术文档

> 版本: v1.0.0 | 更新: 2026-01-13

## 📁 文档结构

```
docs/
├── README.md           # 本文档 - 入口导航
├── Architecture.md     # 系统架构设计
├── DESIGN_TOKENS.md    # 设计系统 Token
└── Epics.yaml          # Epic 清单与项目进度
```

## 🔧 Supabase 配置

- **操作手册**: `app/supabase/SUPABASE_COOKBOOK.md`
- **数据库脚本**: `app/supabase/setup.sql`
- **Edge Functions**: `app/supabase/functions/`

## 🎯 当前状态

- **版本**: v1.0.0
- **定位**: AI 亲和的 React Boilerplate
- **技术栈**: React 19 + TypeScript 5.9 + Vite 7 + Supabase + Tailwind CSS 4.1

## 📚 快速参考

| 任务 | 参考文档 |
|------|---------|
| 了解架构 | `Architecture.md` |
| AI Coding 规范 | `AGENTS.md` (根目录) |
| 设计系统 | `DESIGN_TOKENS.md` |
| 数据库操作 | `app/supabase/SUPABASE_COOKBOOK.md` |
| 项目进度 | `Epics.yaml` |

## 🤖 AI 快速导航

| 目标 | 关键入口 | 说明 |
|------|---------|------|
| 快速启动本地环境 | `README.md` | 优先使用根目录 `npm run dev:test` |
| 理解运行链路 | `app/src/main.tsx` → `app/src/App.tsx` → `app/src/config/routes.tsx` | 应用初始化、路由和布局的主入口 |
| 找页面挂载位置 | `app/src/components/layout/MainLayout/index.tsx` | Header、Sidebar、`AgentWindow`、`Outlet` 都从这里进入 |
| 修改数据层 | `app/src/services/data/DataService.ts` | 数据访问统一入口 |
| 修改 Agent 能力 | `app/src/components/agent/`、`app/src/lib/agent/` | UI、SSE、工具执行链路 |
| 跑核心校验 | `package.json`、`scripts/quality_check.sh` | 根目录可直接执行 `npm run ai:check` 或 `./scripts/quality_check.sh` |

## 🚀 核心能力

| 模块 | 描述 |
|------|------|
| 认证系统 | Supabase Auth 集成 |
| 组织架构 | 多层级团队、成员管理 |
| Agent Studio | A2UI 动态 UI + 自然语言驱动 |
| 数据同步 | IndexedDB + Realtime 实时同步 |
