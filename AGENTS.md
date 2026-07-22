# OPC-Starter AI Coding 指南

> 一人公司启动器 AI 开发规范 | v2.0（目录式）

## 核心原则

1. **优先更新现有文档**，不创建新文档
2. **SQL 变更集中管理** → `app/supabase/setup.sql`
3. **操作文档更新** → `app/supabase/SUPABASE_COOKBOOK.md`

## 技术栈

React 19.1 · TypeScript 5.9 · Vite 7.1 · **Tailwind CSS 4.1** · Supabase 2.80 · Zustand 5.0 · Qwen-Plus (百炼) · A2UI v0.8 · react-i18next

## 详细规范（按需加载）

| 规范                 | 文件                                 | 自动触发                                       |
| -------------------- | ------------------------------------ | ---------------------------------------------- |
| TypeScript 严格类型  | `.cursor/rules/typescript-strict.md` | `*.ts, *.tsx`                                  |
| Tailwind CSS v4 语法 | `.cursor/rules/tailwind-v4.md`       | `*.tsx, *.css`                                 |
| Agent Studio 开发    | `.cursor/rules/agent-studio.md`      | `agent/**/*`                                   |
| Supabase 数据模式    | `.cursor/rules/supabase-patterns.md` | `services/**/*`                                |
| 测试规范             | `.cursor/rules/testing.md`           | `*.test.*`                                     |
| 项目扩展指南         | `.cursor/rules/project-extension.md` | `pages/**/*`                                   |
| i18n 国际化          | `.cursor/rules/i18n.md`              | `locales/**/*`、用户可见文案、`useTranslation` |

## 技术文档（按需自动引入）

开发过程中涉及以下场景时，**必须**先读取对应文档再动手：

| 文档                                | 用途                             | 自动触发（涉及场景关键词）                            |
| ----------------------------------- | -------------------------------- | ----------------------------------------------------- |
| `docs/API.md`                       | AI Assistant API 接口            | `ai-assistant`、SSE、Agent 工具、`renderUI`、LLM 调用 |
| `docs/Architecture.md`              | 系统架构与模块关系               | 新模块设计、分层架构、核心模块职责、扩展指南          |
| `docs/CONVENTIONS.md`               | 编码规范（命名、分层、错误处理） | 文件命名、分层依赖、TypeScript 规范、权限约定         |
| `docs/DESIGN_TOKENS.md`             | 设计令牌规范                     | 颜色系统、字体、圆角、阴影、Tailwind Token、UI 风格   |
| `docs/Epics.yaml`                   | 项目进度                         | 项目进度、Story 拆解、版本规划、Epic 状态             |
| `docs/IHS.md`                       | 仓库驾驭健康报告                 | 代码质量评估、技术债、测试覆盖率、代码腐化度          |
| `docs/exec-plans/`                  | 历史执行计划                     | 在途计划收尾、历史方案参考                            |
| `_bmad-output/`                     | BMAD 工作流产物                  | PRD、Epic/Story、Sprint 状态、Quick Dev spec          |
| `_bmad-output/README.md`            | BMAD 产物索引与命名约定          | 产物路径、与 `docs/` 的分工                           |
| `app/supabase/SUPABASE_COOKBOOK.md` | 数据库操作手册                   | 表结构变更、RLS 策略、SQL 函数、数据库迁移            |
| `app/supabase/setup.sql`            | 数据库 Schema 事实源             | 建表、加字段、RLS、触发器、profiles 等表              |
| `app/src/locales/`                  | 前端 i18n 文案事实源             | 多语言、locale、翻译、`useTranslation`、用户可见文案  |

### 路由规则说明

1. **AI 助手开发**：涉及 `ai-assistant`、SSE 流、Agent Tool、`renderUI`、LLM 调用 → 先读 `docs/API.md`，工具注册还需参考 `docs/Architecture.md` 扩展指南。
2. **UI 组件开发**：新增或修改 UI 组件 → 先读 `docs/DESIGN_TOKENS.md` 确认设计语言，再按 `docs/CONVENTIONS.md` 命名和分层；涉及用户可见文案时读 `.cursor/rules/i18n.md`。
3. **页面/模块扩展**：新增页面、路由、业务模块 → 先读 `docs/Architecture.md`、`docs/CONVENTIONS.md` 和 `.cursor/rules/project-extension.md`。
4. **数据库变更**：任何 Schema、RLS、触发器、SQL 函数变更 → 先读 `app/supabase/setup.sql` 确认现状，操作步骤参考 `app/supabase/SUPABASE_COOKBOOK.md`。
5. **质量评估**：代码健康度、技术债分析 → 读 `docs/IHS.md` 获取基线数据。
6. **规划与执行**：优先更新既有 `docs/exec-plans/`、`docs/Epics.yaml` 或相关文档；确需新增文档时先确认是否已有合适承载位置。
7. **BMAD 工作流**：需求规划、Story 开发、代码审查 → 使用 `.agents/skills/bmad-*`（Cursor）或对应 IDE 的 skills 目录；不确定时先 invoke `bmad-help`。
8. **国际化（i18n）**：新增或修改用户可见文案 → 先读 `.cursor/rules/i18n.md`，在 `app/src/locales/zh-CN` 与 `en-US` 同步维护 key；初始化见 `app/src/lib/i18n.ts`。
9. **BMAD Builder（BMB）**：自建 Agent / Module / Workflow → invoke `bmad-agent-builder`、`bmad-module-builder` 或 `bmad-workflow-builder`；产物默认写入仓库根目录 `skills/`。

## BMAD Method（v6.10 Native Skills）

BMAD 已从旧版 YAML/XML 命令迁移为 **Native Skills** 架构（`SKILL.md` + TOML 配置）。

| 模块 | 版本   | 用途                              |
| ---- | ------ | --------------------------------- |
| core | 6.10.0 | 共享脚本、配置解析                |
| bmm  | 6.10.0 | 需求、Story、审查、Quick Dev      |
| bmb  | v1.5.0 | Agent / Module / Workflow Builder |

| 项                         | 路径                       |
| -------------------------- | -------------------------- |
| 主配置（安装器管理，只读） | `_bmad/config.toml`        |
| 团队定制覆盖               | `_bmad/custom/config.toml` |
| BMB 模块配置               | `_bmad/bmb/config.yaml`    |
| Cursor / OpenCode Skills   | `.agents/skills/bmad-*`    |
| Claude Code Skills         | `.claude/skills/bmad-*`    |
| Antigravity Skills         | `.agent/skills/bmad-*`     |
| Kiro Skills                | `.kiro/skills/bmad-*`      |
| Qoder Skills               | `.qoder/skills/bmad-*`     |

常用 Skills（BMM）：`bmad-help`、`bmad-quick-dev`、`bmad-dev-story`、`bmad-code-review`、`bmad-sprint-planning`

常用 Skills（BMB）：`bmad-agent-builder`、`bmad-module-builder`、`bmad-workflow-builder`、`bmad-bmb-setup`

产物目录（统一在 `_bmad-output/`，由 `_bmad/custom/config.toml` 锁定）：

| 子目录                      | 典型内容                              |
| --------------------------- | ------------------------------------- |
| `planning-artifacts/`       | PRD、architecture.md、epics.md        |
| `implementation-artifacts/` | sprint-status.yaml、Story 文件、Retro |
| `specs/`                    | Quick Dev 独立 spec                   |
| 根目录                      | `project-context.md` 等               |

升级命令（维护者）：

```bash
npx bmad-method@latest install --yes --action update --directory . \
  --tools cursor,claude-code,opencode,antigravity,kiro,qoder --modules bmm,bmb \
  --pin bmb=v1.5.0 \
  --user-name opc-starter --communication-language Chinese \
  --document-output-language Chinese --output-folder _bmad-output
```

> **注意**：`--modules` 必须同时包含 `bmm,bmb`。仅安装 `bmb` 会移除 BMM skills。外部模块 `bmb` 在无 `GITHUB_TOKEN` 时 `--all-stable` 可能因 GitHub API 限流失败，请使用 `--pin bmb=v1.5.0`。

## 禁止事项

- ❌ 使用 Tailwind CSS v2/v3 语法（`bg-opacity-*`、`bg-gradient-to-*`）
- ❌ 直接操作 IndexedDB 或 Supabase（使用 DataService）
- ❌ 在 A2UI 中使用未注册的组件类型
- ❌ 直接调用 LLM API（通过 ai-assistant Edge Function）
- ❌ 创建独立 SQL 文件或新文档文件

## Checks

在提交 Pull Request 之前，运行 `/check` 对 diff 执行 `.continue/checks/*.md` 中定义的 AI 审查。
所有 Check 必须通过，或由维护者明确确认后，才能创建 PR。

当前已配置的 Checks：

- **分层架构守卫** — 检查依赖方向违规和 UI 层直接导入 Supabase/IndexedDB
- **数据访问与 Agent 规范** — 检查是否绕过 Service/DataService 直接访问数据，以及 Agent/A2UI/LLM 调用是否遵守 starter 约定

后续可优化候选：

- **E2E 选择器迁移** — Cypress 逐步改用 `data-testid`，减少对文案/i18n 的耦合

## 质量门禁

AI Agent 在 commit / push / PR 前必须跑完。**Husky 仅 lint-staged，不跑单测/E2E/构建。**

```bash
# PR 必过（根目录或 app/ 均可）
npm run lint:check && npm run type-check && npm run test && npm run build
npm run test:e2e:headless   # 改 UI / 文案 / i18n / 路由 / 认证时必跑

# 一键全量（format + coverage + build + E2E）
./scripts/quality_check.sh
```

- 用 `lint:check`，不要用 `lint`（PR Check 不带 `--fix`）
- `npm test` 必须**全量**，禁止只 `--run` 单个文件
- i18n 改动：同步 `*.test.*` / Cypress 断言，见 `.cursor/rules/i18n.md`
- PR 前跑 `/check`（`.continue/checks/`）

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

| Task                       | Command                      |
| -------------------------- | ---------------------------- |
| Dev server (mock)          | `npm run dev:test`           |
| Dev server (real Supabase) | `npm run dev`                |
| Lint                       | `npm run lint`               |
| Type check                 | `npm run type-check`         |
| Unit tests                 | `npm test`                   |
| E2E tests                  | `npm run test:e2e:headless`  |
| Core AI checks             | `npm run ai:check`           |
| Full quality check         | `./scripts/quality_check.sh` |
| Build                      | `npm run build`              |
