# Story 29.4: 配置 Storage Bucket

Status: done

## Story

作为系统，
我想创建 `skills` Storage Bucket 并配置 RLS 策略，
以便作者可以安全上传 Skill 文件，且只能操作自己目录下的文件。

## Acceptance Criteria

1. `skills` Bucket 创建成功（private，非 public）
2. 上传 RLS：作者只能上传到 `{author_id}/` 开头的路径
3. 删除 RLS：作者只能删除 `{author_id}/` 开头的文件
4. 用户无法上传到他人的目录
5. Migration `00005_add_skills_storage.sql` 和 Rollback 文件已创建

## Tasks / Subtasks

- [ ] 确认 migration 文件 (AC: 1-3)
  - [ ] 检查 `app/supabase/migrations/00005_add_skills_storage.sql`
  - [ ] 验证 bucket 为 private（`public = false`）
  - [ ] 验证上传 RLS 使用 `split_part(name, '/', 1)` 匹配 auth.uid()
  - [ ] 验证删除 RLS 同样限制
- [ ] 确认 rollback 文件
- [ ] 本地测试：用户 A 无法上传到用户 B 的目录

## Dev Notes

### Storage RLS 核心逻辑

```sql
-- 路径格式：skills/{author_id}/{skill_slug}/{version}/package.zip
-- split_part(name, '/', 1) 取第一段（author_id）
CREATE POLICY skills_upload ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'skills' AND
    auth.uid()::text = split_part(name, '/', 1)
  );
```

### 文件路径规范

```
skills/
└── {author_id}/
    └── {skill_slug}/
        └── {version}/
            └── package.zip
```

### 注意事项

- Bucket 设为 private，不通过公共 URL 直接访问
- 下载必须通过 `skills-download` Edge Function 生成签名 URL（有效期 5 分钟）
- 不要添加 SELECT RLS for storage.objects（通过 Edge Function 控制访问）

### Project Structure Notes

- 依赖 Epic 29.1-29.3 完成
- `skillStorageService.ts` 已存在于 `app/src/services/skill/skillStorageService.ts`

### References

- Storage 设计：[Source: docs/planning-artifacts/architecture.md#4. 存储设计]
- 文件路径规范：[Source: docs/planning-artifacts/architecture.md#4.2 文件路径规范]
- Storage RLS：[Source: docs/planning-artifacts/architecture.md#4.3 Storage RLS 策略]

## Dev Agent Record

### Agent Model Used

_待填写_

### Debug Log References

### Completion Notes List

### File List

- `app/supabase/migrations/00005_add_skills_storage.sql`
- `app/supabase/migrations/rollbacks/00005_add_skills_storage_rollback.sql`
- `app/supabase/migration-manifest.yaml`
