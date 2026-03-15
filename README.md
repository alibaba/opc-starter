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

### AI / Cursor Cloud 最短路径（推荐）

默认推荐 **MSW Mock 模式**，不依赖真实 Supabase，最适合 AI Coding 工具快速启动、复现和回归：

```bash
git clone https://github.com/your-username/opc-starter.git
cd opc-starter
npm --prefix app install
npm run dev:test
```

启动后浏览器打开 `http://localhost:5173`，你将看到**登录页面**。使用以下测试账号登录：

| 邮箱 | 密码 |
|------|------|
| `test@example.com` | `888888` |

登录成功后即可进入 OPC-Starter 仪表盘，开始体验所有功能。

> **说明**
>
> - 常用 npm 命令可直接在仓库根目录运行，适合从 `/workspace` 起步的 AI 工具。
> - 需要真实后端时，再配置 `app/.env.local` 并执行 `npm run dev`。
> - MSW 测试账号统一来自 `app/cypress/fixtures/users.json`。

### 环境要求

- Node.js >= 20.x
- npm >= 10.x
- Supabase 账户（仅真实后端模式需要）

### 安装

```bash
git clone https://github.com/your-username/opc-starter.git
cd opc-starter

# 安装应用依赖
npm --prefix app install

# 推荐：本地 mock 模式
npm run dev:test

# 可选：真实 Supabase 模式
cp app/env.local.example app/.env.local
npm run dev
```

### 环境变量

真实 Supabase 模式下，在 `app/.env.local` 中配置：

```bash
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_DASHSCOPE_API_KEY=your_dashscope_api_key  # 可选，用于 Agent LLM
```

### 常见问题

<details>
<summary><strong>npm install 失败 (ECONNRESET)</strong></summary>

如果 `package-lock.json` 引用了无法访问的内部镜像源，删除后重试：

```bash
cd app
rm -rf node_modules package-lock.json
npm install --registry https://registry.npmjs.org/
```
</details>

<details>
<summary><strong>浏览器白屏 / 控制台出现 ERR_NAME_NOT_RESOLVED</strong></summary>

原因：浏览器 localStorage 中残留了上次会话的过期 Token，Supabase 客户端尝试向 `placeholder.supabase.co` 发起真实请求。

修复方法：清除浏览器站点数据后刷新页面。

- Chrome：`F12` → Application → Storage → Clear site data
- 或访问 `chrome://settings/content/all?searchSubpage=localhost`，删除 localhost 数据
</details>

<details>
<summary><strong>控制台出现 WebSocket 连接警告</strong></summary>

MSW 模式下，Supabase Realtime 的 WebSocket 连接会因为没有对应的 Mock Handler 而产生警告，这属于**预期行为**，不影响任何功能。
</details>

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
- **根目录代理脚本** - 可直接在仓库根目录执行 `npm run dev:test`、`npm run ai:check`

### AI 迭代地图

| 想做什么 | 从哪里开始 | 下一步通常改哪里 | 推荐验证 |
|---------|-----------|----------------|---------|
| 启动应用 / 切换 mock | `app/src/main.tsx` | `app/.env.test`、`app/vite.config.ts` | `npm run dev:test` |
| 查看应用入口 | `app/src/App.tsx` | `app/src/config/routes.tsx` | `npm run build` |
| 新增页面 / 路由 | `app/src/config/routes.tsx` | `app/src/pages/`、`app/src/components/layout/MainLayout/` | `npm run type-check` |
| 改数据访问 | `app/src/services/data/DataService.ts` | `app/src/services/data/adapters/`、`app/src/stores/` | `npm test` |
| 改 Agent Studio | `app/src/components/agent/` | `app/src/lib/agent/`、`app/supabase/functions/ai-assistant/` | `npm run test:tools` |
| 改 E2E 测试 | `app/cypress/e2e/` | `app/cypress/fixtures/users.json`、`app/cypress/support/` | `npm run test:e2e:headless` |

### AI 质量入口

```bash
# 核心校验（lint + type-check + unit test + build）
npm run ai:check

# 完整校验（额外包含 E2E）
./scripts/quality_check.sh
```

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
