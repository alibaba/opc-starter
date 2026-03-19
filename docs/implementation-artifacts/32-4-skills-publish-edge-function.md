# Story 32.4: skills-publish Edge Function

Status: done

## Story

作为登录用户，
我想通过 Edge Function 发布 Skill，
以便服务端安全处理发布逻辑（Slug 生成、版本管理、签名 URL）。

## Acceptance Criteria

1. Edge Function `skills-publish` 支持 3 种 action：create / update / publish_version
2. create：验证用户身份、创建 Skill 记录、调用 `generate_skill_slug()` 生成 slug
3. update：验证作者身份、更新元数据
4. publish_version：验证作者、创建版本记录、生成上传签名 URL
5. 文件格式验证（ZIP，通过 file_size > 0 确认）
6. 上传完成后（前端通知）更新 `skills.latest_version`
7. 首次公开发布时设置 `published_at`
8. 非作者无法操作，返回 403

## Tasks / Subtasks

- [ ] 创建 Edge Function `skills-publish` (AC: 1-8)
  - [ ] 路径：`app/supabase/functions/skills-publish/index.ts`
  - [ ] 实现 action 分发逻辑
  - [ ] create：`supabase.rpc('generate_skill_slug', { skill_name: name })`
  - [ ] publish_version：`supabase.storage.from('skills').createSignedUploadUrl(path)`
  - [ ] 身份验证：从 JWT 获取 user_id，验证 author_id 匹配
- [ ] 前端 `skillStorageService.ts` 添加调用方法

## Dev Notes

### Edge Function 骨架

```typescript
// app/supabase/functions/skills-publish/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from '@supabase/supabase-js';

serve(async (req) => {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) return new Response('Unauthorized', { status: 401 });

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: authHeader } } }
  );

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new Response('Unauthorized', { status: 401 });

  const body = await req.json();
  const { action } = body;

  switch (action) {
    case 'create': return handleCreate(supabase, user, body);
    case 'update': return handleUpdate(supabase, user, body);
    case 'publish_version': return handlePublishVersion(supabase, user, body);
    default: return new Response('Invalid action', { status: 400 });
  }
});
```

### 签名上传 URL

```typescript
// 路径规范：{author_id}/{skill_slug}/{version}/package.zip
const storagePath = `${user.id}/${slug}/${version}/package.zip`;
const { data } = await supabaseAdmin.storage
  .from('skills')
  .createSignedUploadUrl(storagePath);
```

### CORS 处理

```typescript
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};
// 处理 OPTIONS preflight
if (req.method === 'OPTIONS') {
  return new Response('ok', { headers: corsHeaders });
}
```

### Project Structure Notes

- Edge Function 路径：`app/supabase/functions/skills-publish/index.ts`
- 使用 SUPABASE_ANON_KEY + JWT 进行用户级操作
- 需要 SUPABASE_SERVICE_ROLE_KEY 生成签名 URL（Storage 绕过 RLS）

### References

- Edge Function API：[Source: docs/planning-artifacts/architecture.md#5.2.1 skills-publish]
- 上传流程：[Source: docs/planning-artifacts/architecture.md#4.4 文件上传流程]

## Dev Agent Record

### Agent Model Used

_待填写_

### Debug Log References

### Completion Notes List

### File List

- `app/supabase/functions/skills-publish/index.ts`
- `app/src/services/skill/skillStorageService.ts`（添加 publishSkill 方法）
