# 数据库一致性检查清单

当功能涉及数据库变更时（新增字段、修改约束、新增枚举值等），**必须**执行以下检查。

## 0. MCP 与 .env 一致性检查（前置必检）

**在执行任何 migration 操作前，必须先确认 MCP 与前端 .env.local 指向同一实例。**

```bash
npm run db:check-sync   # ✅ 通过后方可继续
```

**发现不一致时：**

```bash
npm run mcp:sync        # 自动将 .mcp.json 同步到 .env.local 实例
npm run db:check-sync   # 再次验证
```

> ⚠️ 若不一致，migration SQL 会打到错误的数据库，前端毫无感知。

---



### 1. 代码与 Schema 一致性对比

对比以下文件，确保前后端定义一致：

| 前端 | 后端 |
|------|------|
| `src/types/*.ts` (TypeScript 类型) | `supabase/migrations/*.sql` (migration 文件) |
| `src/services/api/*.ts` (API 调用) | `supabase/migrations/*.sql` (CHECK 约束) |

### 2. Migration 文件检查

- [ ] Schema 变更已创建 migration 文件（非直接修改 setup.sql）
- [ ] migration 文件有对应的 rollback 文件
- [ ] `migration-manifest.yaml` 已更新（status: pending）
- [ ] `setup.sql` 由 migration 自动维护，禁止直接修改

### 3. 必检项目

- [ ] 新增的枚举值在 SQL CHECK 约束中存在
- [ ] 新增的字段在 SQL 表定义中存在
- [ ] 字段类型匹配（TEXT/UUID/JSONB 等）
- [ ] 默认值一致
- [ ] NOT NULL 约束一致
- [ ] TypeScript 类型与 migration 中的 schema 一致

### 4. 识别需要迁移的变更

如果 migration 文件包含以下变更，则需要在 db-migration workflow 中执行：

- 新的 CHECK 约束值（如 `visibility IN ('private', 'organization', 'public')`）
- 新的表字段
- 修改的约束条件
- 新的索引

## Migration 文件规范

### 目录结构

```
app/supabase/
├── migrations/           # 增量迁移文件
│   ├── 00001_baseline.sql
│   └── 00002_add_xxx.sql
├── rollbacks/            # 回滚文件
│   ├── 00001_rollback.sql
│   └── 00002_rollback.sql
├── migration-manifest.yaml
└── setup.sql
```

### Migration 文件模板

```sql
-- migrations/00002_add_visibility.sql
-- Seq: 00002
-- Name: add_visibility
-- Story: 1-3-product-visibility
-- Description: products 表增加 visibility 字段
-- Created: 2026-03-15

-- ===== UP =====
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS visibility TEXT NOT NULL DEFAULT 'private';

ALTER TABLE public.products
  ADD CONSTRAINT products_visibility_check
  CHECK (visibility IN ('private', 'organization', 'public'));
```

### Rollback 文件模板

```sql
-- rollbacks/00002_rollback.sql
-- Rolls back: 00002_add_visibility.sql

ALTER TABLE public.products
  DROP CONSTRAINT IF EXISTS products_visibility_check;

ALTER TABLE public.products
  DROP COLUMN IF EXISTS visibility;
```

## 验证 Migration

### 执行前检查

```bash
# 检查 migration-manifest.yaml 中的 pending 状态
cat app/supabase/migration-manifest.yaml | grep -A 5 "status: pending"

# 确认 rollback 文件存在
ls -la app/supabase/rollbacks/
```

### 执行后验证

在 db-migration workflow 执行后，运行验证查询：

```sql
-- 验证 CHECK 约束
SELECT constraint_name, check_clause
FROM information_schema.check_constraints 
WHERE constraint_name LIKE '%{table_name}%';

-- 验证表结构
SELECT column_name, data_type, column_default, is_nullable
FROM information_schema.columns 
WHERE table_name = '{table_name}';
```

### 验证 setup.sql 同步

```bash
# 确保 setup.sql 与 migrations 合并结果一致
# 通过 diff 比较或通过 MCP Server 获取 schema dump 验证
```

## 常见遗漏场景

| 场景 | 问题 | 错误表现 |
|------|------|----------|
| 新增枚举值 | 前端新增，但 CHECK 约束未更新 | `violates check constraint` |
| 新增字段 | 前端使用，但表未添加列 | `column does not exist` |
| 修改默认值 | 前后端默认值不一致 | 数据不一致 |
| 修改 NOT NULL | 前端允许空，后端 NOT NULL | `null value in column` |

## 快速检查命令

```bash
# 检查 migration 文件状态
cat app/supabase/migration-manifest.yaml

# 检查 TypeScript 类型中的枚举
grep -r "type.*=.*|" src/types/

# 检查 migration 中的 CHECK 约束
grep -i "CHECK" app/supabase/migrations/*.sql

# 检查 setup.sql 与 migration 是否同步
# 通过 diff 比较或 MCP Server 验证
```

## 检查时机

在以下场景必须执行此检查：

1. **dev-story 开发中**：创建 migration 文件后立即检查
2. **新增功能**涉及数据库字段
3. **修改枚举类型**（如 visibility、status 等）
4. **修改字段约束**（NOT NULL、默认值等）
5. **code-review 前**：确保 migration 文件完整
6. **db-migration 执行前**：验证 pending migrations
7. **deploy-esa 前**：确认无 pending migrations

