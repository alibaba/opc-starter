# Story 31.3: InstallCommand 组件

Status: done

## Story

作为用户，
我想在详情页看到 CLI 安装命令并一键复制，
以便快速获取安装命令，提升使用体验。

## Acceptance Criteria

1. `components/skills/InstallCommand.tsx` 存在并实现
2. 展示命令文本：`skill-hub install {slug}@{version}`
3. 复制按钮：点击复制到剪贴板
4. 复制成功状态：图标变化 + "已复制" 文字（2 秒后恢复）
5. 版本变化时命令自动更新
6. ARIA label: "复制安装命令"
7. Toast 提示：复制成功

## Tasks / Subtasks

- [ ] 检查 `components/skills/InstallCommand.tsx` (AC: 1-7)
  - [ ] 确认命令格式：`skill-hub install {slug}@{version}`
  - [ ] 确认使用 `navigator.clipboard.writeText()`
  - [ ] 确认 2 秒后恢复按钮状态（setTimeout + useState）
  - [ ] 确认 ARIA label 设置
- [ ] 确认 Toast 集成（shadcn/ui toast 或 sonner）
- [ ] 验证版本切换后命令更新

## Dev Notes

### 现有文件

- `app/src/components/skills/InstallCommand.tsx` — 已存在，检查后补全

### 复制实现模式

```tsx
const [copied, setCopied] = useState(false);

const handleCopy = async () => {
  await navigator.clipboard.writeText(`skill-hub install ${slug}@${version}`);
  setCopied(true);
  toast.success('已复制到剪贴板');
  setTimeout(() => setCopied(false), 2000);
};
```

### 命令展示样式

```tsx
<div className="flex items-center gap-2 rounded-md bg-muted px-3 py-2 font-mono text-sm">
  <code className="flex-1">skill-hub install {slug}@{version}</code>
  <button
    onClick={handleCopy}
    aria-label="复制安装命令"
    className="shrink-0"
  >
    {copied ? <Check className="size-4 text-green-500" /> : <Copy className="size-4" />}
  </button>
</div>
```

### Project Structure Notes

- 路径：`app/src/components/skills/InstallCommand.tsx`
- 使用 lucide-react Copy, Check 图标
- Toast：检查项目已有 toast 方案（sonner 或 shadcn toast）

### References

- Story 需求：[Source: docs/planning-artifacts/epics-and-stories.md#Story 31.3]

## Dev Agent Record

### Agent Model Used

_待填写_

### Debug Log References

### Completion Notes List

### File List

- `app/src/components/skills/InstallCommand.tsx`
