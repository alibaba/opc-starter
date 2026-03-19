# Story 34.3: 用户公开主页

Status: done

## Story

作为访客，
我想查看某个作者的公开主页，
以便了解该作者发布的所有公开 Skill。

## Acceptance Criteria

1. `pages/skills/UserProfilePage.tsx` 创建完成（或已存在）
2. `components/skills/AuthorCard.tsx` 创建完成
3. AuthorCard 展示：头像 + 用户名 + Skill 数量 + 总下载量
4. 公开 Skill 列表（SkillCard 网格，仅展示 visibility='public'）
5. 路由 `/user/:username` 已配置

## Tasks / Subtasks

- [ ] 创建/检查 `pages/skills/UserProfilePage.tsx` (AC: 1, 4, 5)
  - [ ] 通过 username 参数查询用户 profile
  - [ ] 查询该用户所有 public Skill
  - [ ] SkillCard 网格展示
- [ ] 创建 `components/skills/AuthorCard.tsx` (AC: 2, 3)
  - [ ] 头像（Avatar 组件）+ 用户名 + 统计数字
- [ ] 确认路由 `/user/:username` 配置

## Dev Notes

### 路由参数获取

```typescript
const { username } = useParams<{ username: string }>();
// 通过 username 查询 profiles 表
const { data: profile } = await supabase
  .from('profiles')
  .select('id, full_name, avatar_url, username')
  .eq('username', username)
  .single();
```

### AuthorCard 组件

```tsx
interface AuthorCardProps {
  author: {
    id: string;
    full_name: string | null;
    avatar_url: string | null;
    skillsCount: number;
    totalDownloads: number;
  };
}

export function AuthorCard({ author }: AuthorCardProps) {
  return (
    <div className="flex items-center gap-4 rounded-lg border p-4">
      <Avatar>
        <AvatarImage src={author.avatar_url ?? undefined} />
        <AvatarFallback>{author.full_name?.[0]?.toUpperCase() ?? '?'}</AvatarFallback>
      </Avatar>
      <div>
        <div className="font-semibold">{author.full_name ?? '匿名用户'}</div>
        <div className="text-sm text-muted-foreground">
          {author.skillsCount} Skills · {author.totalDownloads} 次下载
        </div>
      </div>
    </div>
  );
}
```

### Project Structure Notes

- 注意 `profiles` 表可能没有 `username` 字段，需检查表结构
- 如无 username 字段，可以用 user_id 路由：`/user/:userId`

### References

- Story 需求：[Source: docs/planning-artifacts/epics-and-stories.md#Story 34.3]

## Dev Agent Record

### Agent Model Used

_待填写_

### Debug Log References

### Completion Notes List

### File List

- `app/src/pages/skills/UserProfilePage.tsx`
- `app/src/components/skills/AuthorCard.tsx`
