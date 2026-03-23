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
│   ├── 00002_add_xxx.sql
│   └── TEMPLATE.sql         # 标准模板（复制使用）
├── rollbacks/               # 回滚文件
│   ├── 00001_rollback.sql
│   └── 00002_rollback.sql
├── migration-manifest.yaml  # 版本注册表
└── setup.sql                # 完整 schema 快照（baseline，自动维护）
```

### 查看迁移状态

```bash
# 查看 migration-manifest.yaml
cat app/supabase/migration-manifest.yaml
```

### 创建新 Migration

**步骤 1：复制模板**

```bash
cp app/supabase/migrations/TEMPLATE.sql app/supabase/migrations/00007_your_migration.sql
```

**步骤 2：填写元信息**

```sql
-- Seq: 00007
-- Name: your_migration_name
-- Description: 简要描述此 migration 的作用
-- Story: Epic-XX 或 Story-XX-XX（可选）
-- Created: YYYY-MM-DD
```

**步骤 3：编写 DDL**

- 在 `-- 1. DDL 语句` 区域编写 SQL
- 确保使用 `IF NOT EXISTS` 保证幂等性

**步骤 4：创建 Rollback 文件**

```bash
cp app/supabase/migrations/00007_your_migration.sql app/supabase/migrations/rollbacks/00007_your_migration_rollback.sql
# 修改内容为回滚 SQL
```

### 执行迁移

> **⚠️ 重要原则：所有 SQL 执行统一通过 MCP Server 完成，禁止使用 Node 脚本直接操作数据库。**

**前置条件：配置阿里云 Supabase MCP Server**

MCP Server 是 AI Agent 连接数据库的唯一通道。如果未配置，`db-migration apply/status` 和 `deploy-esa` 将无法执行。

**步骤 1：开通阿里云 ADB Supabase**

前往 [阿里云 AnalyticDB](https://www.aliyun.com/product/gpdb) 开通 AnalyticDB PostgreSQL（Supabase 模式）。

**步骤 2：获取 AccessKey**

前往 [RAM 控制台](https://ram.console.aliyun.com/manage/ak) 创建 AccessKey，确保拥有 `AliyunGPDBFullAccess` 权限。

**步骤 3：创建 `.mcp.json`**

在项目根目录创建 `.mcp.json`（已在 `.gitignore` 中，不会被提交）：

```json
{
  "mcpServers": {
    "supabase": {
      "command": "npx",
      "args": [
        "-y",
        "@aliyun-supabase/mcp-server-supabase@latest",
        "--features=aliyun",
        "--project-id=YOUR_PROJECT_ID",
        "--region-id=YOUR_REGION_ID"
      ],
      "env": {
        "ALIYUN_ACCESS_TOKEN": "YOUR_ACCESS_KEY_ID|YOUR_ACCESS_KEY_SECRET"
      }
    }
  }
}
```

参数说明：

- `project-id`：在阿里云 ADB 控制台 > 实例列表中获取（格式：`spb-xxxxx`）
- `region-id`：实例所在地域（如 `cn-beijing`、`cn-hangzhou`）
- `ALIYUN_ACCESS_TOKEN`：格式为 `AccessKeyId|AccessKeySecret`

**步骤 4：重启 IDE 并验证**

重启 IDE（VS Code / Cursor / Qoder）后，让 AI 执行："列出我在阿里云上所有 supabase projects"。
若返回项目列表即配置成功。

> 详见官方文档：[Supabase MCP 使用指南](https://help.aliyun.com/zh/analyticdb/analyticdb-for-postgresql/supabase-mcp-user-guide)

**不同 IDE 的配置文件位置**：

| IDE                | 配置文件路径                    |
| ------------------ | ------------------------------- |
| VS Code (通义灵码) | `~/.lingma/mcp/lingma_mcp.json` |
| Cursor             | `.cursor/mcp.json`              |
| Qoder / 其他       | 项目根目录 `.mcp.json`          |

**可选参数**：

- `--read-only`：设置数据库为只读模式（安全模式）
- `--project-id`：指定项目 ID（如 `spb-xxxxx`）
- `--region-id`：指定地域（如 `cn-beijing`、`cn-hangzhou`）

**常见问题排查**：

| 问题                                    | 原因                         | 解决                                                                     |
| --------------------------------------- | ---------------------------- | ------------------------------------------------------------------------ |
| VS Code 无法执行工具                    | 未启用智能体自动执行权限     | 设置中搜索 `Mcp Tools In Agent Mode` 并启用"允许智能体自动执行 MCP 工具" |
| 安装报错 "No matching version found..." | npm 版本不兼容（如 v11.4.x） | 更新 npm 版本后重试                                                      |
| 运行报错 "User not authorized..."       | 缺少 RAM 权限                | 授予账号 `AliyunGPDBFullAccess` 权限策略                                 |
| 连接超时或失败                          | 安全组/IP 白名单限制         | 在阿里云 ADB 控制台添加当前 IP 到白名单                                  |

**备用方式：Supabase SQL Editor**

在 MCP Server 不可用时，可在 Supabase Dashboard > SQL Editor 中手动执行。

**执行流程**：

1. 查看 `migration-manifest.yaml`，确认待执行的 migration
2. **通过 MCP Server 执行 migration SQL 文件**（推荐使用 `db-migration apply`）
3. 确认执行成功后，manifest 状态会自动更新为 `applied`

### 回滚（紧急情况）

通过 MCP Server 执行对应的 rollback 文件：

```
app/supabase/migrations/rollbacks/{seq}_{name}_rollback.sql
```

### Migration 状态追踪

**`_schema_migrations` 表结构**（v1.2.0 增强版）：

```sql
CREATE TABLE public._schema_migrations (
  seq TEXT PRIMARY KEY,           -- 序号：00001, 00002...
  name TEXT NOT NULL,             -- 名称
  description TEXT,               -- 描述
  story TEXT,                     -- 关联 Story
  status TEXT NOT NULL            -- 状态：pending | applied | failed
    CHECK (status IN ('pending', 'applied', 'failed')),
  applied_at TIMESTAMPTZ,         -- 执行时间
  execution_time_ms INTEGER,      -- 执行耗时
  applied_by TEXT,                -- 执行者
  checksum TEXT                   -- 文件校验和
);
```

**初始化保障机制**：

- `_schema_migrations` 表定义已内置在 `00001_baseline.sql` 和 `setup.sql` 中
- 新环境初始化时即包含完整的 migration tracking 能力
- 无需额外执行 migration 来建立 tracking 机制

**状态说明**：

- `pending` - 开始执行但未完成（可能执行中或失败）
- `applied` - 成功执行
- `failed` - 执行失败

**修复未记录的 migration**：

如果已在数据库执行了 SQL 但未记录到 `_schema_migrations`，手动通过 MCP Server 执行 INSERT 补录：

```sql
INSERT INTO public._schema_migrations (seq, name, description, story, status, applied_at, applied_by)
VALUES ('000XX', 'migration_name', '描述', 'Epic-XX', 'applied', NOW(), current_user)
ON CONFLICT (seq) DO UPDATE SET status = 'applied';
```

### Migration 文件规范

**标准模板结构**（使用 `TEMPLATE.sql`）：

```sql
-- =====================================================
-- Migration Template
-- =====================================================
-- Seq: 000XX
-- Name: your_migration_name
-- Description: 简要描述此 migration 的作用
-- Story: Epic-XX
-- Created: YYYY-MM-DD
-- =====================================================

-- =====================================================
-- 0. 注册 migration 开始（pending 状态）
-- =====================================================
INSERT INTO public._schema_migrations (seq, name, description, story, status, applied_at, applied_by)
VALUES ('000XX', 'your_migration_name', '描述', 'Epic-XX', 'pending', NULL, current_user)
ON CONFLICT (seq) DO UPDATE SET status = 'pending', applied_at = NULL, applied_by = current_user;

-- =====================================================
-- 1. DDL 语句（在此编写实际的 schema 变更）
-- =====================================================
-- CREATE TABLE IF NOT EXISTS public.example_table (...);

-- =====================================================
-- 2. 索引（如果需要）
-- =====================================================
-- CREATE INDEX IF NOT EXISTS idx_example ON public.example(...);

-- =====================================================
-- 3. RLS 策略（如果需要）
-- =====================================================
-- ALTER TABLE public.example ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- 4. 触发器（如果需要）
-- =====================================================
-- CREATE TRIGGER example_trigger ON public.example ...;

-- =====================================================
-- 5. 注册 migration 完成（applied 状态）
-- =====================================================
UPDATE public._schema_migrations
SET status = 'applied', applied_at = NOW(), applied_by = current_user
WHERE seq = '000XX';

-- =====================================================
-- End of Migration
-- =====================================================
```

**关键要点**：

1. **开头插入 pending** - 标记开始执行
2. **末尾更新 applied** - 标记执行成功
3. **使用 `IF NOT EXISTS`** - 保证幂等性
4. **每个 migration 必须有 rollback** - 在 `rollbacks/` 目录

## 注意事项

- **所有 SQL 执行统一通过 MCP Server**，禁止使用 Node 脚本直接操作数据库
- **禁止直接修改 `setup.sql`**，必须通过 migration 文件管理 schema 变更
- 每个 migration 必须有对应的 rollback 文件
- 使用 `IF NOT EXISTS` / `IF EXISTS` 保证幂等性
- 后续将提供专用的 migration Skill，进一步简化迁移执行流程
- Supabase JS Client 的 `.then()` 返回 `PromiseLike`，没有 `.finally()` 方法
- 使用 `async/await` 代替链式调用以避免类型问题
