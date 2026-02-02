# 编码约束与规范

## Tailwind CSS v4 语法 (Mandatory)

本项目使用 Tailwind CSS v4.1，**必须**使用 v4 语法，**禁止**使用 v2/v3 语法。

### 透明度语法

```tsx
// ❌ Forbidden: v2/v3 syntax
className="bg-opacity-50 text-opacity-75 border-opacity-50"

// ✅ Required: v4 syntax
className="bg-black/50 text-white/75 border-gray-500/50"
```

| Forbidden (v2/v3) | Required (v4) |
|-------------------|---------------|
| `bg-opacity-*` | `bg-color/opacity` |
| `text-opacity-*` | `text-color/opacity` |
| `border-opacity-*` | `border-color/opacity` |
| `ring-opacity-*` | `ring-color/opacity` |
| `divide-opacity-*` | `divide-color/opacity` |
| `placeholder-opacity-*` | `placeholder:text-color/opacity` |

### 渐变语法

```tsx
// ❌ Forbidden: v3 syntax
className="bg-gradient-to-r from-purple-500 to-pink-500"

// ✅ Required: v4 syntax
className="bg-linear-to-r from-purple-500 to-pink-500"
```

| v3 (兼容但不推荐) | v4 (规范语法) |
|------------------|--------------|
| `bg-gradient-to-t` | `bg-linear-to-t` |
| `bg-gradient-to-r` | `bg-linear-to-r` |
| `bg-gradient-to-b` | `bg-linear-to-b` |
| `bg-gradient-to-l` | `bg-linear-to-l` |

## 数据操作规范

### 必须通过 DataService 访问数据

```typescript
import { dataService } from '@/services/data/DataService'

// ✅ Correct
await dataService.getAllPhotos()
await dataService.optimisticUpdate(id, updates)

// ❌ Forbidden - never import directly
import { photoDB } from '@/services/db/photoDB'
import { supabase } from '@/lib/supabase/client'
```

### SQL 变更集中管理

所有数据库变更 → `app/supabase/setup.sql`

禁止创建独立 SQL 迁移文件。

## 前后端一致性检查 (Critical) ⚠️

### 枚举值与 CHECK 约束同步

当前端 TypeScript 类型新增枚举值时，**必须**同步更新数据库 CHECK 约束。

**检查流程**：

1. 找到前端类型定义（如 `src/types/album.ts`）
2. 找到对应的 SQL CHECK 约束（`supabase/setup.sql`）
3. 确保所有枚举值在 CHECK 约束中存在

**示例**：

```typescript
// src/types/album.ts
export type AlbumVisibility = 'private' | 'organization' | 'public';  // 新增 'public'
```

```sql
-- supabase/setup.sql 必须同步更新
visibility TEXT CHECK (visibility IN ('private', 'organization', 'public'))  -- 必须包含 'public'
```

### 常见遗漏场景

| 场景 | 问题 | 错误表现 |
|------|------|----------|
| 新增枚举值 | 前端新增，但 CHECK 约束未更新 | `violates check constraint` |
| 新增字段 | 前端使用，但表未添加列 | `column does not exist` |
| 修改默认值 | 前后端默认值不一致 | 数据不一致 |
| 修改 NOT NULL | 前端允许空，后端 NOT NULL | `null value in column` |

### 线上数据库迁移

当 `setup.sql` 中的表结构变更时，需要在线上 Supabase SQL Editor 执行迁移：

```sql
-- 示例：更新 CHECK 约束（新增枚举值）
ALTER TABLE public.albums 
  DROP CONSTRAINT IF EXISTS albums_visibility_check;
ALTER TABLE public.albums
  ADD CONSTRAINT albums_visibility_check 
  CHECK (visibility IN ('private', 'organization', 'public'));

-- 验证
SELECT constraint_name, check_clause
FROM information_schema.check_constraints 
WHERE constraint_name LIKE '%visibility%';
```

### 自检清单

开发涉及数据库的功能时，完成以下检查：

- [ ] TypeScript 类型与 SQL 表定义字段一致
- [ ] 所有枚举值在 CHECK 约束中存在
- [ ] 新增字段已添加到 SQL 表定义
- [ ] 默认值前后端一致
- [ ] 线上数据库已执行迁移（如需要）

## Photo 数据流

### Photo Type 字段变更

新增字段时，必须更新以下所有位置：

1. `src/types/photo.ts` - TypeScript interface
2. `src/services/api/index.ts` - `transformSupabasePhoto()` function
3. `src/services/data/DataService.ts` - `transformSupabasePhoto()` method
4. `src/services/db/photoDB.ts` - sorting/indexing if needed

### 日期字段优先级

| Field | Database | Purpose |
|-------|----------|---------|
| `takenAt` | `taken_at` | 拍摄日期 (from EXIF or user input) |
| `uploadedAt` | `created_at` | 上传时间 |

**Timeline 显示必须优先使用 `takenAt`，fallback 到 `uploadedAt`：**

```typescript
// ✅ Correct: prioritize takenAt
const dateSource = photo.takenAt || photo.uploadedAt;

// ❌ Wrong: only using uploadedAt
const dateSource = photo.uploadedAt;
```

### Supabase 查询排序

Timeline/Photo 列表查询，按 `taken_at` 排序：

```typescript
// ✅ Correct
.order('taken_at', { ascending: false, nullsFirst: false })

// ❌ Wrong: ordering by created_at for timeline
.order('created_at', { ascending: false })
```

### IndexedDB 缓存

修改数据转换后，用户可能需要清除 IndexedDB 缓存：
- DevTools → Application → IndexedDB → Delete database
- 或强制刷新: `Ctrl+Shift+R` / `Cmd+Shift+R`

## Album 管理

### Album Photo 操作

使用 `updateAlbum` API 的 `photoIds` 参数：

```typescript
// Add photos to album
const updatedPhotoIds = [...album.photoIds, ...newPhotoIds];
await updateAlbum(album.id, { photoIds: updatedPhotoIds });

// Remove photo from album
const updatedPhotoIds = album.photoIds.filter(id => id !== photoIdToRemove);
await updateAlbum(album.id, { photoIds: updatedPhotoIds });
```

### Edit Mode UI Pattern

```tsx
{isEditing && (
  <div className="relative group">
    <img src={photo.thumbnail} className="..." />
    <button
      onClick={() => handleRemove(photo.id)}
      className="absolute top-2 right-2 w-7 h-7 bg-red-500 hover:bg-red-600 
                 text-white rounded-full opacity-0 group-hover:opacity-100 
                 transition-opacity"
    >
      <X className="w-4 h-4" />
    </button>
  </div>
)}
```

## Organization & Ltree 处理

### Ltree 类型限制 (Critical)

`organizations.path` 列使用 PostgreSQL `ltree` 类型。**PostgREST 不支持 ltree 操作符**。

```typescript
// ❌ WRONG: PostgREST can't use ltree operators
.or(`id.eq.${orgId},path.like.${orgPath}.%`)  // Error: operator does not exist

// ✅ CORRECT: Query all, filter in JavaScript
const { data: allOrgs } = await supabase
  .from('organizations')
  .select('id, path');

const descendantOrgs = allOrgs.filter(o => 
  o.id === organizationId || 
  (o.path && o.path.startsWith(orgPath + '.'))
);
```

### Organization Hierarchy 查询

筛选组织（包含子孙组织）：

```typescript
// 1. Get the target organization's path
const { data: org } = await supabase
  .from('organizations')
  .select('path')
  .eq('id', organizationId)
  .maybeSingle();

// 2. Query ALL organizations
const { data: allOrgs } = await supabase
  .from('organizations')
  .select('id, path');

// 3. Filter in JavaScript (path starts with parent path + '.')
const orgIds = allOrgs
  .filter(o => o.id === organizationId || o.path?.startsWith(org.path + '.'))
  .map(o => o.id);

// 4. Use filtered IDs in photo query
query = query.in('organization_id', orgIds);
```

### Organization Dropdown Pattern

Click-outside 处理：

```tsx
const [showDropdown, setShowDropdown] = useState(false);
const dropdownRef = useRef<HTMLDivElement>(null);

useEffect(() => {
  const handleClickOutside = (event: MouseEvent) => {
    if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
      setShowDropdown(false);
    }
  };
  
  if (showDropdown) {
    document.addEventListener('mousedown', handleClickOutside);
  }
  return () => document.removeEventListener('mousedown', handleClickOutside);
}, [showDropdown]);

// In JSX:
<div ref={dropdownRef} className="relative">
  <Button onClick={() => setShowDropdown(!showDropdown)}>
    {selectedName} <ChevronDown />
  </Button>
  {showDropdown && (
    <div className="absolute top-full left-0 mt-1 bg-white border rounded-lg shadow-lg z-20">
      {/* dropdown items */}
    </div>
  )}
</div>
```

## React Hooks 反模式 (Critical)

### 重复 API 请求问题

**Problem**: 使用 `useCallback` 作为 `useEffect` 依赖会导致每次渲染都发起请求。

```tsx
// ❌ WRONG: Causes duplicate requests
const loadData = useCallback(async () => {
  const data = await fetchData();
  setData(data);
}, [setData]);

useEffect(() => {
  loadData();
}, [loadData]);  // loadData in dependency = re-runs on identity change
```

**Solution**: 使用 `useRef` 追踪初始化状态。

```tsx
// ✅ CORRECT: Single initialization with ref guard
const initializedRef = useRef(false);

useEffect(() => {
  if (initializedRef.current) return;
  initializedRef.current = true;

  const initialize = async () => {
    const data = await fetchData();
    setData(data);
  };

  initialize();
}, [setData]);
```

### 多数据源页面

页面需要加载多个数据源时：

```tsx
// ❌ WRONG: Multiple useEffects with callback dependencies
useEffect(() => { loadPhotos(); }, [loadPhotos]);
useEffect(() => { loadPersons(); }, [loadPersons]);
useEffect(() => { loadOrganizations(); }, [loadOrganizations]);

// ✅ CORRECT: Single initialization with Promise.all
const initializedRef = useRef(false);

useEffect(() => {
  if (initializedRef.current) return;
  initializedRef.current = true;

  const initialize = async () => {
    setLoading(true);
    try {
      const [photos, persons, orgs] = await Promise.all([
        getPhotos(),
        getPersons(),
        getOrganizations(),
      ]);
      setPhotos(photos);
      setPersons(persons);
      setOrganizations(orgs);
    } finally {
      setLoading(false);
    }
  };

  initialize();
}, [setPhotos, setPersons, setOrganizations]);
```

### 状态变化触发重新获取

状态变化需要触发重新获取，但**不**在初始渲染时触发：

```tsx
// ❌ WRONG: Triggers on initial render too
useEffect(() => {
  if (viewMode === 'team') {
    loadPhotos(1, undefined, selectedOrgId);
  }
}, [selectedOrgId, viewMode, loadPhotos]);

// ✅ CORRECT: Skip initial render, only react to actual changes
const prevOrgIdRef = useRef<string | null | undefined>(undefined);

useEffect(() => {
  // Skip first render (initialization)
  if (prevOrgIdRef.current === undefined) {
    prevOrgIdRef.current = selectedOrgId;
    return;
  }
  // Skip if value didn't actually change
  if (prevOrgIdRef.current === selectedOrgId) return;
  prevOrgIdRef.current = selectedOrgId;
  
  if (viewMode === 'team') {
    loadPhotos(1, undefined, selectedOrgId || undefined);
  }
}, [selectedOrgId, viewMode, loadPhotos]);
```

### 路由参数变化检测

基于 URL 参数加载数据的页面（如 `/albums/:id`）：

```tsx
// ❌ WRONG: Triggers multiple times
useEffect(() => {
  loadAlbumDetail();
}, [id, loadAlbumDetail]);

// ✅ CORRECT: Track loaded ID to prevent duplicate loads
const loadedIdRef = useRef<string | null>(null);

useEffect(() => {
  if (!id || loadedIdRef.current === id) return;
  loadedIdRef.current = id;
  loadAlbumDetail();
}, [id, loadAlbumDetail]);
```

### CSS Animation 属性冲突

**Problem**: 混用 shorthand `animation` 与 longhand `animationDelay` 导致 React 警告。

```tsx
// ❌ WRONG: Conflicting properties
style={{
  animationDelay: `${delay}ms`,
  animation: 'fadeInUp 0.6s ease-out forwards',  // Shorthand overrides delay
}}

// ✅ CORRECT: Use all longhand properties
style={{
  animationName: 'fadeInUp',
  animationDuration: '0.6s',
  animationTimingFunction: 'ease-out',
  animationFillMode: 'forwards',
  animationDelay: `${delay}ms`,
}}
```

## Supabase 注意事项

### PromiseLike vs Promise

Supabase 的 `.then()` 返回 `PromiseLike` 而非 `Promise`，**没有** `.finally()` 方法：

```typescript
// ❌ Error: PromiseLike doesn't have finally
const promise = supabase.from('table').select().then(...).finally(...)

// ✅ Correct: Use async IIFE
const promise = (async () => {
  try {
    const { data, error } = await supabase.from('table').select()
    return data
  } finally {
    // cleanup logic
  }
})()
```

## 禁止事项汇总

- ❌ Tailwind v2/v3 `*-opacity-*` 语法
- ❌ 使用 `bg-gradient-to-*`（应使用 `bg-linear-to-*`）
- ❌ 直接导入 `photoDB` 或 `supabase` client
- ❌ 创建独立 SQL 迁移文件
- ❌ 创建新的文档文件
- ❌ 使用 `any` 类型
- ❌ 在前端存储 secrets
- ❌ `useCallback` 作为 `useEffect` 依赖（无 ref guard）
- ❌ CSS `animation` 简写与分写混用

