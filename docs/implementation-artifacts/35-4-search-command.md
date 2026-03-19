# Story 35.4: search 命令实现

Status: ready-for-dev

## Story

作为开发者，
我想通过 `skill-hub search <keyword>` 在命令行搜索 Skill，
以便不打开浏览器就能找到需要的 Skill。

## Acceptance Criteria

1. 解析搜索关键词
2. 调用 PostgREST API 搜索（直接查 Supabase）
3. 表格格式展示结果（名称、描述截断、下载量、最新版本）
4. 支持 `--platform` 筛选（如 `--platform cursor`）
5. 支持 `--tag` 筛选（如 `--tag react`）

## Tasks / Subtasks

- [ ] 创建 `cli/src/commands/search.ts` (AC: 1-5)
  - [ ] 使用 Supabase REST API（`VITE_SUPABASE_URL` 读取自配置）
  - [ ] 构建 PostgREST 查询 URL
  - [ ] 格式化表格输出
- [ ] 注册 `--platform` 和 `--tag` 选项

## Dev Notes

### PostgREST 直接调用

```typescript
// 无需 supabase-js，直接调用 REST API
const url = new URL(`${SUPABASE_URL}/rest/v1/skills`);
url.searchParams.set('select', 'name,slug,description,downloads_count,latest_version');
url.searchParams.set('visibility', 'eq.public');
url.searchParams.set('or', `name.ilike.%${keyword}%,description.ilike.%${keyword}%`);
url.searchParams.set('order', 'downloads_count.desc');
url.searchParams.set('limit', '10');

const res = await fetch(url.toString(), {
  headers: {
    'apikey': SUPABASE_ANON_KEY,
    'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
  },
});
```

### 配置文件

```json
// ~/.skill-hub/config.json
{
  "supabase_url": "https://xxx.supabase.co",
  "supabase_anon_key": "eyJxxx..."
}
```

### Project Structure Notes

- CLI 需要内置 Supabase URL 和 anon key（通过构建时注入或配置文件）

### References

- Story 需求：[Source: docs/planning-artifacts/epics-and-stories.md#Story 35.4]

## Dev Agent Record

### Agent Model Used

_待填写_

### Debug Log References

### Completion Notes List

### File List

- `cli/src/commands/search.ts`
- `cli/src/config.ts`
