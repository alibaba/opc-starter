# Story 33.4: 登录提示弹窗

Status: done

## Story

作为未登录用户，
我想在点击需要认证的操作时看到友好的登录提示，
以便了解需要登录并可以快速跳转。

## Acceptance Criteria

1. 登录提示 Dialog 组件创建完成
2. 提示文案："登录后即可点赞/收藏"（根据操作场景动态）
3. 按钮：登录 / 注册 / 取消
4. 点击登录跳转到 `/login`，点击注册跳转到 `/register`
5. 在点赞、收藏、发布等需要认证的操作时触发
6. 可取消关闭弹窗

## Tasks / Subtasks

- [ ] 创建登录提示 Dialog 组件 (AC: 1-6)
  - [ ] Props：isOpen, onClose, message（可选自定义文案）
  - [ ] 3 个按钮：登录、注册、取消
  - [ ] 点击登录/注册时关闭弹窗并跳转
- [ ] 在 useSkillLike 中集成（未登录时触发）
- [ ] 在 useSkillFavorite 中集成

## Dev Notes

### 组件实现

```tsx
interface LoginPromptDialogProps {
  isOpen: boolean;
  onClose: () => void;
  message?: string;
}

export function LoginPromptDialog({ isOpen, onClose, message }: LoginPromptDialogProps) {
  const navigate = useNavigate();

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>需要登录</DialogTitle>
          <DialogDescription>
            {message ?? '登录后即可使用此功能'}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>取消</Button>
          <Button variant="outline" onClick={() => { onClose(); navigate('/register'); }}>
            注册
          </Button>
          <Button onClick={() => { onClose(); navigate('/login'); }}>
            登录
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

### 在 Hook 中使用

```typescript
// useSkillLike / useSkillFavorite 中
const [showLoginPrompt, setShowLoginPrompt] = useState(false);

// 返回给组件使用
return {
  isLiked,
  likesCount,
  toggleLike,
  showLoginPrompt,
  closeLoginPrompt: () => setShowLoginPrompt(false),
};
```

### Project Structure Notes

- 路径：`app/src/components/skills/LoginPromptDialog.tsx`（或 `components/ui/`）
- 使用 shadcn/ui Dialog 组件
- 检查项目中是否已有类似的登录提示组件

### References

- Story 需求：[Source: docs/planning-artifacts/epics-and-stories.md#Story 33.4]

## Dev Agent Record

### Agent Model Used

_待填写_

### Debug Log References

### Completion Notes List

### File List

- `app/src/components/skills/LoginPromptDialog.tsx`
