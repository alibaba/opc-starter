# OPC-Starter App

> 一人公司启动器 - 应用主目录

## 快速开始

```bash
# 安装依赖
npm install

# 复制环境变量
cp env.local.example .env.local

# 启动开发服务器
npm run dev
```

## 环境变量

在 `.env.local` 中配置：

```bash
# Supabase 配置
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key

# Agent LLM 配置 (可选)
VITE_DASHSCOPE_API_KEY=your_dashscope_api_key
```

## 目录结构

```
app/
├── src/
│   ├── auth/            # 认证模块
│   ├── components/      # React 组件
│   │   ├── agent/       # Agent Studio (A2UI)
│   │   ├── business/    # 业务组件
│   │   ├── layout/      # 布局组件
│   │   ├── organization/ # 组织架构组件
│   │   └── ui/          # 基础 UI 组件
│   ├── config/          # 配置文件
│   ├── hooks/           # 自定义 Hooks
│   ├── lib/             # 库封装
│   │   ├── agent/       # Agent 核心逻辑
│   │   ├── reactive/    # 响应式数据层
│   │   └── supabase/    # Supabase 客户端
│   ├── pages/           # 页面组件
│   ├── services/        # 服务层
│   │   ├── data/        # DataService (同步核心)
│   │   ├── db/          # IndexedDB
│   │   └── storage/     # Supabase Storage
│   ├── stores/          # Zustand 状态管理
│   ├── types/           # TypeScript 类型
│   └── utils/           # 工具函数
├── supabase/
│   ├── functions/       # Edge Functions
│   └── setup.sql        # 数据库 Schema
└── cypress/             # E2E 测试
```

## 可用脚本

| 命令 | 说明 |
|------|------|
| `npm run dev` | 启动开发服务器 |
| `npm run build` | 构建生产版本 |
| `npm run preview` | 预览生产构建 |
| `npm run lint` | 运行 ESLint |
| `npm run type-check` | TypeScript 类型检查 |
| `npm test` | 运行单元测试 |
| `npm run test:e2e` | 运行 E2E 测试 |

## 技术栈

- **React 19** + **TypeScript 5.9**
- **Vite 7** - 构建工具
- **Tailwind CSS 4.1** - 样式
- **Supabase** - 后端服务
- **Zustand** - 状态管理
- **Zod** - 运行时类型校验

## 更多文档

- [项目 README](../README.md)
- [AI Coding 指南](../AGENTS.md)
- [Supabase 配置](supabase/SUPABASE_COOKBOOK.md)
