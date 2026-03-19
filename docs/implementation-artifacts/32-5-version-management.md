# Story 32.5: 版本管理功能

Status: done

## Story

作为 Skill 作者，
我想为已发布的 Skill 发布新版本，
以便持续改进我的 Skill 并提供更新。

## Acceptance Criteria

1. Skill 详情页有"发布新版本"按钮（仅作者可见）
2. 弹窗：版本号 + Changelog 输入 + 文件上传
3. 版本号校验：必须大于当前最新版本（语义化比较）
4. 发布后更新 `skills.latest_version`
5. 版本历史列表展示更新

## Tasks / Subtasks

- [ ] 在 SkillDetailPage 添加"发布新版本"按钮（仅作者可见）
- [ ] 创建版本发布弹窗组件（Dialog）
  - [ ] 版本号输入 + 语义化版本比较
  - [ ] Changelog Textarea
  - [ ] FileUploader 集成
  - [ ] 调用 `skills-publish` Edge Function（publish_version action）
- [ ] 版本历史列表组件

## Dev Notes

### 语义化版本比较

```typescript
import { compare } from 'semver'; // 或手动实现

const isVersionGreater = (newVer: string, currentVer: string): boolean => {
  const [ma1, mi1, p1] = newVer.split('.').map(Number);
  const [ma2, mi2, p2] = currentVer.split('.').map(Number);
  if (ma1 !== ma2) return ma1 > ma2;
  if (mi1 !== mi2) return mi1 > mi2;
  return p1 > p2;
};
```

### 作者身份判断

```tsx
const { user } = useAuthStore();
const isAuthor = user?.id === skill.author_id;

{isAuthor && (
  <Button onClick={() => setShowVersionDialog(true)}>
    发布新版本
  </Button>
)}
```

### Project Structure Notes

- 按钮和 Dialog 集成在 `SkillDetailPage.tsx`
- 可复用 FileUploader 组件
- 可能需要新建 `PublishVersionDialog.tsx`

### References

- Story 需求：[Source: docs/planning-artifacts/epics-and-stories.md#Story 32.5]

## Dev Agent Record

### Agent Model Used

_待填写_

### Debug Log References

### Completion Notes List

### File List

- `app/src/pages/skills/SkillDetailPage.tsx`（修改）
- `app/src/components/skills/PublishVersionDialog.tsx`（新建）
