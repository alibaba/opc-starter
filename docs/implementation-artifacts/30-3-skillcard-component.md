# Story 30.3: SkillCard 组件

Status: done

## Story

作为用户，
我想看到展示 Skill 关键信息的卡片，
以便快速了解 Skill 的名称、描述、标签、统计数据和作者。

## Acceptance Criteria

1. `components/skills/SkillCard.tsx` 已存在并实现
2. 卡片内容：名称（bold）、描述（2 行截断）、标签 Badge、平台标签
3. 统计信息：下载量 + 点赞数（StatsBadge 组件）
4. 作者信息：头像 + 用户名
5. 交互状态：hover 阴影 + 边框高亮
6. 整卡可点击，跳转到 `/skill/:slug`
7. 键盘可聚焦，有 ARIA label
8. `components/skills/StatsBadge.tsx` 已创建

## Tasks / Subtasks

- [ ] 检查 `components/skills/SkillCard.tsx` (AC: 1-7)
  - [ ] 确认描述使用 `line-clamp-2`（Tailwind v4）
  - [ ] 确认 hover 效果：`hover:shadow-md hover:border-primary`
  - [ ] 确认使用 `<Link to={/skill/${skill.slug}}>` 包裹整卡
  - [ ] 确认 ARIA label
- [ ] 检查或创建 `components/skills/StatsBadge.tsx` (AC: 3, 8)
  - [ ] 展示下载量图标 + 数字
  - [ ] 展示点赞数图标 + 数字
- [ ] 验证组件在首页正确渲染

## Dev Notes

### 现有组件

- `app/src/components/skills/SkillCard.tsx` — 已存在，检查后补全
- 检查是否已有 StatsBadge（可能在同目录）

### Tailwind v4 文本截断

```tsx
// 2 行截断
<p className="line-clamp-2 text-sm text-muted-foreground">
  {skill.description}
</p>
```

### 卡片结构参考

```tsx
<Link
  to={`/skill/${skill.slug}`}
  className="group block rounded-lg border border-border p-4 hover:shadow-md hover:border-primary/50 transition-all"
  aria-label={`查看 Skill: ${skill.name}`}
>
  {/* 头部：名称 + 平台 */}
  {/* 描述 */}
  {/* 标签 */}
  {/* 底部：统计 + 作者 */}
</Link>
```

### Project Structure Notes

- 组件路径：`app/src/components/skills/`
- 使用 shadcn/ui Badge 组件
- 使用 react-router-dom Link 组件

### References

- Story 需求：[Source: docs/planning-artifacts/epics-and-stories.md#Story 30.3]

## Dev Agent Record

### Agent Model Used

_待填写_

### Debug Log References

### Completion Notes List

### File List

- `app/src/components/skills/SkillCard.tsx`
- `app/src/components/skills/StatsBadge.tsx`
