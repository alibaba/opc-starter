# Story 36.1: 数据看板页面

Status: ready-for-dev

## Story

作为 Skill 作者，
我想查看我的数据看板，
以便了解我发布的 Skill 整体表现。

## Acceptance Criteria

1. `pages/skills/DashboardPage.tsx` 创建完成
2. 统计概览卡片：总下载量、总点赞、总收藏、Skill 数量
3. 路由 `/dashboard` 已配置，需认证

## Tasks / Subtasks

- [ ] 创建 `pages/skills/DashboardPage.tsx` (AC: 1-3)
  - [ ] 从 `useSkillStore.userSkills` 计算统计数据
  - [ ] 4 张概览统计卡片
- [ ] 添加路由 `/dashboard`

## Dev Notes

### 统计卡片组件

```tsx
interface StatsCardProps {
  title: string;
  value: number;
  icon: React.ReactNode;
}

function StatsCard({ title, value, icon }: StatsCardProps) {
  return (
    <div className="rounded-lg border p-4">
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">{title}</div>
        {icon}
      </div>
      <div className="mt-2 text-2xl font-bold">{value.toLocaleString()}</div>
    </div>
  );
}
```

### Project Structure Notes

- 复用 `userSkills` 数据，无需额外 API 调用
- 依赖 Story 34.1 的"我的 Skills"数据加载

### References

- Story 需求：[Source: docs/planning-artifacts/epics-and-stories.md#Story 36.1]

## Dev Agent Record

### Agent Model Used

_待填写_

### Debug Log References

### Completion Notes List

### File List

- `app/src/pages/skills/DashboardPage.tsx`
