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

## Schema 变更（Migration 体系）

### 核心原则

**禁止直接修改 `setup.sql`**。所有 schema 变更必须通过 migration 文件管理。

**数据库 `_schema_migrations` 表是唯一的真相来源**（Source of Truth），本地 `migration-manifest.yaml` 是索引。

### _schema_migrations 元数据表

```sql
-- 由 00001_baseline.sql 创建，所有环境必须存在
CREATE TABLE IF NOT EXISTS public._schema_migrations (
  seq TEXT PRIMARY KEY,                      -- '00001', '00002', ...
  name TEXT NOT NULL,                         -- 'baseline', 'add_xxx'
  description TEXT,
  story TEXT,                                 -- story key, e.g. '1-3-xxx'
  applied_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  execution_time_ms INTEGER,
  applied_by TEXT DEFAULT current_user
);
```

**每个 migration 文件必须在末尾自注册**：
```sql
INSERT INTO public._schema_migrations (seq, name, description, story)
VALUES ('00002', 'add_xxx', '描述', '1-3-xxx')
ON CONFLICT (seq) DO NOTHING;
```

**每个 rollback 文件必须在末尾自注销**：
```sql
DELETE FROM public._schema_migrations WHERE seq = '00002';
```

### Migration 状态检测

```
┌──────────────────────┐    ┌──────────────────────┐
│  本地 manifest.yaml  │    │  DB _schema_migrations │
│  00001 (applied)     │    │  00001                 │
│  00002 (pending) ←───┼─── │                        │ ← 差异 = 需要 apply
│  00003 (pending) ←───┼─── │                        │
└──────────────────────┘    └──────────────────────┘
```

**检测时机**：
- `db-migration status` — 主动查询
- `deploy-esa` Step 1 — 部署前自动检查
- 测试失败时 — 建议用户运行 status 排查

### Migration 文件规范

**目录结构**：
```
app/supabase/
├── migrations/           # 增量迁移文件
│   ├── 00001_baseline.sql
│   ├── 00002_add_xxx.sql
│   └── ...
├── rollbacks/            # 回滚文件（必须与 migration 一一对应）
│   ├── 00001_rollback.sql
│   ├── 00002_rollback.sql
│   └── ...
├── migration-manifest.yaml  # 版本注册表
└── setup.sql             # 完整 schema 快照（由 migration 体系自动维护）
```

**文件命名**：
- Migration: `[5位序号]_[描述].sql`（如 `00002_add_product_visibility.sql`）
- Rollback: `[5位序号]_rollback.sql`（如 `00002_rollback.sql`）

**Migration 文件模板**：
```sql
-- migrations/00002_add_product_visibility.sql
-- Seq: 00002
-- Name: add_product_visibility
-- Story: 1-3-product-visibility
-- Description: products 表增加 visibility 字段
-- Created: 2026-03-15

-- ===== UP =====
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS visibility TEXT NOT NULL DEFAULT 'private';

ALTER TABLE public.products
  ADD CONSTRAINT products_visibility_check
  CHECK (visibility IN ('private', 'organization', 'public'));

-- ===== Register Migration =====
INSERT INTO public._schema_migrations (seq, name, description, story)
VALUES ('00002', 'add_product_visibility', 'products 表增加 visibility 字段', '1-3-product-visibility')
ON CONFLICT (seq) DO NOTHING;
```

**Rollback 文件模板**：
```sql
-- rollbacks/00002_rollback.sql
-- Rolls back: 00002_add_product_visibility.sql

-- ===== DOWN =====
ALTER TABLE public.products
  DROP CONSTRAINT IF EXISTS products_visibility_check;

ALTER TABLE public.products
  DROP COLUMN IF EXISTS visibility;

-- ===== De-register Migration =====
DELETE FROM public._schema_migrations WHERE seq = '00002';
```

### 开发流程

当 dev-story 需要修改数据库 schema 时：

1. **读取 `migration-manifest.yaml`** 获取下一个序号（`last_migration` + 1）
2. **创建 migration 文件** `migrations/[seq]_[desc].sql`
3. **创建 rollback 文件** `rollbacks/[seq]_rollback.sql`
4. **更新 `migration-manifest.yaml`** 添加新条目（status: pending）
5. **更新 TypeScript 类型** `src/types/*.ts` 与 schema 同步
6. **更新 DataService adapter**（如有）
7. **同步更新 `setup.sql`** 保持完整快照

### migration-manifest.yaml 格式

```yaml
schema_version: "1.0.0"
last_migration: "00002"

migrations:
  - seq: "00001"
    name: "baseline"
    description: "初始 schema"
    story: null
    status: "applied"      # applied | pending | failed | rolled-back
    applied_at: "2026-01-01"

  - seq: "00002"
    name: "add_product_visibility"
    description: "products 表增加 visibility 字段"
    story: "1-3-product-visibility"
    status: "pending"
    applied_at: null
```

### MCP Server 集成

db-migration workflow 通过 MCP Server 与阿里云 ADB 交互：

**MCP 工具列表**：

| MCP Tool | 功能 | 参数 |
|----------|------|------|
| `execute_sql` | 执行 SQL 语句 | `url`, `api_key`, `sql` |
| `list_table` | 列出所有表 | `url`, `api_key` |
| `list_columns` | 列出表字段 | `url`, `api_key`, `table` |
| `list_indexes` | 列出索引 | `url`, `api_key` |
| `list_extensions` | 列出扩展 | `url`, `api_key` |
| `get_supabase_project_api_keys` | 获取 API 密钥 | 无（由 CLI 参数注入） |

**调用示例**：
```
execute_sql(
  url: "https://{project-id}.supabase.opentrust.net",
  api_key: "{service_role_key}",
  sql: "CREATE TABLE ..."
)
```

**事务处理**：ADB 使用标准 PostgreSQL 事务语法，在 SQL 中自行编写：
```sql
BEGIN;
  ALTER TABLE ...;
  ALTER TABLE ...;
COMMIT;
-- 或 ROLLBACK; 回滚
```

### 注意事项

- 每个 migration 必须有对应的 rollback 文件
- DDL 操作必须在事务中执行
- 使用 `IF NOT EXISTS` / `IF EXISTS` 保证幂等性
- 新项目初始化使用 `setup.sql`（完整快照）
