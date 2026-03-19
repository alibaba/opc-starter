# Story 30.1: TypeScript 类型定义与服务层

Status: done

## Story

作为前端开发者，
我想建立 Skills Hub 核心 TypeScript 类型和服务层基础，
以便后续所有 Skill 相关功能有统一的类型约束和数据访问接口。

## Acceptance Criteria

1. `types/skill.ts` 包含完整类型：Skill, SkillVersion, SkillAuthor, SkillSearchParams, SkillSearchResult, CreateSkillRequest, UpdateSkillRequest
2. `services/skill/skillService.ts` 实现 getBySlug, getPopular, getLatest, search, create, update, delete, like, unlike, favorite, unfavorite
3. `services/skill/skillSearchService.ts` 封装搜索逻辑（或合并到 skillService）
4. `stores/useSkillStore.ts` 包含搜索状态、首页数据、用户数据及所有 Actions
5. 服务层可正确查询 Supabase，类型定义完整

## Tasks / Subtasks

- [ ] 检查并完善 `types/skill.ts` (AC: 1)
  - [ ] 核对现有类型是否包含 SkillPlatform, SkillVisibility
  - [ ] 确认 CreateSkillRequest, UpdateSkillRequest 已定义
- [ ] 检查并完善 `services/skill/skillService.ts` (AC: 2)
  - [ ] 确认 getPopular, getLatest 方法存在
  - [ ] 确认 like/unlike/favorite/unfavorite 方法存在
- [ ] 检查 `stores/useSkillStore.ts` (AC: 4)
  - [ ] 确认 popularSkills, latestSkills 状态已定义
  - [ ] 确认 loadPopular, loadLatest actions 存在
- [ ] 运行 `npm run type-check` 确保无类型错误

## Dev Notes

### 现有代码基础

**已存在的文件（勿重建，检查后补全缺失部分）：**
- `app/src/types/skill.ts` — 已存在
- `app/src/services/skill/skillService.ts` — 已存在
- `app/src/services/skill/skillStorageService.ts` — 已存在
- `app/src/services/skill/index.ts` — 已存在
- `app/src/stores/useSkillStore.ts` — 已存在

### 核心类型定义参考

```typescript
// types/skill.ts
export type SkillVisibility = 'draft' | 'public' | 'private';
export type SkillPlatform = 'qoder' | 'cursor' | 'claude' | 'cline' | 'windsurf';

export interface Skill {
  id: string;
  author_id: string;
  name: string;
  slug: string;
  description: string | null;
  readme: string | null;
  visibility: SkillVisibility;
  tags: string[];
  platforms: SkillPlatform[];
  latest_version: string | null;
  downloads_count: number;
  likes_count: number;
  favorites_count: number;
  created_at: string;
  updated_at: string;
  published_at: string | null;
  author?: SkillAuthor;
  versions?: SkillVersion[];
  is_liked?: boolean;
  is_favorited?: boolean;
}
```

### Supabase 查询模式

```typescript
// 关联查询格式（PostgREST）
supabase.from('skills')
  .select('*, author:profiles(id, full_name, avatar_url), versions:skill_versions(id, version, created_at, file_size)')
  .eq('visibility', 'public')
  .order('downloads_count', { ascending: false })
  .limit(10)
```

### Project Structure Notes

- 服务层路径：`app/src/services/skill/`
- 类型路径：`app/src/types/skill.ts`
- Store 路径：`app/src/stores/useSkillStore.ts`
- Supabase client：`@/lib/supabase/client`

### References

- 类型定义：[Source: docs/planning-artifacts/architecture.md#6.2 核心类型定义]
- 服务层设计：[Source: docs/planning-artifacts/architecture.md#6.3 服务层设计]
- 状态管理：[Source: docs/planning-artifacts/architecture.md#6.4 状态管理设计]

## Dev Agent Record

### Agent Model Used

_待填写_

### Debug Log References

### Completion Notes List

### File List

- `app/src/types/skill.ts`
- `app/src/services/skill/skillService.ts`
- `app/src/services/skill/index.ts`
- `app/src/stores/useSkillStore.ts`
