# Story 31.5: Web 下载功能与 Edge Function

Status: done

## Story

作为用户，
我想在详情页点击下载按钮获取 Skill 文件，
以便在 Web 端下载并使用 Skill。

## Acceptance Criteria

1. Edge Function `skills-download` 创建完成
2. 验证 Skill 可见性（仅 `public` 可下载）
3. 获取版本信息和 `storage_path`
4. 生成签名下载 URL（有效期 5 分钟）
5. 记录安装日志到 `skill_installs`（install_type: 'web'）
6. 返回签名 URL + 文件信息
7. 前端下载按钮触发浏览器下载
8. 下载计数通过触发器正确更新
9. `services/skill/skillStorageService.ts` 实现下载调用

## Tasks / Subtasks

- [ ] 检查或创建 Edge Function `skills-download` (AC: 1-6)
  - [ ] 确认 Deno Edge Function 在 `app/supabase/functions/skills-download/index.ts`
  - [ ] 确认验证 Skill visibility = 'public'
  - [ ] 确认使用 `supabase.storage.from('skills').createSignedUrl()` 生成 5 分钟签名 URL
  - [ ] 确认插入 `skill_installs` 记录
- [ ] 检查 `skillStorageService.ts` (AC: 9)
  - [ ] 确认 `downloadSkill(slug, version)` 方法存在
- [ ] 在详情页添加下载按钮
- [ ] 验证下载后 downloads_count +1

## Dev Notes

### Edge Function 结构

```typescript
// app/supabase/functions/skills-download/index.ts
import { createClient } from '@supabase/supabase-js';
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

serve(async (req) => {
  const { skill_slug, version, install_type, client_info } = await req.json();

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  // 1. 查找 Skill（验证 visibility = 'public'）
  // 2. 获取版本的 storage_path
  // 3. createSignedUrl（60 * 5 秒）
  // 4. 插入 skill_installs 记录
  // 5. 返回签名 URL
});
```

### 签名 URL 生成

```typescript
const { data, error } = await supabase.storage
  .from('skills')
  .createSignedUrl(storagePath, 300); // 5 分钟 = 300 秒
```

### 前端触发下载

```typescript
// 获取签名 URL 后触发下载
const link = document.createElement('a');
link.href = signedUrl;
link.download = `${slug}-${version}.zip`;
link.click();
```

### 注意事项

- Edge Function 使用 `SUPABASE_SERVICE_ROLE_KEY` 绕过 RLS 记录安装日志
- 匿名用户也可下载（user_id 为 null）
- 下载计数通过 `trigger_update_downloads_count` 触发器自动 +1

### Project Structure Notes

- Edge Function 路径：`app/supabase/functions/skills-download/index.ts`
- StorageService：`app/src/services/skill/skillStorageService.ts`

### References

- 下载流程：[Source: docs/planning-artifacts/architecture.md#4.5 文件下载流程]
- Edge Function API：[Source: docs/planning-artifacts/architecture.md#5.2.2 skills-download]

## Dev Agent Record

### Agent Model Used

_待填写_

### Debug Log References

### Completion Notes List

### File List

- `app/supabase/functions/skills-download/index.ts`
- `app/src/services/skill/skillStorageService.ts`
