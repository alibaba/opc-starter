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

## 🚀 核心能力

| 模块 | 描述 |
|------|------|
| 认证系统 | Supabase Auth 集成 |
| 组织架构 | 多层级团队、成员管理 |
| Agent Studio | A2UI 动态 UI + 自然语言驱动 |
| 数据同步 | IndexedDB + Realtime 实时同步 |
