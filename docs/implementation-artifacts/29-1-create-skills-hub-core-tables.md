# Story 29.1: 创建 Skills Hub 核心表

Status: done

## Story

作为开发者，
我想创建 Skills Hub 所有核心数据库表，
以便后续功能开发有完整的数据基础。

## Acceptance Criteria

1. `skills` 表创建成功，含 search_vector tsvector 生成列、tags/platforms GIN 索引
2. `skill_versions` 表创建成功，含 UNIQUE(skill_id, version) 约束
3. `skill_likes` 表创建成功，含 UNIQUE(skill_id, user_id) 约束
4. `skill_favorites` 表创建成功，含 UNIQUE(skill_id, user_id) 约束
5. `skill_installs` 表创建成功，含 install_type CHECK 约束
6. 所有索引创建完成（GIN for search_vector/tags/platforms, B-tree for FK/排序）
7. Migration 文件 `00002_add_skills_tables.sql` 创建完成
8. Rollback 文件 `00002_add_skills_tables_rollback.sql` 创建完成
9. `migration-manifest.yaml` 已更新

## Tasks / Subtasks

- [ ] 确认 migration 文件内容完整 (AC: 1-6)
  - [ ] 检查 `app/supabase/migrations/00002_add_skills_tables.sql` 已存在且内容正确
  - [ ] 确认所有 5 张表的字段定义完整
  - [ ] 确认所有索引已创建
- [ ] 确认 rollback 文件存在 (AC: 8)
  - [ ] 检查 `app/supabase/migrations/rollbacks/00002_add_skills_tables_rollback.sql`
- [ ] 确认 migration-manifest.yaml 已更新 (AC: 9)
  - [ ] 检查 `app/supabase/migration-manifest.yaml` 包含 00002 条目
- [ ] 在本地/测试环境执行 migration 验证无报错

## Dev Notes

### 关键信息

- **Migration 文件已存在**：`app/supabase/migrations/00002_add_skills_tables.sql` 已创建
- 迁移文件遵循项目规范：`app/supabase/migrations/[seq]_[desc].sql`
- 每个 schema 变更必须同时有对应的 rollback 文件
- **禁止直接修改 `setup.sql`**，所有 schema 变更通过 migration 文件

### 表结构要点

```sql
-- skills 表：search_vector 为 GENERATED ALWAYS AS ... STORED 列
-- 注意：GENERATED ALWAYS AS 列不能手动插入值
search_vector tsvector GENERATED ALWAYS AS (
  setweight(to_tsvector('english', coalesce(name, '')), 'A') ||
  setweight(to_tsvector('english', coalesce(description, '')), 'B') ||
  setweight(to_tsvector('english', coalesce(array_to_string(tags, ' '), '')), 'C')
) STORED
```

### Project Structure Notes

- Migration 文件路径：`app/supabase/migrations/`
- Rollback 文件路径：`app/supabase/migrations/rollbacks/`
- Manifest 文件：`app/supabase/migration-manifest.yaml`

### References

- 表结构定义：[Source: docs/planning-artifacts/architecture.md#2.2 核心表定义]
- Migration 规范：[Source: AGENTS.md#SQL 变更通过 Migration 管理]

## Dev Agent Record

### Agent Model Used

_待填写_

### Debug Log References

### Completion Notes List

### File List

- `app/supabase/migrations/00002_add_skills_tables.sql`
- `app/supabase/migrations/rollbacks/00002_add_skills_tables_rollback.sql`
- `app/supabase/migration-manifest.yaml`
