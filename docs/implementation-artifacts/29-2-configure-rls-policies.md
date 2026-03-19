# Story 29.2: 配置 RLS 策略

Status: done

## Story

作为系统管理员，
我想为 Skills Hub 所有表配置完整的 Row Level Security 策略，
以便数据访问符合最小权限原则，保障数据安全。

## Acceptance Criteria

1. `skills` 表 RLS 启用：游客查看 public / 作者查看自己的（含 draft/private） / 作者 CRUD 自己的
2. `skill_versions` 表 RLS：跟随 skills 可见性 / 作者可创建删除版本
3. `skill_likes` 表 RLS：所有人可查看 / 登录用户可创建删除自己的
4. `skill_favorites` 表 RLS：用户查看自己的 / 登录用户可创建删除
5. `skill_installs` 表 RLS：用户查看自己的或匿名 / 所有人可创建
6. 游客只能查询 `visibility='public'` 的 Skill
7. 登录用户可以操作自己的数据
8. 非作者无法修改/删除他人 Skill
9. Migration 文件 `00003_add_skills_rls.sql` 已创建
10. Rollback 文件 `00003_add_skills_rls_rollback.sql` 已创建

## Tasks / Subtasks

- [ ] 确认 migration 文件完整 (AC: 1-8)
  - [ ] 检查 `app/supabase/migrations/00003_add_skills_rls.sql`
  - [ ] 验证 skills 表 5 条 RLS 策略（select_public, select_own, insert, update, delete）
  - [ ] 验证 skill_versions 表 3 条 RLS 策略
  - [ ] 验证 skill_likes / skill_favorites / skill_installs RLS 策略
- [ ] 确认 rollback 文件 (AC: 10)
- [ ] 本地测试：游客无法访问 draft skill
- [ ] 本地测试：作者可以修改自己的 skill，非作者不行

## Dev Notes

### 关键 RLS 模式

```sql
-- skills 表双重 SELECT 策略（合并为 OR 逻辑）
CREATE POLICY skills_select_public ON public.skills
  FOR SELECT USING (visibility = 'public');

CREATE POLICY skills_select_own ON public.skills
  FOR SELECT USING (auth.uid() = author_id);
```

### 注意事项

- `auth.uid()` 在未登录时返回 NULL，不会匹配任何 author_id
- skill_versions 的 RLS 通过 EXISTS 子查询关联 skills 表权限
- skill_installs 允许匿名创建（`WITH CHECK (true)`）以支持匿名下载计数

### Project Structure Notes

- 依赖 Epic 29.1 的表结构已创建
- Migration 顺序：00002 → 00003

### References

- RLS 策略详情：[Source: docs/planning-artifacts/architecture.md#3.3 RLS 策略设计]
- 认证架构：[Source: docs/planning-artifacts/architecture.md#3.1 认证架构]

## Dev Agent Record

### Agent Model Used

_待填写_

### Debug Log References

### Completion Notes List

### File List

- `app/supabase/migrations/00003_add_skills_rls.sql`
- `app/supabase/migrations/rollbacks/00003_add_skills_rls_rollback.sql`
- `app/supabase/migration-manifest.yaml`
