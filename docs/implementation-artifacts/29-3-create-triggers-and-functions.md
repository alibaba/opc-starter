# Story 29.3: 创建触发器与函数

Status: done

## Story

作为系统，
我想创建自动化触发器和辅助函数，
以便点赞/收藏/下载计数自动维护，slug 自动生成且唯一。

## Acceptance Criteria

1. `update_skill_likes_count()` 函数：INSERT +1 / DELETE -1（GREATEST 防止负数）
2. `update_skill_favorites_count()` 函数：同上
3. `update_skill_downloads_count()` 函数：INSERT +1
4. `generate_skill_slug()` 函数：小写 + 连字符 + 唯一性循环检查
5. `skills_updated_at` 触发器：复用现有 `update_updated_at_column()` 函数
6. 点赞/取消点赞后 `skills.likes_count` 正确更新
7. 收藏/取消收藏后 `skills.favorites_count` 正确更新
8. 下载记录创建后 `skills.downloads_count` 正确 +1
9. Slug 生成唯一且 URL 友好（小写字母、数字、连字符）
10. Migration `00004_add_skills_functions.sql` 和 Rollback 文件已创建

## Tasks / Subtasks

- [ ] 确认 migration 文件 (AC: 1-5)
  - [ ] 检查 `app/supabase/migrations/00004_add_skills_functions.sql`
  - [ ] 验证 3 个计数函数 + 对应触发器
  - [ ] 验证 `generate_skill_slug()` 含唯一性循环检查
  - [ ] 验证 `skills_updated_at` 触发器
- [ ] 确认 rollback 文件
- [ ] 本地测试：插入 skill_like 后 likes_count +1，删除后 -1
- [ ] 本地测试：likes_count 不会低于 0

## Dev Notes

### 触发器实现模式

```sql
-- 使用 GREATEST 防止负数（并发删除场景保护）
SET likes_count = GREATEST(likes_count - 1, 0)

-- generate_skill_slug 使用 WHILE 循环保证唯一性
WHILE EXISTS (SELECT 1 FROM public.skills WHERE slug = final_slug) LOOP
  counter := counter + 1;
  final_slug := base_slug || '-' || counter;
END LOOP;
```

### 现有基础设施

- 项目已有 `update_updated_at_column()` 函数（基线 migration 00001 中定义）
- 无需重新创建，直接在触发器中引用

### Project Structure Notes

- 依赖顺序：00002（表）→ 00003（RLS）→ 00004（函数）
- Slug 生成在 Edge Function `skills-publish` 中调用此函数

### References

- 触发器定义：[Source: docs/planning-artifacts/architecture.md#2.3 数据库触发器与函数]
- Slug 生成规则：[Source: docs/planning-artifacts/architecture.md#2.3.2 Slug 自动生成函数]

## Dev Agent Record

### Agent Model Used

_待填写_

### Debug Log References

### Completion Notes List

### File List

- `app/supabase/migrations/00004_add_skills_functions.sql`
- `app/supabase/migrations/rollbacks/00004_add_skills_functions_rollback.sql`
- `app/supabase/migration-manifest.yaml`
