# OPC-Starter AI Coding 指南

> 一人公司启动器 AI 开发规范 | v2.0（目录式）

## 核心原则

1. **优先更新现有文档**，不创建新文档
2. **SQL 变更通过 Migration 管理** → `app/supabase/migrations/[seq]_[desc].sql`
   - 每个 schema 变更必须创建 migration 文件 + rollback 文件
   - 更新 `migration-manifest.yaml` 注册变更
   - `setup.sql` 由 migration 体系自动维护，禁止直接修改
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
- ❌ 直接修改 `setup.sql`（必须通过 migration 文件变更 schema）
- ❌ 创建 migration 文件但不创建对应的 rollback 文件
- ❌ 创建新文档文件（优先更新现有文档）
- ❌ Story 完成后补测试（测试应伴随开发持续补充）

## 测试责任分层

| 测试类型 | 负责人 | 时机 | 范围 |
|----------|--------|------|------|
| 单元测试 | Dev | Story 开发期间 | 函数、组件、服务层逻辑 |
| 集成测试 | QA | Story 完成后 | 端到端流程、跨模块交互 |
| E2E 测试 | QA | Epic 完成后 | 用户完整旅程 |

### 单元测试标准

**必须测试**：
- 业务逻辑函数（计算、转换、校验）
- 组件事件处理（onClick、onSubmit）
- API 调用成功/失败分支
- 状态管理（store actions、selectors）
- 边界条件（空值、极限值、错误输入）

**不需要测试**：
- 第三方库的内部逻辑
- 纯展示组件的样式
- 框架层面的功能（React 渲染、路由跳转）

### 覆盖率要求

| 代码类型 | 最低覆盖率 | 目标覆盖率 |
|----------|-----------|-----------|
| 核心业务逻辑 | 80% | 100% |
| 关键路径（支付、权限、数据写入） | 100% | 100% |
| UI 组件 | 60% | 80% |

### 测试详细规范

详见 `docs/project-memory/best-practices/testing-strategy.md`

## 项目记忆库

`docs/project-memory/` 存储项目经验教训和最佳实践：

- `lessons-learned/` - 经验教训（按主题分类）
- `best-practices/` - 最佳实践
- `common-pitfalls/` - 常见陷阱
- `memory-index.md` - 总索引

**Story 开始前**查阅相关主题的经验，避免重复踩坑。

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
