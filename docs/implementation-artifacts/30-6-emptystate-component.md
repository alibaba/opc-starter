# Story 30.6: EmptyState 组件

Status: done

## Story

作为用户，
我想在没有内容时看到友好的空状态提示，
以便了解当前状态并获得下一步操作引导。

## Acceptance Criteria

1. `components/skills/EmptyState.tsx` 创建完成
2. Props：icon, title, description, action（可选按钮）
3. 预设场景：noSearchResults, noSkills, noFavorites
4. 搜索无结果时展示建议文案
5. 视觉风格：柔和图标 + 引导文字，与整体设计一致
6. Action 按钮可触发对应操作

## Tasks / Subtasks

- [ ] 创建 `components/skills/EmptyState.tsx` (AC: 1-6)
  - [ ] 定义 EmptyStateProps 接口
  - [ ] 实现 icon（ReactNode）、title、description、action 渲染
  - [ ] 创建 3 个预设配置对象供复用
- [ ] 在 SearchPage 中使用（搜索无结果时）
- [ ] 在 HomePage 中使用（无 Skill 时）

## Dev Notes

### 组件接口设计

```tsx
interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

// 预设场景配置
export const EMPTY_STATE_PRESETS = {
  noSearchResults: {
    icon: <SearchX className="size-12 text-muted-foreground/50" />,
    title: '未找到相关 Skill',
    description: '尝试使用不同的关键词，或浏览热门标签',
  },
  noSkills: {
    icon: <PackageOpen className="size-12 text-muted-foreground/50" />,
    title: '还没有发布任何 Skill',
    description: '成为第一个发布 Skill 的开发者吧！',
  },
  noFavorites: {
    icon: <Bookmark className="size-12 text-muted-foreground/50" />,
    title: '还没有收藏任何 Skill',
    description: '浏览 Skills Hub，收藏你喜欢的 Skill',
  },
};
```

### 视觉规范（Tailwind v4）

```tsx
<div className="flex flex-col items-center justify-center py-16 text-center">
  <div className="mb-4">{icon}</div>
  <h3 className="text-lg font-medium">{title}</h3>
  <p className="mt-1 text-sm text-muted-foreground">{description}</p>
  {action && (
    <Button className="mt-4" onClick={action.onClick}>
      {action.label}
    </Button>
  )}
</div>
```

### Project Structure Notes

- 组件路径：`app/src/components/skills/EmptyState.tsx`
- 使用 lucide-react 图标（SearchX, PackageOpen, Bookmark）
- 使用 shadcn/ui Button 组件

### References

- Story 需求：[Source: docs/planning-artifacts/epics-and-stories.md#Story 30.6]

## Dev Agent Record

### Agent Model Used

_待填写_

### Debug Log References

### Completion Notes List

### File List

- `app/src/components/skills/EmptyState.tsx`
