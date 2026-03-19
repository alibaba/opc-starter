# Story 32.6: Skill 编辑与删除

Status: done

## Story

作为 Skill 作者，
我想编辑和删除自己的 Skill，
以便更新信息或移除不再维护的 Skill。

## Acceptance Criteria

1. Skill 详情页有"编辑"按钮（仅作者可见）
2. 编辑页面复用 SkillPublishForm（预填当前数据）
3. 删除确认弹窗（Dialog），防止误操作
4. 删除时级联删除版本、点赞、收藏、安装记录（数据库 ON DELETE CASCADE）
5. 删除时清理 Storage 文件
6. 编辑保存成功后跳转回详情页

## Tasks / Subtasks

- [ ] 在详情页添加编辑/删除按钮（仅作者可见）
- [ ] 编辑功能：导航到 `/publish?edit={skill_id}` 或弹窗
  - [ ] PublishPage 或弹窗支持预填数据
  - [ ] 调用 `skills-publish` Edge Function（update action）
- [ ] 删除功能
  - [ ] 确认 Dialog（"此操作不可撤销"）
  - [ ] 删除 Storage 文件：`skillStorageService.deleteSkillFiles(skill)`
  - [ ] 调用 `skillService.delete(id)`（DB CASCADE 自动清理关联数据）
  - [ ] 删除后重定向到首页

## Dev Notes

### CASCADE 删除

数据库已配置 `ON DELETE CASCADE`，删除 `skills` 记录时自动删除：
- `skill_versions`
- `skill_likes`
- `skill_favorites`
- `skill_installs`

**Storage 文件不自动删除，需手动清理！**

```typescript
// 删除 Storage 目录下所有文件
const deleteSkillFiles = async (authorId: string, slug: string) => {
  const prefix = `${authorId}/${slug}/`;
  const { data: files } = await supabase.storage
    .from('skills')
    .list(prefix, { recursive: true });

  if (files?.length) {
    await supabase.storage.from('skills')
      .remove(files.map(f => `${prefix}${f.name}`));
  }
};
```

### Project Structure Notes

- 修改 `SkillDetailPage.tsx` 添加编辑/删除按钮
- 编辑可使用路由参数或弹窗，选择已有模式
- 确认当前路由配置中是否有 edit 路由

### References

- Story 需求：[Source: docs/planning-artifacts/epics-and-stories.md#Story 32.6]

## Dev Agent Record

### Agent Model Used

_待填写_

### Debug Log References

### Completion Notes List

### File List

- `app/src/pages/skills/SkillDetailPage.tsx`（修改）
- `app/src/services/skill/skillStorageService.ts`（添加 deleteSkillFiles 方法）
