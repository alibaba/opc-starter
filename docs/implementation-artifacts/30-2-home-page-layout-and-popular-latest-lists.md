# Story 30.2: 首页布局与热门/最新列表

Status: done

## Story

作为访客，
我想看到一个展示热门和最新 Skill 的首页，
以便快速了解平台内容并找到感兴趣的 Skill。

## Acceptance Criteria

1. `pages/skills/HomePage.tsx` 已存在并正确实现
2. 顶部导航：Logo + 搜索栏 + 登录/注册按钮
3. 热门标签区域：Badge 组件展示热门标签
4. 热门 Skills 区域：3 列（xl）/ 2 列（md）/ 1 列（sm）SkillCard 网格
5. 最新发布区域：同上
6. 加载状态使用 Skeleton 组件
7. 无 Skill 时展示空状态（EmptyState 组件）
8. 路由 `/` 已配置

## Tasks / Subtasks

- [ ] 检查 `pages/skills/HomePage.tsx` 实现 (AC: 1-7)
  - [ ] 确认导入 useSkillStore 获取 popularSkills, latestSkills
  - [ ] 确认响应式网格：`grid-cols-1 md:grid-cols-2 xl:grid-cols-3`（Tailwind v4 语法）
  - [ ] 确认 Skeleton 加载状态
  - [ ] 确认空状态展示
- [ ] 确认路由配置 `/` (AC: 8)
  - [ ] 检查 `app/src/config/routes.tsx` 或 `App.tsx`
- [ ] 运行 `npm run dev:test` 验证页面渲染

## Dev Notes

### 现有文件

- `app/src/pages/skills/HomePage.tsx` — 已存在，检查后完善缺失功能
- `app/src/pages/skills/index.ts` — 已存在

### Tailwind CSS v4 重要语法

```tsx
// v4 语法（正确）
<div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">

// 禁止使用 v2/v3 语法：bg-opacity-*、bg-gradient-to-*
// v4 不透明度语法：bg-black/50（而非 bg-black bg-opacity-50）
```

### 状态加载模式

```tsx
// 使用 useSkillStore
const { popularSkills, latestSkills, isLoadingPopular, loadPopular, loadLatest } = useSkillStore();

useEffect(() => {
  loadPopular();
  loadLatest();
}, []);
```

### Project Structure Notes

- 页面路径：`app/src/pages/skills/`
- 组件路径：`app/src/components/skills/`
- 路由配置：检查 `app/src/App.tsx` 或 `app/src/config/`

### References

- 首页 Story：[Source: docs/planning-artifacts/epics-and-stories.md#Story 30.2]
- 前端目录结构：[Source: docs/planning-artifacts/architecture.md#6.1 目录结构]

## Dev Agent Record

### Agent Model Used

_待填写_

### Debug Log References

### Completion Notes List

### File List

- `app/src/pages/skills/HomePage.tsx`
- `app/src/pages/skills/index.ts`
