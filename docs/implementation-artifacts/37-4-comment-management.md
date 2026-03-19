# Story 37.4: 评论管理

Status: ready-for-dev

## Story

作为用户和 Skill 作者，
我想能够管理评论（删除自己的评论，作者管理自己 Skill 下的评论），
以便保持评论区的质量。

## Acceptance Criteria

1. 用户可删除自己的评论
2. Skill 作者可删除自己 Skill 下的所有评论
3. 删除需确认（简单确认提示）
4. 举报评论（基础实现：前端按钮 + 标记，后端处理可 Post-MVP）

## Tasks / Subtasks

- [ ] 在 CommentList 中为每条评论添加操作菜单
  - [ ] 自己的评论：显示"删除"选项
  - [ ] Skill 作者：显示"删除"选项（对所有评论）
  - [ ] 所有用户：显示"举报"选项
- [ ] 实现删除逻辑（RLS 已配置在 Story 37.1）
- [ ] 举报功能：基础 UI（点击后 toast 提示"举报已提交"）

## Dev Notes

### 评论操作菜单

```tsx
// 每条评论的操作按钮（3 点菜单）
{(isOwnComment || isSkillAuthor) && (
  <DropdownMenu>
    <DropdownMenuTrigger asChild>
      <Button variant="ghost" size="sm"><MoreHorizontal className="size-4" /></Button>
    </DropdownMenuTrigger>
    <DropdownMenuContent>
      {(isOwnComment || isSkillAuthor) && (
        <DropdownMenuItem
          className="text-destructive"
          onClick={() => handleDelete(comment.id)}
        >
          删除评论
        </DropdownMenuItem>
      )}
      <DropdownMenuItem onClick={() => toast.success('举报已提交，感谢反馈')}>
        举报
      </DropdownMenuItem>
    </DropdownMenuContent>
  </DropdownMenu>
)}
```

### 删除逻辑

```typescript
const handleDelete = async (commentId: string) => {
  if (!confirm('确定要删除这条评论吗？')) return;
  await supabase.from('skill_comments').delete().eq('id', commentId);
  // 从本地列表移除
};
```

### Project Structure Notes

- 修改 `CommentList.tsx` 添加操作菜单
- RLS 策略已在 Story 37.1 中配置（支持作者删除）

### References

- Story 需求：[Source: docs/planning-artifacts/epics-and-stories.md#Story 37.4]

## Dev Agent Record

### Agent Model Used

_待填写_

### Debug Log References

### Completion Notes List

### File List

- `app/src/components/skills/CommentList.tsx`（修改）
