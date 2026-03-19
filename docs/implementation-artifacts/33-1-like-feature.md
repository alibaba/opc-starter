# Story 33.1: 点赞功能

Status: done

## Story

作为登录用户，
我想对 Skill 进行点赞或取消点赞，
以便表达对优质 Skill 的认可。

## Acceptance Criteria

1. `hooks/useSkillLike.ts` 创建完成
2. 详情页点赞按钮：Heart 图标，激活状态变红
3. 乐观更新：点击后立即更新 UI，失败时回滚
4. 未登录用户点击弹出登录提示 Dialog
5. 触发器自动更新 `skills.likes_count`
6. ARIA label: "点赞此 Skill" / "取消点赞"

## Tasks / Subtasks

- [ ] 创建 `hooks/useSkillLike.ts` (AC: 1-6)
  - [ ] 状态：isLiked, likesCount, isLoading
  - [ ] 乐观更新：先更新本地状态，再调用 API，失败回滚
  - [ ] 未登录检测：调用前检查 user 是否存在
- [ ] 在详情页集成 Like 按钮
- [ ] 验证 likes_count 通过触发器更新（Story 29.3 依赖）

## Dev Notes

### 乐观更新模式

```typescript
const toggleLike = async () => {
  if (!user) {
    setShowLoginDialog(true);
    return;
  }

  // 乐观更新
  const prevLiked = isLiked;
  const prevCount = likesCount;
  setIsLiked(!isLiked);
  setLikesCount(isLiked ? likesCount - 1 : likesCount + 1);

  try {
    if (isLiked) {
      await skillService.unlike(skillId, user.id);
    } else {
      await skillService.like(skillId, user.id);
    }
  } catch {
    // 回滚
    setIsLiked(prevLiked);
    setLikesCount(prevCount);
    toast.error('操作失败，请重试');
  }
};
```

### Like 按钮样式

```tsx
<button
  onClick={toggleLike}
  aria-label={isLiked ? '取消点赞' : '点赞此 Skill'}
  className={cn(
    'flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm transition-colors',
    isLiked
      ? 'bg-red-50 text-red-500 hover:bg-red-100'
      : 'hover:bg-muted text-muted-foreground'
  )}
>
  <Heart className={cn('size-4', isLiked && 'fill-current')} />
  <span>{likesCount}</span>
</button>
```

### Project Structure Notes

- hooks 路径：`app/src/hooks/useSkillLike.ts`
- 使用 lucide-react Heart 图标
- 依赖 Story 33.4 的登录提示 Dialog

### References

- Story 需求：[Source: docs/planning-artifacts/epics-and-stories.md#Story 33.1]

## Dev Agent Record

### Agent Model Used

_待填写_

### Debug Log References

### Completion Notes List

### File List

- `app/src/hooks/useSkillLike.ts`
