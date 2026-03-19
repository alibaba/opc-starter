# Story 33.2: 收藏功能

Status: done

## Story

作为登录用户，
我想对 Skill 进行收藏或取消收藏，
以便在用户中心快速找到常用 Skill。

## Acceptance Criteria

1. `hooks/useSkillFavorite.ts` 创建完成
2. 详情页收藏按钮：Bookmark 图标，激活状态高亮
3. 乐观更新
4. 未登录用户点击弹出登录提示 Dialog
5. 触发器自动更新 `skills.favorites_count`
6. ARIA label: "收藏此 Skill" / "取消收藏"

## Tasks / Subtasks

- [ ] 创建 `hooks/useSkillFavorite.ts` (AC: 1-6)
  - [ ] 与 useSkillLike 相同的乐观更新模式
  - [ ] 调用 `skillService.favorite / unfavorite`
- [ ] 在详情页集成 Favorite 按钮
- [ ] 验证收藏后在"我的收藏"页可见

## Dev Notes

### Hook 接口（参考 useSkillLike）

```typescript
export function useSkillFavorite(skillId: string, initialFavorited: boolean, initialCount: number) {
  const [isFavorited, setIsFavorited] = useState(initialFavorited);
  const [favoritesCount, setFavoritesCount] = useState(initialCount);
  const { user } = useAuthStore();

  const toggleFavorite = async () => {
    if (!user) { /* 弹登录 */ return; }
    // 乐观更新 + try/catch 回滚（同 useSkillLike）
  };

  return { isFavorited, favoritesCount, toggleFavorite };
}
```

### Bookmark 按钮样式

```tsx
<button
  onClick={toggleFavorite}
  aria-label={isFavorited ? '取消收藏' : '收藏此 Skill'}
  className={cn(
    'flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm transition-colors',
    isFavorited
      ? 'bg-yellow-50 text-yellow-600 hover:bg-yellow-100'
      : 'hover:bg-muted text-muted-foreground'
  )}
>
  <Bookmark className={cn('size-4', isFavorited && 'fill-current')} />
  <span>{favoritesCount}</span>
</button>
```

### Project Structure Notes

- hooks 路径：`app/src/hooks/useSkillFavorite.ts`
- 使用 lucide-react Bookmark 图标

### References

- Story 需求：[Source: docs/planning-artifacts/epics-and-stories.md#Story 33.2]

## Dev Agent Record

### Agent Model Used

_待填写_

### Debug Log References

### Completion Notes List

### File List

- `app/src/hooks/useSkillFavorite.ts`
