# OPC-Starter 编码规范

> 版本: v1.0.0 | 更新: 2026-03-15

## 目录约定

```
app/src/
├── pages/          # 页面组件（一个文件一个页面）
├── components/     # UI 组件
│   ├── ui/         # 基础 UI 组件（shadcn 风格）
│   ├── layout/     # 布局组件（Header/Sidebar/MainLayout）
│   ├── agent/      # Agent Studio 组件
│   └── organization/ # 组织架构组件
├── hooks/          # 自定义 React Hooks
├── stores/         # Zustand 状态管理
├── services/       # 服务层（API、数据、存储）
├── lib/            # 底层工具库
├── types/          # TypeScript 类型定义
├── utils/          # 纯工具函数
├── config/         # 路由、常量配置
├── mocks/          # MSW Mock 处理器
└── test/           # 测试工具和架构约束测试
```

## 命名规则

### 文件命名

| 类型 | 规则 | 示例 |
|------|------|------|
| 页面组件 | PascalCase + `Page` 后缀 | `DashboardPage.tsx` |
| React 组件 | PascalCase | `AgentWindow.tsx` |
| Hook | `use` 前缀 + camelCase | `useAuth.ts` |
| Store | `use` 前缀 + PascalCase + `Store` | `useAuthStore.ts` |
| 服务 | camelCase | `profileService.ts` |
| 类型文件 | kebab-case | `people-count.ts` |
| 工具函数 | camelCase | `dateFormatter.ts` |
| 测试文件 | 同名 + `.test` 后缀 | `DataService.test.ts` |

### 变量命名

- **组件**: PascalCase (`AgentWindow`)
- **函数/变量**: camelCase (`handleSubmit`, `userData`)
- **常量**: UPPER_SNAKE_CASE (`API_BASE_URL`)
- **类型/接口**: PascalCase (`UserProfile`, `AgentConfig`)
- **Enum**: PascalCase + 成员 UPPER_SNAKE_CASE

## 分层依赖方向

```
pages → components → hooks → stores → services → lib → types/utils
```

- 上层可导入下层，**禁止逆向依赖**
- `pages/`、`components/`、`hooks/` **禁止**直接导入 `@/lib/supabase/client`
- `services/` **禁止**导入 `components/` 或 `pages/`
- `stores/` **禁止**导入 `pages/`
- 这些约束由 `src/test/architecture.test.ts` 自动化验证

## TypeScript 规范

- `strict: true` 开启，包含 `noUnusedLocals`、`noUnusedParameters`
- `@typescript-eslint/no-explicit-any: error`，禁止 `any` 类型逃逸
- 使用 `@/*` 路径别名代替相对路径
- 所有公开函数/接口应有 JSDoc 注释

## 文件头规范

每个 `.ts` / `.tsx` 源文件必须在顶部添加 JSDoc 文件头：

```typescript
/**
 * ModuleName - 简要描述模块职责
 */
```

此规范由 `architecture.test.ts` 中的 JSDoc 覆盖率测试自动验证。

## Tailwind CSS v4

- 使用 v4 语法，**禁止** `bg-opacity-*`、`bg-gradient-to-*` 等 v2/v3 写法
- 透明度使用 `bg-black/50` 格式
- 渐变使用 `bg-linear-to-r` 格式
- 详见 `.cursor/rules/tailwind-v4.md`

## 错误处理

- 使用 `src/types/error.ts` 中定义的错误类型
- Service 层统一包装错误，返回 `Result<T, AppError>` 模式
- 组件层使用 `ErrorBoundary` 捕获渲染错误
- Hook 层使用 try/catch 并返回 `{ data, error, loading }` 三元组

## 数据访问

- 所有数据操作通过 `DataService` 统一入口
- **禁止**直接导入 Supabase client
- **禁止**直接操作 IndexedDB
- SQL 变更集中到 `app/supabase/setup.sql`

## 测试规范

- 测试文件与源文件同目录或放在 `__tests__/` 子目录
- 使用 Vitest + jsdom 环境
- Mock 外部依赖（Supabase、网络请求）
- 详见 `.cursor/rules/testing.md`
