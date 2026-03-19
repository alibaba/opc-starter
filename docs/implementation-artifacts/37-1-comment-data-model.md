# Story 37.1: 评论数据模型

Status: ready-for-dev

## Story

作为系统，
我想创建评论表和对应的 RLS 策略，
以便为评论功能提供数据基础。

## Acceptance Criteria

1. `skill_comments` 表创建完成
2. RLS 策略：所有人可读 / 登录用户可写自己的评论 / 用户删除自己评论 / 作者删除自己 Skill 下的评论
3. 计数触发器：`skills.comments_count` 自动更新（如 skills 表有此字段）
4. Migration 文件和 Rollback 文件已创建
5. migration-manifest.yaml 已更新

## Tasks / Subtasks

- [ ] 创建 migration 文件（下一个序号，如 00006）
  - [ ] `skill_comments` 表：id, skill_id, user_id, content, created_at
  - [ ] Markdown 内容字段
  - [ ] 启用 RLS 并配置策略
  - [ ] 可选：评论计数触发器
- [ ] 创建 rollback 文件
- [ ] 更新 migration-manifest.yaml

## Dev Notes

### 表结构

```sql
CREATE TABLE IF NOT EXISTS public.skill_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  skill_id UUID NOT NULL REFERENCES public.skills(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL CHECK (char_length(content) >= 1 AND char_length(content) <= 2000),
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 索引
CREATE INDEX idx_skill_comments_skill ON public.skill_comments(skill_id);
CREATE INDEX idx_skill_comments_user ON public.skill_comments(user_id);
CREATE INDEX idx_skill_comments_created ON public.skill_comments(created_at DESC);
```

### RLS 策略

```sql
-- 所有人可查看评论
CREATE POLICY skill_comments_select ON public.skill_comments
  FOR SELECT USING (true);

-- 登录用户可发评论
CREATE POLICY skill_comments_insert ON public.skill_comments
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL AND auth.uid() = user_id);

-- 用户删除自己的评论 OR Skill 作者删除评论
CREATE POLICY skill_comments_delete ON public.skill_comments
  FOR DELETE USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM public.skills WHERE id = skill_id AND author_id = auth.uid()
    )
  );
```

### Project Structure Notes

- Migration 序号：检查 `app/supabase/migrations/` 最新序号 +1
- 遵循项目 Migration 规范

### References

- Story 需求：[Source: docs/planning-artifacts/epics-and-stories.md#Story 37.1]
- Migration 规范：[Source: AGENTS.md]

## Dev Agent Record

### Agent Model Used

_待填写_

### Debug Log References

### Completion Notes List

### File List

- `app/supabase/migrations/00006_add_skill_comments.sql`
- `app/supabase/migrations/rollbacks/00006_add_skill_comments_rollback.sql`
- `app/supabase/migration-manifest.yaml`
