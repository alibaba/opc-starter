# Story 30.4: SearchBar 组件

Status: done

## Story

作为用户，
我想在首页使用即时搜索栏，
以便输入关键词后自动触发搜索，快速找到需要的 Skill。

## Acceptance Criteria

1. `components/skills/SearchBar.tsx` 存在并实现
2. 搜索图标 + Input 组件组合
3. 输入防抖：300ms 后触发搜索
4. 热门标签：点击标签触发对应搜索
5. 搜索状态：loading indicator
6. 自动聚焦（首页使用时）
7. ARIA label: "搜索 Skills"
8. 键盘操作：Enter 确认、Escape 清空

## Tasks / Subtasks

- [ ] 检查 `components/skills/SearchBar.tsx` (AC: 1-8)
  - [ ] 确认防抖实现（useDebounce hook 或 lodash.debounce）
  - [ ] 确认点击标签自动填充搜索框并触发搜索
  - [ ] 确认 Escape 键清空输入
  - [ ] 确认 ARIA label 设置
- [ ] 如缺少 useDebounce hook，在 `hooks/` 下创建
- [ ] 验证在首页集成后搜索功能正常

## Dev Notes

### 防抖实现模式

```tsx
import { useDebounce } from '@/hooks/useDebounce';

const [inputValue, setInputValue] = useState('');
const debouncedValue = useDebounce(inputValue, 300);

useEffect(() => {
  if (debouncedValue !== undefined) {
    onSearch(debouncedValue);
  }
}, [debouncedValue]);
```

### Keyboard Handler

```tsx
const handleKeyDown = (e: React.KeyboardEvent) => {
  if (e.key === 'Escape') {
    setInputValue('');
    onSearch('');
  }
};
```

### 现有文件

- `app/src/components/skills/SearchBar.tsx` — 已存在，检查后补全

### Project Structure Notes

- hooks 路径：`app/src/hooks/`
- 使用 shadcn/ui Input 组件
- 搜索图标：使用 lucide-react Search 图标

### References

- Story 需求：[Source: docs/planning-artifacts/epics-and-stories.md#Story 30.4]

## Dev Agent Record

### Agent Model Used

_待填写_

### Debug Log References

### Completion Notes List

### File List

- `app/src/components/skills/SearchBar.tsx`
- `app/src/hooks/useDebounce.ts`（如不存在则创建）
