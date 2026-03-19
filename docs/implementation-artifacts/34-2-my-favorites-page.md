# Story 34.2: 我的收藏页面

Status: done

## Story

作为登录用户，
我想查看我收藏的所有 Skill，
以便快速找到我关注的 Skill。

## Acceptance Criteria

1. `pages/skills/UserFavoritesPage.tsx` 存在并实现
2. 展示当前用户收藏的 Skill 列表（SkillCard 网格）
3. 支持取消收藏（点击按钮后从列表移除）
4. 空状态：引导去发现 Skill（链接到首页）
5. 路由 `/favorites` 已配置，需认证

## Tasks / Subtasks

- [ ] 检查 `pages/skills/UserFavoritesPage.tsx` (AC: 1-5)
  - [ ] 确认使用 `useSkillStore.loadUserFavorites()` 加载数据
  - [ ] 确认取消收藏后列表实时更新
  - [ ] 确认空状态有跳转到首页的操作按钮
- [ ] 确认路由 `/favorites` 含认证保护

## Dev Notes

### 现有文件

- `app/src/pages/skills/UserFavoritesPage.tsx` — 已存在，检查后补全

### 取消收藏后更新列表

```typescript
// 取消收藏后从本地状态移除，无需重新请求
const handleUnfavorite = async (skillId: string) => {
  await skillService.unfavorite(skillId, user.id);
  // 更新 store 中的 userFavorites
  setUserFavorites(prev => prev.filter(s => s.id !== skillId));
};
```

### 空状态配置

```tsx
<EmptyState
  {...EMPTY_STATE_PRESETS.noFavorites}
  action={{
    label: '发现 Skills',
    onClick: () => navigate('/'),
  }}
/>
```

### Project Structure Notes

- 复用 SkillCard 组件（传入 isFavorited=true + onUnfavorite 回调）

### References

- Story 需求：[Source: docs/planning-artifacts/epics-and-stories.md#Story 34.2]

## Dev Agent Record

### Agent Model Used

_待填写_

### Debug Log References

### Completion Notes List

### File List

- `app/src/pages/skills/UserFavoritesPage.tsx`
