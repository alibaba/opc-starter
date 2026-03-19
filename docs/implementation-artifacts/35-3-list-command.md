# Story 35.3: list 命令实现

Status: ready-for-dev

## Story

作为开发者，
我想通过 `skill-hub list` 查看已安装的 Skill，
以便了解本地已有哪些 Skill 及其版本。

## Acceptance Criteria

1. 读取本地 `.qoder/skills/` 目录
2. 展示已安装 Skill 列表（名称、版本、安装时间）
3. 支持离线使用（无需网络）
4. 无已安装 Skill 时展示提示信息

## Tasks / Subtasks

- [ ] 创建 `cli/src/commands/list.ts` (AC: 1-4)
  - [ ] 读取 `~/.skill-hub/installed.json` 本地 manifest
  - [ ] 格式化输出表格
  - [ ] 处理 manifest 不存在的情况

## Dev Notes

### 表格输出

```typescript
import { Command } from 'commander';

export const listCommand = new Command('list')
  .description('List installed skills')
  .action(() => {
    const manifest = readManifest(); // 读取本地 manifest

    if (!Object.keys(manifest).length) {
      console.log('No skills installed. Use "skill-hub install <slug>" to install one.');
      return;
    }

    console.log('Installed Skills:');
    console.log('─'.repeat(60));
    for (const [slug, info] of Object.entries(manifest)) {
      const date = new Date(info.installed_at).toLocaleDateString('zh-CN');
      console.log(`  ${slug.padEnd(30)} v${info.version.padEnd(10)} ${date}`);
    }
  });
```

### Project Structure Notes

- 复用 35.1 中的 manifest 工具函数
- 纯离线操作，不调用 API

### References

- Story 需求：[Source: docs/planning-artifacts/epics-and-stories.md#Story 35.3]

## Dev Agent Record

### Agent Model Used

_待填写_

### Debug Log References

### Completion Notes List

### File List

- `cli/src/commands/list.ts`
