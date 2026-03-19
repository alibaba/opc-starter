# Story 37.2: 评论列表组件

Status: ready-for-dev

## Story

作为用户，
我想在 Skill 详情页看到评论列表，
以便了解其他用户对该 Skill 的反馈。

## Acceptance Criteria

1. 评论列表组件在详情页展示
2. 分页加载（每页 20 条）
3. 时间格式化（相对时间，如"3 天前"）
4. 显示评论者头像和用户名

## Tasks / Subtasks

- [ ] 创建 `components/skills/CommentList.tsx`
  - [ ] 查询 `skill_comments` 含 `author:profiles(full_name, avatar_url)`
  - [ ] 分页：load more 按钮或 IntersectionObserver
  - [ ] 相对时间格式化
- [ ] 集成到 SkillDetailPage

## Dev Notes

### 相对时间格式化

```typescript
// 使用 Intl.RelativeTimeFormat 或简单实现
const formatRelativeTime = (dateStr: string): string => {
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 60) return `${minutes} 分钟前`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} 小时前`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} 天前`;
  return new Date(dateStr).toLocaleDateString('zh-CN');
};
```

### 数据查询

```typescript
const { data } = await supabase
  .from('skill_comments')
  .select('*, author:profiles(full_name, avatar_url)')
  .eq('skill_id', skillId)
  .order('created_at', { ascending: false })
  .range(0, 19); // 分页
```

### Project Structure Notes

- 路径：`app/src/components/skills/CommentList.tsx`
- 依赖 Story 37.1 的数据模型

### References

- Story 需求：[Source: docs/planning-artifacts/epics-and-stories.md#Story 37.2]

## Dev Agent Record

### Agent Model Used

_待填写_

### Debug Log References

### Completion Notes List

### File List

- `app/src/components/skills/CommentList.tsx`
