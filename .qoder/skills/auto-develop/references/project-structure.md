# Project Structure

## 技术栈

| 技术 | 版本 | 注意事项 |
|------|------|----------|
| React | 19.1 | |
| TypeScript | 5.9 | |
| Vite | 7.1 | |
| **Tailwind CSS** | **4.1** | ⚠️ 必须使用 v4 语法 |
| Supabase | 2.80 | |
| Zustand | 5.0 | |

## 数据流架构

```
React 19 → Zustand Store → DataService → IndexedDB
                              ↓↑
                    Supabase (Auth + PostgreSQL + Realtime)
                              ↓↑
                    阿里云 (OSS + 百炼 AI)
```

**数据访问模式**：
- Read: IndexedDB (local-first)
- Write: Optimistic update + Supabase Realtime sync
- **所有操作必须通过 `DataService`**

## 目录结构

```
photo-wall/
├── docs/
│   ├── Architecture.md      # 系统架构
│   └── Epics.yaml           # 项目进度 & Epic/Story 管理
├── photo-wall/
│   ├── src/
│   │   ├── components/          # React 组件
│   │   ├── services/
│   │   │   ├── data/DataService.ts  # 统一数据访问（核心）
│   │   │   ├── api/             # API 服务
│   │   │   ├── ai/              # AI 服务
│   │   │   └── cloud/           # OSS 存储服务
│   │   ├── stores/              # Zustand Store
│   │   ├── hooks/               # 自定义 Hooks
│   │   ├── types/               # TypeScript 类型
│   │   ├── mocks/               # MSW Mock 数据
│   │   │   ├── handlers/        # API Mock Handlers
│   │   │   └── data/            # Mock 数据
│   │   └── utils/               # 工具函数
│   ├── cypress/
│   │   ├── e2e/                 # E2E 测试用例
│   │   │   ├── auth/            # 认证相关测试
│   │   │   ├── photos/          # 照片功能测试
│   │   │   └── albums/          # 相册功能测试
│   │   ├── fixtures/            # 测试数据 & 资源
│   │   │   └── users.json       # 测试用户凭证
│   │   └── support/             # Cypress 支持文件
│   ├── supabase/
│   │   ├── setup.sql            # 数据库脚本（所有 SQL 变更集中于此）
│   │   ├── functions/           # Edge Functions
│   │   ├── SUPABASE_COOKBOOK.md # Supabase 操作手册
│   │   └── ALICLOUD_COOKBOOK.md # 阿里云服务配置
│   └── package.json
└── AGENTS.md                # AI 编码快速指南
```

## 关键文件

| File | Purpose |
|------|---------|
| `photo-wall/src/services/data/DataService.ts` | 统一数据访问层，所有数据操作必须通过此服务 |
| `photo-wall/supabase/setup.sql` | 所有数据库变更集中管理 |
| `docs/Epics.yaml` | 项目进度追踪、Epic/Story/Task 管理 |
| `AGENTS.md` | AI 编码快速指南 |

## 测试相关文件

| File | Purpose |
|------|---------|
| `cypress/e2e/**/*.cy.js` | E2E 测试用例 |
| `cypress/fixtures/users.json` | 测试用户凭证 (禁止使用环境变量) |
| `src/**/*.test.ts` | 单元测试 (Vitest) |
| `src/mocks/handlers/authHandlers.ts` | 认证 API Mock |
| `src/mocks/handlers/supabaseRestHandlers.ts` | REST API Mock |

## Edge Functions

Supabase Edge Functions 位于 `photo-wall/supabase/functions/`：

| Function | Purpose |
|----------|---------|
| `oss-sts-token` | OSS 临时凭证 |
| `aliyun-bailian-proxy` | AI 视频生成代理 |
| `recognize-scene` | 场景识别 |
| `alibaba-i2i-synthesis` | 图像合成 |

**部署命令**：

```bash
cd photo-wall/supabase && supabase functions deploy <function-name>
```

## 外部服务

| Service | Provider | Purpose |
|---------|----------|---------|
| Auth | Supabase | 用户认证 |
| Database | Supabase PostgreSQL | 持久化存储 |
| Realtime | Supabase Realtime | 数据同步 |
| Storage | 阿里云 OSS | 照片存储 |
| AI | 阿里云百炼 | 视频生成、场景识别 |

## NPM Scripts

### 开发

```bash
npm run dev          # 启动开发服务器
npm run dev:test     # 启动测试模式服务器 (启用 MSW mock)
```

### 测试

```bash
npm run test               # 运行单元测试 (Vitest) - 运行一次后退出
npm run test:e2e           # E2E 测试 - 开发模式 (带 Cypress UI)
npm run test:e2e:headless  # E2E 测试 - 无头模式 (CI)
npm run cypress:open       # 单独打开 Cypress UI
npm run cypress:run        # 单独运行 Cypress (无头)
```

### 质量检查

```bash
npm run lint         # TypeScript 类型检查 + ESLint
npm run build        # 生产构建
npm run preview      # 预览构建结果
```

## 文档更新策略

| Content Type | Target File |
|--------------|-------------|
| SQL 变更 | `photo-wall/supabase/setup.sql` |
| 数据库操作 | `photo-wall/supabase/SUPABASE_COOKBOOK.md` |
| 阿里云配置 | `photo-wall/supabase/ALICLOUD_COOKBOOK.md` |
| 项目进度 | `docs/Epics.yaml` |
| 系统架构 | `docs/Architecture.md` |

**禁止创建新的文档文件，优先更新现有文档。**

## 测试数据策略

### 测试用户凭证

从 `cypress/fixtures/users.json` 读取，格式：

```json
{
  "testUser": {
    "email": "test@example.com",
    "password": "testpassword"
  }
}
```

### MSW Mock 数据

- 认证 API：`src/mocks/handlers/authHandlers.ts`
- REST API：`src/mocks/handlers/supabaseRestHandlers.ts`

测试用户凭证需与 `authHandlers.ts` 中的 mock 保持一致。

## 目录用途说明

| Directory | Purpose |
|-----------|---------|
| `src/components/business/` | 业务组件 |
| `src/components/ui/` | 通用 UI 组件 (shadcn/ui) |
| `src/components/layout/` | 布局组件 |
| `src/services/data/` | 统一数据访问层 |
| `src/services/api/` | Supabase API 封装 |
| `src/stores/` | Zustand 状态管理 |
| `src/hooks/` | 自定义 React Hooks |
| `src/types/` | TypeScript 类型定义 |
| `src/utils/` | 工具函数 |
| `src/mocks/` | MSW Mock 配置 |
