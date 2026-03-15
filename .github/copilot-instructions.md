# OPC-Starter Copilot 指令

## 技术栈

React 19.1 · TypeScript 5.9 (strict) · Vite 7.1 · Tailwind CSS 4.1 · Supabase 2.80 · Zustand 5.0

## 关键规则

- 使用 Tailwind CSS **v4** 语法，禁止 `bg-opacity-*`、`bg-gradient-to-*` 等 v2/v3 写法
- 数据操作通过 `DataService`，禁止直接导入 `@/lib/supabase/client`
- SQL 变更集中到 `app/supabase/setup.sql`
- 新文件必须在顶部添加 JSDoc 文件头注释
- `@typescript-eslint/no-explicit-any: error`，避免 `any` 类型逃逸

## 代码路径别名

`@/*` → `src/*`

## 分层约束

```
pages → components → hooks → stores → services → lib
```

上层可导入下层，禁止逆向依赖。`pages/`、`components/`、`hooks/` 禁止直接导入 `@/lib/supabase/client`。

## 质量门禁

```bash
npm run ai:check   # lint + format + type-check + coverage + build
npm run test        # Vitest 单元测试
npm run type-check  # TypeScript 类型检查
```

## 文档参考

- `docs/Architecture.md` — 系统架构
- `docs/API.md` — AI Assistant API
- `docs/CONVENTIONS.md` — 编码规范
- `docs/DESIGN_TOKENS.md` — 设计令牌
