# OPC-Starter 🚀

> 一人公司启动器 - AI-Friendly React Boilerplate

[![License: AGPL-3.0](https://img.shields.io/badge/license-AGPL--3.0-blue)](https://opensource.org/license/agpl-v3)
[![React](https://img.shields.io/badge/React-19.1-blue.svg)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue.svg)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind%20CSS-4.1-38B2AC.svg)](https://tailwindcss.com/)
[![Supabase](https://img.shields.io/badge/Supabase-2.80-3ECF8E.svg)](https://supabase.com/)

专为使用 **Cursor**、**Qoder** 等 AI Coding 工具的开发者设计的现代化 React 启动模板。

## ✨ 特性

- 🤖 **AI Coding 友好** - 完整的 BMAD 方法论支持，AI 可理解的代码结构
- ⚡ **现代化技术栈** - React 19 + TypeScript 5.9 + Vite 7 + Tailwind CSS 4.1
- 🔐 **开箱即用认证** - Supabase Auth 集成
- 🏢 **组织架构管理** - 多层级团队、成员权限
- 🤖 **Agent Studio** - A2UI 动态 UI 协议，自然语言驱动
- 📦 **数据同步** - IndexedDB 缓存 + Supabase Realtime
- 🎨 **精美 UI 组件** - 基于 Radix UI + shadcn/ui 风格

## 🚀 快速开始

### 环境要求

- Node.js >= 20.x
- npm >= 10.x
- Supabase 账户 (用于 Auth 和 Storage)

### 安装

```bash
# 克隆仓库
git clone https://github.com/your-username/opc-starter.git
cd opc-starter

# 进入应用目录
cd app

# 安装依赖
npm install

# 复制环境变量
cp env.local.example .env.local

# 启动开发服务器
npm run dev
```

### 环境变量

在 `.env.local` 中配置：

```bash
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_DASHSCOPE_API_KEY=your_dashscope_api_key  # 可选，用于 Agent LLM
```

## 📁 项目结构

```
opc-starter/
├── app/                     # 应用主目录
│   ├── src/
│   │   ├── auth/            # 认证模块
│   │   ├── components/      # React 组件
│   │   │   ├── agent/       # Agent Studio (A2UI)
│   │   │   ├── business/    # 业务组件
│   │   │   ├── layout/      # 布局组件
│   │   │   ├── organization/ # 组织架构组件
│   │   │   └── ui/          # 基础 UI 组件
│   │   ├── hooks/           # 自定义 Hooks
│   │   ├── lib/             # 库封装
│   │   │   ├── agent/       # Agent 核心逻辑
│   │   │   ├── reactive/    # 响应式数据层
│   │   │   └── supabase/    # Supabase 客户端
│   │   ├── pages/           # 页面组件
│   │   ├── services/        # 服务层
│   │   │   └── data/        # DataService (同步核心)
│   │   ├── stores/          # Zustand 状态管理
│   │   ├── types/           # TypeScript 类型
│   │   └── utils/           # 工具函数
│   └── supabase/
│       ├── functions/       # Edge Functions
│       └── setup.sql        # 数据库 Schema
├── _bmad/                   # BMAD 方法论配置
├── docs/                    # 项目文档
└── AGENTS.md               # AI Coding 指南
```

## 🛠️ 技术栈

| 技术 | 版本 | 说明 |
|------|------|------|
| React | 19.1 | 最新稳定版 |
| TypeScript | 5.9 | 严格类型检查 |
| Vite | 7.1 | 极速构建 |
| Tailwind CSS | 4.1 | v4 新语法 |
| Supabase | 2.80 | Auth + Storage + Realtime |
| Zustand | 5.0 | 轻量状态管理 |
| Zod | 4.1 | 运行时类型校验 |

## 🤖 AI Coding 支持

本项目专为 AI Coding 工具优化：

- **AGENTS.md** - AI 开发规范指南，Cursor/Qoder 可直接解析
- **BMAD 方法论** - 结构化的 AI 辅助开发流程
- **类型安全** - 完整的 TypeScript 类型定义，便于 AI 理解
- **模块化架构** - 清晰的目录结构和职责划分

### 使用 Cursor

1. 用 Cursor 打开项目
2. 阅读 `AGENTS.md` 了解项目规范
3. 使用 `@file` 引用相关文件开始开发

## 📖 文档

- [架构说明](docs/Architecture.md)
- [设计系统说明](docs/DESIGN_TOKENS.md)

## 🗺️ 路线图

- [x] v1.0.0 - 基础 Boilerplate 发布
- [x] v1.1.0 - 主题系统 (深色/浅色模式)
- [ ] v1.2.0 - 多 LLM Provider 支持 (OpenAI, Claude, Gemini)
- [ ] v1.3.0 - 国际化 (i18n)

## 🤝 贡献

欢迎贡献！请查看 [CONTRIBUTING.md](CONTRIBUTING.md) 了解详情。

## 📄 许可证

[AGPL-3.0](LICENSE) © OPC-Starter Contributors

---

<p align="center">
  Made with ❤️ for Solo Entrepreneurs and AI-Assisted Developers
</p>
