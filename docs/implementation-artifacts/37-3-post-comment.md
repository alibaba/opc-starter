# Story 37.3: 发表评论

Status: ready-for-dev

## Story

作为登录用户，
我想在 Skill 详情页发表评论，
以便与作者和其他用户交流。

## Acceptance Criteria

1. 评论输入框在评论列表上方
2. 支持 Markdown 格式（可选预览）
3. 字符限制：1-2000 字符
4. 提交后立即显示在评论列表
5. 未登录提示登录后才能评论

## Tasks / Subtasks

- [ ] 创建 `components/skills/CommentInput.tsx`
  - [ ] Textarea + 提交按钮
  - [ ] 字符计数展示（剩余字符数）
  - [ ] 未登录状态提示
  - [ ] 提交后清空输入框并刷新列表
- [ ] 集成到 SkillDetailPage（与 CommentList 组合）

## Dev Notes

### 提交逻辑

```typescript
const handleSubmit = async () => {
  if (!user) { setShowLoginPrompt(true); return; }
  if (!content.trim()) return;

  await supabase.from('skill_comments').insert({
    skill_id: skillId,
    user_id: user.id,
    content: content.trim(),
  });

  setContent('');
  onCommentAdded(); // 通知父组件刷新列表
};
```

### 组件结构

```tsx
<div className="space-y-2">
  <Textarea
    value={content}
    onChange={(e) => setContent(e.target.value)}
    placeholder="写下你的评论..."
    maxLength={2000}
    rows={3}
  />
  <div className="flex items-center justify-between">
    <span className="text-xs text-muted-foreground">{2000 - content.length} 字符剩余</span>
    <Button onClick={handleSubmit} disabled={!content.trim()}>发表评论</Button>
  </div>
</div>
```

### Project Structure Notes

- 路径：`app/src/components/skills/CommentInput.tsx`
- 复用 LoginPromptDialog（Story 33.4）

### References

- Story 需求：[Source: docs/planning-artifacts/epics-and-stories.md#Story 37.3]

## Dev Agent Record

### Agent Model Used

_待填写_

### Debug Log References

### Completion Notes List

### File List

- `app/src/components/skills/CommentInput.tsx`
