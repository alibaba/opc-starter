---
name: auto-develop
description: Photo Wall 项目开发规范。当开发照片墙功能、修改 React/TypeScript 代码、编写 Tailwind 样式、操作 Supabase 数据库或配置阿里云服务时，此 Skill 提供必须遵守的技术约束和编码规范。
---

# Photo Wall 开发规范

## Critical Constraints

### 1. Tailwind CSS v4 Syntax (Mandatory)

```tsx
// ❌ Forbidden: v2/v3 syntax
className="bg-opacity-50 text-opacity-75"

// ✅ Required: v4 syntax
className="bg-black/50 text-white/75"
```

| Forbidden (v2/v3) | Required (v4) |
|-------------------|---------------|
| `bg-opacity-*` | `bg-color/opacity` |
| `text-opacity-*` | `text-color/opacity` |
| `border-opacity-*` | `border-color/opacity` |
| `ring-opacity-*` | `ring-color/opacity` |

### 2. Data Operations via DataService Only

```typescript
import { dataService } from '@/services/data/DataService'

// ✅ Correct
await dataService.getAllPhotos()
await dataService.optimisticUpdate(id, updates)

// ❌ Forbidden - never import directly
import { photoDB } from '@/services/db/photoDB'
import { supabase } from '@/lib/supabase/client'
```

### 3. SQL Changes Centralized

All database changes → `photo-wall/supabase/setup.sql`

Never create separate migration files.

### 4. Update Existing Docs Only

Never create new documentation files. Update existing ones per `references/project-structure.md`.

## Prohibited Actions

- ❌ Tailwind v2/v3 `*-opacity-*` syntax
- ❌ Direct IndexedDB or Supabase access
- ❌ Separate SQL migration files
- ❌ New documentation files
- ❌ Using `any` type
- ❌ Storing secrets in frontend

## References

For detailed information, read these files as needed:

- `references/project-structure.md` - Project layout and file locations
- `references/architecture.md` - Tech stack and data flow
- `references/edge-functions.md` - Supabase Edge Functions

## External Documentation

- `docs/Architecture.md` - Full system architecture
- `docs/Epics.yaml` - Project progress
- `photo-wall/supabase/SUPABASE_COOKBOOK.md` - Database operations
- `photo-wall/supabase/ALICLOUD_COOKBOOK.md` - Alibaba Cloud configuration
