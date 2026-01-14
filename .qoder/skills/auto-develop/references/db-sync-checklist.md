# 数据库一致性检查清单

当功能涉及数据库变更时（新增字段、修改约束、新增枚举值等），**必须**执行以下检查。

## 检查流程

### 1. 代码与 Schema 一致性对比

对比以下文件，确保前后端定义一致：

| 前端 | 后端 |
|------|------|
| `src/types/*.ts` (TypeScript 类型) | `supabase/setup.sql` (表定义) |
| `src/services/api/*.ts` (API 调用) | `supabase/setup.sql` (CHECK 约束) |

### 2. 必检项目

- [ ] 新增的枚举值在 SQL CHECK 约束中存在
- [ ] 新增的字段在 SQL 表定义中存在
- [ ] 字段类型匹配（TEXT/UUID/JSONB 等）
- [ ] 默认值一致
- [ ] NOT NULL 约束一致

### 3. 识别需要迁移的变更

如果 `setup.sql` 包含以下变更，则**必须**生成迁移 SQL 并在线上执行：

- 新的 CHECK 约束值（如 `visibility IN ('private', 'organization', 'public')`）
- 新的表字段
- 修改的约束条件
- 新的索引

## 迁移 SQL 模板

### 更新 CHECK 约束

```sql
-- 更新 CHECK 约束（新增枚举值）
ALTER TABLE public.{table_name} 
  DROP CONSTRAINT IF EXISTS {table_name}_{column}_check;
ALTER TABLE public.{table_name}
  ADD CONSTRAINT {table_name}_{column}_check 
  CHECK ({column} IN ('value1', 'value2', 'value3'));
```

### 新增字段

```sql
-- 新增字段
ALTER TABLE public.{table_name}
  ADD COLUMN IF NOT EXISTS {column_name} {type} {constraints};
```

### 修改字段默认值

```sql
-- 修改默认值
ALTER TABLE public.{table_name}
  ALTER COLUMN {column_name} SET DEFAULT '{value}';
```

## 验证迁移

在 Supabase SQL Editor 执行迁移后，运行验证查询：

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

## 常见遗漏场景

| 场景 | 问题 | 错误表现 |
|------|------|----------|
| 新增枚举值 | 前端新增，但 CHECK 约束未更新 | `violates check constraint` |
| 新增字段 | 前端使用，但表未添加列 | `column does not exist` |
| 修改默认值 | 前后端默认值不一致 | 数据不一致 |
| 修改 NOT NULL | 前端允许空，后端 NOT NULL | `null value in column` |

## 快速检查命令

```bash
# 使用脚本检查一致性（如已安装）
python .qoder/skills/auto-develop/scripts/db_constraint_diff.py

# 或手动 grep 检查
# 检查 TypeScript 类型中的枚举
grep -r "type.*=.*|" src/types/

# 检查 SQL CHECK 约束
grep -i "CHECK" supabase/setup.sql
```

## 检查时机

在以下场景必须执行此检查：

1. **新增功能**涉及数据库字段
2. **修改枚举类型**（如 visibility、status 等）
3. **修改字段约束**（NOT NULL、默认值等）
4. **质量验证通过后**，部署前最终确认

