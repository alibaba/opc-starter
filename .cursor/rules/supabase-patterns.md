---
description: Supabase 数据操作规范，编辑数据服务和存储相关文件时应用
globs: ["app/src/services/**/*.ts", "app/src/stores/**/*.ts", "app/src/lib/supabase/**/*.ts"]
---

# Supabase 开发模式

## 数据操作

- 使用 `DataService` 进行数据操作，禁止直接操作 IndexedDB 或 Supabase
- 遵循乐观更新模式
- RLS 策略使用 `SECURITY DEFINER` 函数

## PromiseLike 陷阱

Supabase 的 `.then()` 返回 `PromiseLike`（无 `.finally()`），使用 async IIFE 包裹：

```typescript
// 错误：PromiseLike 没有 finally
const promise = supabase.from('table').select().then(...).finally(...)

// 正确：使用 async IIFE
const promise = (async () => {
  try {
    const { data, error } = await supabase.from('table').select()
    return data
  } finally {
    // 清理逻辑
  }
})()
```

## SQL 变更

所有 SQL 变更集中到 `app/supabase/setup.sql`，禁止创建独立 SQL 文件。
