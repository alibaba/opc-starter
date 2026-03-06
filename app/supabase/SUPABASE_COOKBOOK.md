# Supabase 操作手册

> OPC-Starter 数据库操作指南 | v1.0

## 概述

本项目使用 Supabase 作为后端服务，包含 Auth、Storage、Realtime 和 Edge Functions。所有数据库结构变更集中在 `setup.sql` 中管理。

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

## 注意事项

- SQL 变更统一添加到 `setup.sql`，禁止创建独立 SQL 文件
- Supabase JS Client 的 `.then()` 返回 `PromiseLike`，没有 `.finally()` 方法
- 使用 `async/await` 代替链式调用以避免类型问题
