# MVP 复盘洞察（Epic 29-34）

> 日期: 2026-03-19
> 范围: Skills Hub MVP Phase 1，6 Epic / 29 Stories / 60 SP

---

## 做得好的

### 1. MCP Server + Migration 机制

**背景**：早期发现 `_schema_migrations` 表未被更新，导致 migration 状态不可追踪。

**解决**：
- 将 status/checksum 字段内置到 baseline（`00001_baseline.sql` 和 `setup.sql`）
- 创建 `TEMPLATE.sql` 标准 migration 模板（开头 pending，末尾 applied）
- 禁止 Node 脚本直接操作数据库，统一走 MCP Server

**效果**：新环境初始化时即具备完整的 migration tracking 能力，无需额外执行独立 migration。

**关键决策点**：
- 用户明确指出"使用 Node 脚本执行 SQL 是危险的"
- 选择将增强内容合并到 baseline 而非独立 migration，确保初始化保障

### 2. Edge Function 权限分离设计

**模式**：
- `skills-publish`：使用 ANON_KEY + JWT，用户级操作，RLS 生效
- `skills-download`：使用 SERVICE_ROLE_KEY，绕过 RLS 记录安装日志

**效果**：权限边界清晰，最小权限原则得到执行。

### 3. 交付完整性

- 6/6 Epic 100% 完成
- 29/29 Stories 全部 done
- 每个 Story 有对应的 implementation artifact 文档
- 7 套 E2E 测试覆盖核心流程

---

## 需要改进的

### 1. 测试责任分层不清晰（P0）

**问题**：测试是在 Stories 完成后补上的，而非开发过程中持续补充。Story 模板没有强制要求单元测试任务。

**改进方案**：
- Dev 负责单元测试（函数、组件、服务层）
- QA 负责集成测试（端到端流程）
- 更新 Story 模板，添加测试任务和 Done 定义

**详见**：`../best-practices/testing-strategy.md`

### 2. Story 模板缺少测试验收（P0）

**问题**：Acceptance Criteria 是功能性的，Done 定义未包含测试覆盖率要求。

**改进方案**：升级 Story 模板，详见 `../best-practices/story-template-v2.md`

### 3. 测试边界不明确（P0）

**问题**：开发者不确定"单元测试应该测什么"，导致要么不写，要么过度测试。

**改进方案**：定义测试边界指南，详见 `../best-practices/testing-strategy.md`

### 4. Design Tokens 缺失（P1）

**问题**：不同开发者写的组件风格不统一，PRD 缺乏 UI 规范文档。

**改进方案**：创建 `docs/DESIGN_TOKENS.md`，统一 UI 规范。

### 5. 上传/下载缺乏标准化封装（P1）

**问题**：每个涉及文件上传的 Story 都需要重新理解 signed URL 逻辑。

**改进方案**：抽取 `skillStorageService` 为可复用模式，添加详细注释和使用示例。

### 6. 测试环境隔离不足（P1）

**问题**：MSW mock 数据污染，E2E 测试断言不稳定。

**改进方案**：QA 制定测试数据隔离策略。

### 7. Migration 顺序依赖人工协调（P2）

**问题**：Epic 间有依赖关系（如 31.x 需要 29.x 的触发器），顺序靠 SM 手动控制。

**潜在方案**：考虑 migration 依赖声明或自动化校验。

---

## 关键决策记录

| 决策 | 背景 | 选择 | 理由 |
|------|------|------|------|
| Migration tracking 内置到 baseline | 00006 独立 migration 导致初始化不完整 | 合并到 baseline | 新环境初始化即具备完整能力 |
| 禁止 Node 脚本执行 SQL | 用户指出安全风险 | 统一走 MCP Server | 安全可控，审计可追溯 |
| 测试分层 | 测试补在开发后 | Dev 单元测试 + QA 集成测试 | 责任清晰，效率更高 |

---

## 对 Post-MVP 的影响

Epic 35-37 开始前必须完成：

1. ✅ Story 模板升级（含测试任务）
2. ✅ 测试责任分层写入 AGENTS.md
3. ✅ 测试边界指南

第一个 Sprint 内完成：

4. Design Tokens 文档
5. 上传/下载封装优化
6. 测试环境隔离策略

---

## 参与者

- opc-starter (Project Lead)
- Alice (Product Owner)
- Bob (Scrum Master)
- Charlie (Senior Dev)
- Dana (QA Engineer)
- Elena (Junior Dev)
