# Story 31.1: Skill 详情页布局

Status: done

## Story

作为用户，
我想查看 Skill 的完整详情页，
以便了解 Skill 的功能、安装方式、版本历史和作者信息。

## Acceptance Criteria

1. `pages/skills/SkillDetailPage.tsx` 存在并实现
2. 标题区：Skill 名称 + 作者卡片 + 点赞/收藏按钮
3. 标签区：标签 Badge + 平台 Badge
4. 左侧（2/3）：README 渲染区 + 版本历史标签页
5. 右侧（1/3）：安装命令 + 版本选择器 + 统计信息
6. 响应式：md 以下改为垂直堆叠
7. 面包屑导航（首页 > Skill 名称）
8. 路由 `/skill/:slug` 已配置
9. 使用 `skillService.getBySlug()` 加载数据，加载中展示 Skeleton

## Tasks / Subtasks

- [ ] 检查 `pages/skills/SkillDetailPage.tsx` (AC: 1-9)
  - [ ] 确认路由参数 `slug` 通过 `useParams` 获取
  - [ ] 确认两栏布局：`grid-cols-1 md:grid-cols-3`
  - [ ] 确认面包屑导航
  - [ ] 确认 Skeleton 加载状态
- [ ] 确认路由 `/skill/:slug` 配置
- [ ] 验证页面正确加载 Skill 数据

## Dev Notes

### 现有文件

- `app/src/pages/skills/SkillDetailPage.tsx` — 已存在，检查后补全

### 布局结构

```tsx
// 两栏布局（md 以上）
<div className="grid grid-cols-1 md:grid-cols-3 gap-8">
  {/* 左侧 2/3 */}
  <div className="md:col-span-2">
    <ReadmeRenderer content={skill.readme} />
    {/* 版本历史标签页 */}
  </div>
  {/* 右侧 1/3 */}
  <div className="md:col-span-1">
    <InstallCommand slug={skill.slug} version={selectedVersion} />
    <VersionSelector versions={skill.versions} onChange={setSelectedVersion} />
    {/* 统计信息 */}
  </div>
</div>
```

### 数据加载模式

```tsx
const { slug } = useParams<{ slug: string }>();
const { currentSkill, isLoadingSkill, loadSkill } = useSkillStore();

useEffect(() => {
  if (slug) loadSkill(slug);
}, [slug]);
```

### Project Structure Notes

- `ReadmeRenderer` 已存在：`app/src/components/skills/ReadmeRenderer.tsx`
- `InstallCommand` 已存在：`app/src/components/skills/InstallCommand.tsx`
- `VersionSelector` 已存在：`app/src/components/skills/VersionSelector.tsx`

### References

- Story 需求：[Source: docs/planning-artifacts/epics-and-stories.md#Story 31.1]

## Dev Agent Record

### Agent Model Used

_待填写_

### Debug Log References

### Completion Notes List

### File List

- `app/src/pages/skills/SkillDetailPage.tsx`
