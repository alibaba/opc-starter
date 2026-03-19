# Story 35.2: install 命令实现

Status: ready-for-dev

## Story

作为开发者，
我想通过 `skill-hub install <slug>[@version]` 命令安装 Skill，
以便将 Skill 下载并解压到本地目录。

## Acceptance Criteria

1. `skill-hub install <slug>` 安装最新版本
2. `skill-hub install <slug>@<version>` 安装指定版本
3. 下载 ZIP 文件到临时目录
4. 解压到 `.qoder/skills/<slug>/`
5. 记录安装信息到本地 manifest（`~/.skill-hub/installed.json`）
6. 安装进度展示（spinner + 进度提示）
7. 成功/失败提示清晰

## Tasks / Subtasks

- [ ] 创建 `cli/src/commands/install.ts` (AC: 1-7)
  - [ ] 解析 `slug[@version]` 格式
  - [ ] 调用 `skills-download` Edge Function（install_type: 'cli'）
  - [ ] 下载 ZIP 到临时文件
  - [ ] 使用 `adm-zip` 或 `unzipper` 解压
  - [ ] 写入本地 manifest
- [ ] 注册到主 program

## Dev Notes

### 命令实现骨架

```typescript
import { Command } from 'commander';
import fetch from 'node-fetch';
import AdmZip from 'adm-zip';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

export const installCommand = new Command('install')
  .argument('<slug>', 'Skill slug with optional version (e.g., my-skill@1.0.0)')
  .description('Install a skill')
  .action(async (slugWithVersion: string) => {
    const [slug, version] = slugWithVersion.split('@');
    const installDir = path.join(process.cwd(), '.qoder', 'skills', slug);

    console.log(`Installing ${slug}${version ? `@${version}` : ''}...`);

    // 1. 调用 Edge Function 获取签名 URL
    const response = await fetch(`${API_BASE}/functions/v1/skills-download`, {
      method: 'POST',
      body: JSON.stringify({ skill_slug: slug, version, install_type: 'cli', client_info: getClientInfo() }),
    });
    const { download_url } = await response.json();

    // 2. 下载 ZIP
    // 3. 解压到 installDir
    // 4. 更新 manifest
    console.log(`✓ ${slug} installed to ${installDir}`);
  });
```

### 本地 manifest 格式

```json
// ~/.skill-hub/installed.json
{
  "my-skill": {
    "version": "1.0.0",
    "installed_at": "2026-03-19T10:00:00Z",
    "path": "/path/to/.qoder/skills/my-skill"
  }
}
```

### Project Structure Notes

- 解压目录：`{cwd}/.qoder/skills/{slug}/`
- 依赖：`adm-zip` 或 `node-fetch`（Node 18+ 内置 fetch）

### References

- Story 需求：[Source: docs/planning-artifacts/epics-and-stories.md#Story 35.2]
- CLI API：[Source: docs/planning-artifacts/architecture.md#5.3 CLI API]

## Dev Agent Record

### Agent Model Used

_待填写_

### Debug Log References

### Completion Notes List

### File List

- `cli/src/commands/install.ts`
- `cli/src/utils/manifest.ts`
