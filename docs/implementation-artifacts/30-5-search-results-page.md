# Story 30.5: 搜索结果页

Status: done

## Story

作为用户，
我想在搜索结果页看到筛选和排序功能，
以便精确找到符合需求的 Skill。

## Acceptance Criteria

1. `pages/skills/SearchPage.tsx` 存在并实现
2. URL 参数同步：`/search?q=keyword&tags=react&sort=downloads`
3. 搜索结果列表：SkillCard 网格（响应式）
4. 筛选区域：平台筛选 Dropdown、标签筛选
5. 排序选择：最新 / 最热 / 下载量
6. 分页或加载更多
7. 空状态：EmptyState 组件展示
8. 路由 `/search` 已配置

## Tasks / Subtasks

- [ ] 检查 `pages/skills/SearchPage.tsx` (AC: 1-7)
  - [ ] 确认使用 `useSearchParams` 同步 URL 参数
  - [ ] 确认平台筛选、标签筛选、排序控件
  - [ ] 确认分页或 IntersectionObserver 无限加载
  - [ ] 确认空状态使用 EmptyState 组件
- [ ] 确认路由 `/search` (AC: 8)
- [ ] 验证 URL 参数变化时搜索结果刷新

## Dev Notes

### URL 参数同步模式

```tsx
import { useSearchParams } from 'react-router-dom';

const [searchParams, setSearchParams] = useSearchParams();
const query = searchParams.get('q') ?? '';
const sort = searchParams.get('sort') ?? 'downloads';

// 更新参数时
setSearchParams({ q: newQuery, sort: newSort });
```

### 排序选项

```typescript
const SORT_OPTIONS = [
  { value: 'downloads', label: '下载量最多' },
  { value: 'likes', label: '点赞最多' },
  { value: 'created_at', label: '最新发布' },
];
```

### 现有文件

- `app/src/pages/skills/SearchPage.tsx` — 已存在，检查后补全

### Project Structure Notes

- 使用 `useSkillStore` 的 `search` action 和 `searchResults` 状态
- 平台选项来自 `SkillPlatform` 类型：`'qoder' | 'cursor' | 'claude' | 'cline' | 'windsurf'`

### References

- Story 需求：[Source: docs/planning-artifacts/epics-and-stories.md#Story 30.5]

## Dev Agent Record

### Agent Model Used

_待填写_

### Debug Log References

### Completion Notes List

### File List

- `app/src/pages/skills/SearchPage.tsx`
