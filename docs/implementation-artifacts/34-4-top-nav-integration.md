# Story 34.4: 顶部导航集成

Status: done

## Story

作为用户，
我想在顶部导航栏看到 Skills Hub 功能入口，
以便在登录/未登录状态下快速访问主要功能。

## Acceptance Criteria

1. 未登录：Logo + 搜索栏 + 登录/注册按钮
2. 已登录：Logo + 搜索栏 + 发布按钮 + 用户菜单
3. 用户菜单项：我的 Skills、我的收藏、个人设置、退出
4. 固定顶部，滚动时 `bg-background/80 backdrop-blur`
5. 移动端汉堡菜单

## Tasks / Subtasks

- [ ] 检查现有顶部导航组件位置
  - [ ] 确认 `app/src/components/layout/` 或 `App.tsx` 中的 Header 组件
- [ ] 更新导航集成 Skills Hub 功能 (AC: 1-5)
  - [ ] 未登录状态展示登录/注册按钮
  - [ ] 已登录状态展示"发布"按钮 + 用户下拉菜单
  - [ ] 添加 my-skills, favorites, settings, logout 菜单项
  - [ ] 实现固定定位 + 毛玻璃效果
  - [ ] 移动端折叠菜单

## Dev Notes

### 毛玻璃固定导航（Tailwind v4）

```tsx
<header className="sticky top-0 z-50 border-b bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
  {/* 导航内容 */}
</header>
```

### 用户菜单（shadcn/ui DropdownMenu）

```tsx
<DropdownMenu>
  <DropdownMenuTrigger asChild>
    <Button variant="ghost" className="relative size-8 rounded-full">
      <Avatar className="size-8">
        <AvatarImage src={user?.avatar_url ?? undefined} />
        <AvatarFallback>{user?.email?.[0].toUpperCase()}</AvatarFallback>
      </Avatar>
    </Button>
  </DropdownMenuTrigger>
  <DropdownMenuContent>
    <DropdownMenuItem onClick={() => navigate('/my-skills')}>我的 Skills</DropdownMenuItem>
    <DropdownMenuItem onClick={() => navigate('/favorites')}>我的收藏</DropdownMenuItem>
    <DropdownMenuSeparator />
    <DropdownMenuItem onClick={() => navigate('/settings')}>个人设置</DropdownMenuItem>
    <DropdownMenuSeparator />
    <DropdownMenuItem onClick={signOut}>退出登录</DropdownMenuItem>
  </DropdownMenuContent>
</DropdownMenu>
```

### Project Structure Notes

- 检查 `app/src/components/layout/` 目录的现有 Header 组件
- 复用项目已有的认证状态（useAuthStore）

### References

- Story 需求：[Source: docs/planning-artifacts/epics-and-stories.md#Story 34.4]

## Dev Agent Record

### Agent Model Used

_待填写_

### Debug Log References

### Completion Notes List

### File List

- `app/src/components/layout/Header.tsx`（或对应的导航组件，修改）
