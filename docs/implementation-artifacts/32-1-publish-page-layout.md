# Story 32.1: 发布页面布局

Status: done

## Story

作为登录用户，
我想访问 Skill 发布页面填写信息和上传文件，
以便发布我的 Skill 到平台。

## Acceptance Criteria

1. `pages/skills/PublishPage.tsx` 存在并实现
2. 需要认证保护（未登录重定向到 /login）
3. 包含 SkillPublishForm 表单区域
4. 包含 FileUploader 文件上传区域
5. 版本号输入字段
6. 发布/保存草稿按钮
7. 路由 `/publish` 已配置

## Tasks / Subtasks

- [ ] 检查 `pages/skills/PublishPage.tsx` (AC: 1-6)
  - [ ] 确认认证检查（使用 useAuthStore 或 AuthContext）
  - [ ] 确认集成 SkillPublishForm 和 FileUploader
  - [ ] 确认发布和保存草稿两个操作
- [ ] 确认路由 `/publish` 含认证保护
- [ ] 验证未登录时重定向到 /login

## Dev Notes

### 现有文件

- `app/src/pages/skills/PublishPage.tsx` — 已存在，检查后补全

### 认证保护模式

```tsx
// 方式 1：使用 useAuthStore
const { user, isLoading } = useAuthStore();
if (!isLoading && !user) {
  return <Navigate to="/login" replace />;
}

// 方式 2：使用项目现有的 ProtectedRoute 组件（推荐，复用现有模式）
```

### 页面结构

```tsx
<div className="container mx-auto max-w-3xl py-8">
  <h1>发布 Skill</h1>
  <SkillPublishForm onSubmit={handlePublish} />
  <FileUploader onUpload={handleUpload} />
  <div className="flex gap-2">
    <Button variant="outline" onClick={handleSaveDraft}>保存草稿</Button>
    <Button onClick={handlePublish}>发布</Button>
  </div>
</div>
```

### Project Structure Notes

- 确认项目中 ProtectedRoute/AuthGuard 的实现方式
- 认证 store：`app/src/stores/useAuthStore.ts`

### References

- Story 需求：[Source: docs/planning-artifacts/epics-and-stories.md#Story 32.1]

## Dev Agent Record

### Agent Model Used

_待填写_

### Debug Log References

### Completion Notes List

### File List

- `app/src/pages/skills/PublishPage.tsx`
