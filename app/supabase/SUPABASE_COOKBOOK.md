# Supabase 操作手册

> OPC-Starter 数据库操作指南 | v2.0

## 概述

本项目使用 Supabase 作为后端服务，包含 Auth、Storage、Realtime 和 Edge Functions。

**数据库 Schema 变更管理**：

- 使用 **Migration 体系** 管理所有 schema 变更
- 禁止直接修改 `setup.sql`（由 migration 体系自动维护）
- 所有变更必须通过 `migrations/[seq]_[desc].sql` 文件

## 数据库 Schema

详见 `setup.sql`，核心表包括：

| 表              | 说明                         |
| --------------- | ---------------------------- |
| `profiles`      | 用户档案，扩展 auth.users    |
| `organizations` | 组织架构，支持多层级树形结构 |
| `persons`       | 人员数据                     |

## 常用操作

### 查询用户所属组织

```sql
SELECT p.*, o.display_name as org_name
FROM profiles p
LEFT JOIN organizations o ON p.organization_id = o.id
WHERE p.id = '<user_id>';
```

### 查询组织树

```sql
SELECT * FROM organizations
ORDER BY level ASC, display_name ASC;
```

### 创建组织（需 admin 权限）

使用 RPC 函数，自动处理 path 和 level 计算：

```sql
SELECT admin_create_organization(
  p_name := 'engineering',
  p_display_name := '工程部',
  p_description := '负责技术研发',
  p_parent_id := '<parent_org_id>'  -- 可选
);
```

### 删除组织（需 admin 权限）

```sql
SELECT admin_delete_organization(p_org_id := '<org_id>');
```

## RLS 策略

- 所有表默认启用 RLS
- 管理操作通过 `SECURITY DEFINER` 函数绕过 RLS
- 函数内部验证调用者是否为 admin

## Edge Functions

| 函数           | 说明    | 端点                              |
| -------------- | ------- | --------------------------------- |
| `ai-assistant` | AI 助手 | `POST /functions/v1/ai-assistant` |

## 环境变量

| 变量                        | 说明                         |
| --------------------------- | ---------------------------- |
| `SUPABASE_URL`              | 项目 URL                     |
| `SUPABASE_ANON_KEY`         | 匿名 Key (客户端)            |
| `SUPABASE_SERVICE_ROLE_KEY` | Service Role Key (仅后端)    |
| `ALIYUN_BAILIAN_API_KEY`    | 百炼 API Key (Edge Function) |

## Migration 操作

### 目录结构

```
app/supabase/
├── migrations/              # 增量迁移文件
│   ├── 00001_baseline.sql
│   └── 00002_add_xxx.sql
├── rollbacks/               # 回滚文件
│   ├── 00001_rollback.sql
│   └── 00002_rollback.sql
├── migration-manifest.yaml  # 版本注册表
└── setup.sql                # 完整 schema 快照（自动维护）
```

### 查看迁移状态

```bash
# 查看 migration-manifest.yaml
cat app/supabase/migration-manifest.yaml
```

### 执行迁移（db-migration workflow）

1. **Agent 自动创建**：dev-story 检测到 schema 变更时，自动创建 migration 文件
2. **Code Review 审查**：审查 migration 文件和 rollback 文件
3. **db-migration 执行**：通过 MCP Server 连接阿里云 ADB，在事务中执行迁移
4. **状态更新**：更新 `migration-manifest.yaml`，重新生成 `setup.sql`

### 手动回滚（紧急情况）

```bash
# 在 Supabase SQL Editor 中执行对应 rollback 文件
# 例如回滚 00002：
cat app/supabase/rollbacks/00002_rollback.sql | pbcopy
# 然后粘贴到 SQL Editor 执行
```

### Migration 文件规范

**文件名**：`[5位序号]_[描述].sql`

- 示例：`00002_add_product_visibility.sql`

**文件头模板**：

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
```

**Rollback 文件模板**：

```sql
-- rollbacks/00002_rollback.sql
-- Rolls back: 00002_add_product_visibility.sql

ALTER TABLE public.products
  DROP COLUMN IF EXISTS visibility;
```

## 注意事项

- **禁止直接修改 `setup.sql`**，必须通过 migration 文件管理 schema 变更
- 每个 migration 必须有对应的 rollback 文件
- 使用 `IF NOT EXISTS` / `IF EXISTS` 保证幂等性
- DDL 操作在 db-migration workflow 中自动开启事务
- Supabase JS Client 的 `.then()` 返回 `PromiseLike`，没有 `.finally()` 方法
- 使用 `async/await` 代替链式调用以避免类型问题
