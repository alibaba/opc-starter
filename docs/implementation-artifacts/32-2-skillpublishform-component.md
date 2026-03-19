# Story 32.2: SkillPublishForm 表单组件

Status: done

## Story

作为登录用户，
我想填写 Skill 发布表单并看到实时验证，
以便确保提交的信息格式正确。

## Acceptance Criteria

1. `components/skills/SkillPublishForm.tsx` 创建完成
2. 名称输入：必填，3-50 字符，实时 slug 预览
3. 描述输入：必填，10-500 字符
4. 标签输入：多选/输入，最多 10 个
5. 平台选择：多选 Checkbox（qoder/cursor/claude/cline/windsurf）
6. 可见性选择：Radio（draft/public/private）
7. 版本号输入：语义化版本格式验证（x.y.z）
8. 表单验证：实时 + 提交前验证
9. 必填标识：`*` 星号

## Tasks / Subtasks

- [ ] 创建 `components/skills/SkillPublishForm.tsx` (AC: 1-9)
  - [ ] 名称字段 + slug 实时预览（转小写连字符）
  - [ ] 描述字段 + 字符计数
  - [ ] 标签输入（多选 Combobox 或 TagInput 组件）
  - [ ] 平台 Checkbox 组
  - [ ] 可见性 Radio 组
  - [ ] 版本号输入 + 正则验证 `/^\d+\.\d+\.\d+$/`
- [ ] 集成表单验证（react-hook-form 或原生 state）

## Dev Notes

### Slug 预览生成

```typescript
const generateSlugPreview = (name: string) =>
  name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
```

### 语义化版本正则

```typescript
const SEMVER_REGEX = /^\d+\.\d+\.\d+$/;
// 有效：1.0.0, 2.1.3
// 无效：1.0, v1.0.0, 1.0.0-beta
```

### 标签输入模式

```tsx
// 标签以逗号或 Enter 分隔添加
const handleTagInput = (e: React.KeyboardEvent<HTMLInputElement>) => {
  if (e.key === 'Enter' || e.key === ',') {
    e.preventDefault();
    addTag(currentInput.trim());
    setCurrentInput('');
  }
};
```

### 平台选项

```typescript
const PLATFORMS: { value: SkillPlatform; label: string }[] = [
  { value: 'qoder', label: 'Qoder' },
  { value: 'cursor', label: 'Cursor' },
  { value: 'claude', label: 'Claude' },
  { value: 'cline', label: 'Cline' },
  { value: 'windsurf', label: 'Windsurf' },
];
```

### Project Structure Notes

- 路径：`app/src/components/skills/SkillPublishForm.tsx`
- 使用 shadcn/ui：Input, Textarea, Checkbox, RadioGroup, Label, Badge

### References

- Story 需求：[Source: docs/planning-artifacts/epics-and-stories.md#Story 32.2]

## Dev Agent Record

### Agent Model Used

_待填写_

### Debug Log References

### Completion Notes List

### File List

- `app/src/components/skills/SkillPublishForm.tsx`
