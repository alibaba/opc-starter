# Story 34.1: 我的 Skills 页面

Status: done

## Story

作为登录用户，
我想查看和管理我发布的所有 Skill，
以便了解发布状态并进行编辑、删除操作。

## Acceptance Criteria

1. `pages/skills/UserSkillsPage.tsx` 存在并实现
2. 展示当前用户发布的所有 Skill（含 draft）
3. Skill 状态标签：draft（灰色）/ public（绿色）/ private（黄色）
4. 每个 Skill 有操作：编辑、删除、查看（详情页）
5. 统计概览：总 Skill 数、总下载量、总点赞数
6. 空状态：引导发布第一个 Skill
7. 路由 `/my-skills` 已配置，需认证

## Tasks / Subtasks

- [ ] 检查 `pages/skills/UserSkillsPage.tsx` (AC: 1-7)
  - [ ] 确认使用 `useSkillStore.loadUserSkills()` 加载数据
  - [ ] 确认状态 Badge 颜色区分
  - [ ] 确认操作按钮（编辑跳转、删除确认）
  - [ ] 确认统计概览卡片
  - [ ] 确认空状态
- [ ] 确认路由 `/my-skills` 含认证保护

## Dev Notes

### 现有文件

- `app/src/pages/skills/UserSkillsPage.tsx` — 已存在，检查后补全

### 状态 Badge 颜色

```tsx
const STATUS_BADGE = {
  draft: { label: '草稿', className: 'bg-gray-100 text-gray-600' },
  public: { label: '已发布', className: 'bg-green-100 text-green-600' },
  private: { label: '私有', className: 'bg-yellow-100 text-yellow-600' },
};
```

### 统计计算

```typescript
// 从 userSkills 计算汇总统计
const stats = {
  totalSkills: userSkills.length,
  totalDownloads: userSkills.reduce((sum, s) => sum + s.downloads_count, 0),
  totalLikes: userSkills.reduce((sum, s) => sum + s.likes_count, 0),
};
```

### Project Structure Notes

- 数据通过 `useSkillStore.loadUserSkills()` 加载（RLS 自动过滤当前用户）

### References

- Story 需求：[Source: docs/planning-artifacts/epics-and-stories.md#Story 34.1]

## Dev Agent Record

### Agent Model Used

_待填写_

### Debug Log References

### Completion Notes List

### File List

- `app/src/pages/skills/UserSkillsPage.tsx`
