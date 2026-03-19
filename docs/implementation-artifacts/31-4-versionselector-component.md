# Story 31.4: VersionSelector 组件

Status: done

## Story

作为用户，
我想在详情页选择 Skill 的不同版本，
以便安装特定版本或查看历史版本的安装命令。

## Acceptance Criteria

1. `components/skills/VersionSelector.tsx` 存在并实现
2. 下拉选择器展示所有版本
3. 默认选中最新版本（versions[0]，按创建时间倒序）
4. 版本变化时通知父组件（更新 InstallCommand）
5. 展示版本发布时间
6. ARIA label: "选择版本"

## Tasks / Subtasks

- [ ] 检查 `components/skills/VersionSelector.tsx` (AC: 1-6)
  - [ ] 确认 Props: versions, selectedVersion, onVersionChange
  - [ ] 确认默认选中第一个版本（最新）
  - [ ] 确认版本 option 展示 version + 发布日期
  - [ ] 确认 ARIA label
- [ ] 确认与 InstallCommand 联动（父组件传递 selectedVersion）

## Dev Notes

### 现有文件

- `app/src/components/skills/VersionSelector.tsx` — 已存在，检查后补全

### 组件接口

```tsx
interface VersionSelectorProps {
  versions: SkillVersion[];
  selectedVersion: string;
  onVersionChange: (version: string) => void;
}
```

### 日期格式化

```tsx
// 使用 Intl.DateTimeFormat 或简单格式化
const formatDate = (dateStr: string) =>
  new Date(dateStr).toLocaleDateString('zh-CN', {
    year: 'numeric', month: '2-digit', day: '2-digit'
  });
```

### 使用 shadcn/ui Select

```tsx
<Select
  value={selectedVersion}
  onValueChange={onVersionChange}
  aria-label="选择版本"
>
  <SelectTrigger>
    <SelectValue placeholder="选择版本" />
  </SelectTrigger>
  <SelectContent>
    {versions.map((v) => (
      <SelectItem key={v.id} value={v.version}>
        {v.version} · {formatDate(v.created_at)}
      </SelectItem>
    ))}
  </SelectContent>
</Select>
```

### Project Structure Notes

- 路径：`app/src/components/skills/VersionSelector.tsx`
- 依赖：shadcn/ui Select 组件

### References

- Story 需求：[Source: docs/planning-artifacts/epics-and-stories.md#Story 31.4]

## Dev Agent Record

### Agent Model Used

_待填写_

### Debug Log References

### Completion Notes List

### File List

- `app/src/components/skills/VersionSelector.tsx`
