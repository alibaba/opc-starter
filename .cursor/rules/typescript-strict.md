---
description: TypeScript 严格类型规范，编辑 TS/TSX 文件时应用
globs: ["app/src/**/*.ts", "app/src/**/*.tsx"]
---

# TypeScript 严格类型规范

## 基本规则

- `strict: true` 已开启，所有代码必须通过严格类型检查
- `@typescript-eslint/no-explicit-any` 设为 `error`，禁止使用 `any`
- 使用 `unknown` + 类型守卫替代 `any`
- 优先使用 `interface` 而非 `type`
- 导出类型时使用 `export type`

## 替代 `any` 的方式

```typescript
// 禁止
function parse(data: any) { ... }

// 正确：使用 unknown + 类型守卫
function parse(data: unknown) {
  if (typeof data === 'string') { ... }
}

// 正确：使用泛型
function wrap<T>(value: T): { value: T } { ... }

// 正确：使用 Record
function process(config: Record<string, unknown>) { ... }
```

## 验证命令

```bash
npm run type-check   # tsc --noEmit
npm run lint:check   # ESLint 静态检查
```
