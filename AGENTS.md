# OPC-Starter AI Coding 指南

> 一人公司启动器 AI 开发规范 | v2.0（目录式）

## 核心原则

1. **优先更新现有文档**，不创建新文档
2. **SQL 变更集中管理** → `app/supabase/setup.sql`
3. **操作文档更新** → `app/supabase/SUPABASE_COOKBOOK.md`

## 技术栈

React 19.1 · TypeScript 5.9 · Vite 7.1 · **Tailwind CSS 4.1** · Supabase 2.80 · Zustand 5.0 · Qwen-Plus (百炼) · A2UI v0.8

## 详细规范（按需加载）

| 规范 | 文件 | 自动触发 |
|------|------|----------|
| TypeScript 严格类型 | `.cursor/rules/typescript-strict.md` | `*.ts, *.tsx` |
| Tailwind CSS v4 语法 | `.cursor/rules/tailwind-v4.md` | `*.tsx, *.css` |
| Agent Studio 开发 | `.cursor/rules/agent-studio.md` | `agent/**/*` |
| Supabase 数据模式 | `.cursor/rules/supabase-patterns.md` | `services/**/*` |
| 测试规范 | `.cursor/rules/testing.md` | `*.test.*` |
| 项目扩展指南 | `.cursor/rules/project-extension.md` | `pages/**/*` |

## 技术文档

| 文档 | 用途 |
|------|------|
| `docs/Architecture.md` | 系统架构与模块关系 |
| `docs/API.md` | AI Assistant API 接口 |
| `docs/CONVENTIONS.md` | 编码规范（命名、分层、错误处理） |
| `docs/DESIGN_TOKENS.md` | 设计令牌规范 |
| `docs/Epics.yaml` | 项目进度 |
| `app/supabase/SUPABASE_COOKBOOK.md` | 数据库操作手册 |

## 禁止事项

- ❌ 使用 Tailwind CSS v2/v3 语法（`bg-opacity-*`、`bg-gradient-to-*`）
- ❌ 直接操作 IndexedDB 或 Supabase（使用 DataService）
- ❌ 在 A2UI 中使用未注册的组件类型
- ❌ 直接调用 LLM API（通过 ai-assistant Edge Function）
- ❌ 创建独立 SQL 文件或新文档文件

## 质量门禁

```bash
npm run ai:check    # lint:check + format:check + type-check + coverage + build
npm run test        # 单元测试
npm run coverage    # 覆盖率检查（阈值: lines 25%, branches 18%）
```

## Cursor Cloud specific instructions

### Project layout

All application code lives under `app/`.

- Prefer `/workspace/app` for low-level application work.
- `/workspace/package.json` exposes proxy scripts for AI tools that start at repo root, so `npm run dev:test`, `npm run ai:check`, and `npm run test:e2e:headless` also work from `/workspace`.

### Running without Supabase (MSW mock mode)

The app can run fully locally without a real Supabase project by using MSW mocks:

1. Ensure `app/.env.test` exists with `VITE_ENABLE_MSW=true` (created automatically by the update script if missing).
2. `npm run dev:test` — starts Vite on port **5173** with MSW intercepting all Supabase API calls.
3. Test credentials are sourced from `app/cypress/fixtures/users.json`: `test@example.com` / `888888`.

### Gotchas

- The original `package-lock.json` referenced Alibaba's internal npm registry (`registry.anpm.alibaba-inc.com`), which is unreachable from Cloud VMs. If `npm install` fails with `ECONNRESET` errors from that registry, delete `package-lock.json` and `node_modules`, then run `npm install --registry https://registry.npmjs.org/`.
- The `prepare` script runs `cd .. && husky app/.husky` which installs git hooks from the repo root. This is expected and runs automatically during `npm install`.
- Lint command (`npm run lint`) applies `--fix` by default.

### Key commands

| Task | Command |
|------|---------|
| Dev server (mock) | `npm run dev:test` |
| Dev server (real Supabase) | `npm run dev` |
| Lint | `npm run lint` |
| Type check | `npm run type-check` |
| Unit tests | `npm test` |
| E2E tests | `npm run test:e2e:headless` |
| Core AI checks | `npm run ai:check` |
| Full quality check | `./scripts/quality_check.sh` |
| Build | `npm run build` |
