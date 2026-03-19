# Story 35.5: 认证与配置

Status: ready-for-dev

## Story

作为开发者，
我想通过 CLI 进行登录认证，
以便执行需要权限的操作（发布 Skill）。

## Acceptance Criteria

1. `skill-hub login` 命令：打开浏览器 OAuth 流程
2. Token 存储：`~/.skill-hub/config.json`
3. `skill-hub logout` 命令：清除本地 token
4. 匿名使用：install 和 search 不强制登录
5. 已登录时显示当前用户信息

## Tasks / Subtasks

- [ ] 创建 `cli/src/commands/auth.ts` (AC: 1-5)
  - [ ] `login` 子命令：启动本地 HTTP 服务监听 OAuth 回调
  - [ ] `logout` 子命令：删除 config.json 中的 token
  - [ ] `whoami` 子命令：展示当前登录用户
- [ ] 配置文件读写工具函数

## Dev Notes

### CLI OAuth 流程

```
1. CLI 启动本地 HTTP 服务（port 随机）
2. 打开浏览器到 Supabase Auth 页面（带 redirect_uri=http://localhost:{port}/callback）
3. 用户完成登录后，浏览器重定向到 CLI 监听的地址
4. CLI 获取 access_token，保存到 ~/.skill-hub/config.json
5. 关闭本地 HTTP 服务
```

```typescript
// 简化版：直接提示用户输入 email/password（MVP）
export const loginCommand = new Command('login')
  .description('Login to Skills Hub')
  .action(async () => {
    const email = await prompt('Email: ');
    const password = await promptPassword('Password: ');

    const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
      method: 'POST',
      headers: { 'apikey': SUPABASE_ANON_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    const { access_token, refresh_token } = await res.json();
    saveConfig({ access_token, refresh_token });
    console.log('✓ Logged in successfully');
  });
```

### Project Structure Notes

- config 路径：`~/.skill-hub/config.json`
- 可使用 `@inquirer/prompts` 或 `readline` 处理用户输入

### References

- Story 需求：[Source: docs/planning-artifacts/epics-and-stories.md#Story 35.5]

## Dev Agent Record

### Agent Model Used

_待填写_

### Debug Log References

### Completion Notes List

### File List

- `cli/src/commands/auth.ts`
- `cli/src/utils/config.ts`
