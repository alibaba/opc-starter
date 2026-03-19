# Story 32.3: FileUploader 文件上传组件

Status: done

## Story

作为登录用户，
我想通过拖拽或点击选择 ZIP 文件进行上传，
以便将 Skill 包上传到平台。

## Acceptance Criteria

1. `components/skills/FileUploader.tsx` 创建完成
2. 拖拽区域：虚线边框 + 图标 + 提示文字
3. 点击选择文件（input type="file"）
4. 文件类型校验：仅允许 `.zip`
5. 文件大小校验：最大 10MB
6. 上传进度条：百分比展示
7. 上传成功/失败状态展示
8. 已上传文件预览：文件名 + 大小 + 删除按钮

## Tasks / Subtasks

- [ ] 创建 `components/skills/FileUploader.tsx` (AC: 1-8)
  - [ ] 实现 dragover/drop 事件处理
  - [ ] 实现文件类型校验（.zip MIME: application/zip）
  - [ ] 实现 10MB 大小校验
  - [ ] 实现上传进度展示（onUploadProgress 回调）
  - [ ] 实现已选文件预览卡片
- [ ] 集成到 PublishPage

## Dev Notes

### 拖拽区域实现

```tsx
const handleDrop = (e: React.DragEvent) => {
  e.preventDefault();
  setIsDragging(false);
  const file = e.dataTransfer.files[0];
  if (file) validateAndSetFile(file);
};

const validateAndSetFile = (file: File) => {
  if (!file.name.endsWith('.zip')) {
    setError('仅支持 .zip 格式');
    return;
  }
  if (file.size > 10 * 1024 * 1024) {
    setError('文件大小不能超过 10MB');
    return;
  }
  setSelectedFile(file);
  onFileSelect(file);
};
```

### 上传进度（通过 skillStorageService）

```typescript
// skillStorageService 应支持 onProgress 回调
await skillStorageService.uploadSkillFile(file, path, (progress) => {
  setProgress(progress); // 0-100
});
```

### 文件大小格式化

```typescript
const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};
```

### Project Structure Notes

- 路径：`app/src/components/skills/FileUploader.tsx`
- 使用 lucide-react UploadCloud, X, FileArchive 图标
- shadcn/ui Progress 组件展示进度

### References

- Story 需求：[Source: docs/planning-artifacts/epics-and-stories.md#Story 32.3]
- 文件上传安全：[Source: docs/planning-artifacts/architecture.md#8.2.2 文件上传安全]

## Dev Agent Record

### Agent Model Used

_待填写_

### Debug Log References

### Completion Notes List

### File List

- `app/src/components/skills/FileUploader.tsx`
