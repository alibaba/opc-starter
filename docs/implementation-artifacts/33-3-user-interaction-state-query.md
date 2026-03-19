# Story 33.3: 用户交互状态查询

Status: done

## Story

作为登录用户，
我想在浏览 Skill 列表和详情时看到我的点赞/收藏状态，
以便清楚知道哪些 Skill 已互动过。

## Acceptance Criteria

1. 详情页加载时获取当前用户的点赞/收藏状态
2. 列表页批量查询交互状态（性能优化）
3. 已点赞/收藏的 Skill 按钮状态正确激活
4. 未登录用户不查询（无 user_id）

## Tasks / Subtasks

- [ ] 详情页交互状态查询 (AC: 1, 3)
  - [ ] `skillService.getBySlug()` 扩展：如有 user_id，查询 skill_likes/skill_favorites 状态
  - [ ] 或在详情页单独查询 `is_liked`, `is_favorited`
- [ ] 列表页批量查询优化 (AC: 2)
  - [ ] 查询用户对当前列表中所有 Skill 的点赞/收藏状态
  - [ ] 使用 `skill_id=in.(id1,id2,...)` 批量查询
- [ ] 确认未登录时跳过查询 (AC: 4)

## Dev Notes

### 详情页查询模式

```typescript
// 方式 1：在 getBySlug 中附加查询（推荐）
async getBySlugWithUserState(slug: string, userId?: string) {
  const skill = await this.getBySlug(slug);
  if (!userId || !skill) return skill;

  const [likeResult, favoriteResult] = await Promise.all([
    supabase.from('skill_likes')
      .select('id').eq('skill_id', skill.id).eq('user_id', userId).single(),
    supabase.from('skill_favorites')
      .select('id').eq('skill_id', skill.id).eq('user_id', userId).single(),
  ]);

  return {
    ...skill,
    is_liked: !!likeResult.data,
    is_favorited: !!favoriteResult.data,
  };
}
```

### 批量查询（列表页）

```typescript
// 批量获取用户对多个 Skill 的交互状态
async getUserInteractions(skillIds: string[], userId: string) {
  const [likes, favorites] = await Promise.all([
    supabase.from('skill_likes')
      .select('skill_id').eq('user_id', userId).in('skill_id', skillIds),
    supabase.from('skill_favorites')
      .select('skill_id').eq('user_id', userId).in('skill_id', skillIds),
  ]);

  return {
    likedIds: new Set(likes.data?.map(l => l.skill_id) ?? []),
    favoritedIds: new Set(favorites.data?.map(f => f.skill_id) ?? []),
  };
}
```

### Project Structure Notes

- 修改 `skillService.ts` 添加交互状态查询
- Store 中存储用户交互状态

### References

- Story 需求：[Source: docs/planning-artifacts/epics-and-stories.md#Story 33.3]
- API 设计：[Source: docs/planning-artifacts/architecture.md#5.1.3 用户操作]

## Dev Agent Record

### Agent Model Used

_待填写_

### Debug Log References

### Completion Notes List

### File List

- `app/src/services/skill/skillService.ts`（修改，添加交互状态查询）
