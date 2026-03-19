# Story 35.1: CLI 项目初始化

Status: ready-for-dev

## Story

作为开发者，
我想初始化 CLI 工具项目结构，
以便后续实现各命令功能。

## Acceptance Criteria

1. `cli/` 目录创建完成
2. 选择 CLI 框架（Commander.js）并配置
3. TypeScript + 构建配置完成
4. npm 发布配置（package.json bin 字段）
5. 基础命令结构：`skill-hub <command>`

## Tasks / Subtasks

- [ ] 创建 `cli/` 目录结构
  - [ ] `cli/package.json`（bin: skill-hub）
  - [ ] `cli/tsconfig.json`
  - [ ] `cli/src/index.ts`（主入口）
  - [ ] `cli/src/commands/`（命令目录）
- [ ] 配置 Commander.js 主程序框架
- [ ] 配置 TypeScript 编译（target: node）

## Dev Notes

### 目录结构

```
cli/
├── package.json
├── tsconfig.json
└── src/
    ├── index.ts        # Commander 主程序
    └── commands/
        ├── install.ts
        ├── list.ts
        ├── search.ts
        └── auth.ts
```

### package.json 关键配置

```json
{
  "name": "skill-hub",
  "version": "0.1.0",
  "bin": {
    "skill-hub": "./dist/index.js"
  },
  "scripts": {
    "build": "tsc",
    "dev": "ts-node src/index.ts"
  },
  "dependencies": {
    "commander": "^12.0.0"
  },
  "devDependencies": {
    "typescript": "^5.0.0",
    "@types/node": "^20.0.0",
    "ts-node": "^10.0.0"
  }
}
```

### Commander 主程序骨架

```typescript
// cli/src/index.ts
import { program } from 'commander';

program
  .name('skill-hub')
  .description('Skills Hub CLI - Install and manage AI agent skills')
  .version('0.1.0');

// 注册命令（在各命令文件中 import 注册）
program.parse();
```

### Project Structure Notes

- CLI 独立于 `app/` 目录
- 不与前端共享代码，但调用相同的 Supabase API
- API_BASE_URL 通过环境变量配置

### References

- Story 需求：[Source: docs/planning-artifacts/epics-and-stories.md#Story 35.1]

## Dev Agent Record

### Agent Model Used

_待填写_

### Debug Log References

### Completion Notes List

### File List

- `cli/package.json`
- `cli/tsconfig.json`
- `cli/src/index.ts`
