# Swarm Agent 改进建议：借鉴 OpenAI Harness Engineering

> 创建时间：2026-02-24
>
> 来源：精读 [OpenAI Harness Engineering](https://openai.com/zh-Hans-CN/index/harness-engineering/)
> 文章，对比 Swarm Agent 项目的设计文档（plan.md / plan-V3.md / plan-next.md）与代码实现，
> 提炼出可落地的改进方向。
>
> 核心命题：**OpenAI 用 3 名工程师 + Codex 在 5 个月内交付百万行代码产品。
> 他们发现"人类的工作不再是写代码，而是设计环境、表达意图、构建反馈循环"。
> Swarm 作为多 Agent 编排系统，如何吸收这些经验来提升自身？**

---

## 一、文章核心洞察提炼

OpenAI Harness Engineering 文章记录了一个极端实验：**0 行人工代码**，完全由 Codex Agent
生成的内部产品。以下是 8 个核心洞察：

| # | 洞察 | 原文关键句 |
|---|------|-----------|
| H1 | **AGENTS.md 是目录而非百科全书** | "Give Codex a map, not a 1,000-page instruction manual" |
| H2 | **仓库知识是唯一真相源** | "Repository-local, versioned artifacts are all it can see" |
| H3 | **渐进式披露优于信息轰炸** | "Progressive disclosure: agents start with a small, stable entry point" |
| H4 | **机械化执行架构约束** | "Enforce invariants, not implementations... custom linters" |
| H5 | **应用可观测性直接暴露给 Agent** | "Made logs, metrics, traces directly legible to Codex" |
| H6 | **高吞吐改变合并哲学** | "Corrections are cheap, waiting is expensive" |
| H7 | **熵增需要持续垃圾回收** | "Golden principles + recurring cleanup = garbage collection" |
| H8 | **Agent 自治需要分层自治** | "End-to-end: reproduce bug → validate → fix → record → merge" |

---

## 二、Swarm 现状 vs Harness Engineering 逐项对比

### 对比矩阵

| 维度 | OpenAI Harness Engineering | Swarm 现状 | 差距评级 |
|------|---------------------------|-----------|---------|
| **AGENTS.md 设计** | ~100 行目录，指向 docs/ 深层文档 | 277 行完整指南，包含 Source Map + 规则 + 模式 | 🟡 中等 |
| **仓库知识体系** | 结构化 docs/（design-docs/ exec-plans/ product-specs/ references/） | docs/ 存在但以 epic/phase 为主，缺少 design-docs 和 product-specs | 🔴 较大 |
| **渐进式披露** | AGENTS.md → ARCHITECTURE.md → docs/design-docs/index.md → 具体文档 | AGENTS.md 一次性全量注入，无分层导航 | 🔴 较大 |
| **架构约束机械化** | 自定义 linter + 结构化测试 + 分层依赖方向验证 | Biome lint + TypeScript strict，无自定义架构 linter | 🔴 较大 |
| **应用可观测性** | Agent 可查 LogQL/PromQL，可驱动 Chrome DevTools | `swarm logs` + 心跳 + SSE，但 Agent 自身无法查询可观测性数据 | 🟡 中等 |
| **合并哲学** | 最小阻塞门禁，快速修正 | 4 层合并策略（ff → recursive → AI → human），已有 `--partial` | 🟢 较小 |
| **熵管理/垃圾回收** | Golden principles + 定期 Agent 扫描 + 自动修复 PR | `swarm clean --ghosts` 清理资源，无代码质量自动巡检 | 🔴 较大 |
| **分层自治** | 单 prompt → 复现 → 修复 → 录屏 → 合并 → 升级人工 | plan → run → merge，但 Agent 不能自主发起修复循环 | 🟡 中等 |
| **Execution Plan 作为一等公民** | Plans 版本化、有进度日志、区分 active/completed | `.swarm/plans/` 存在但无进度追踪，无 completed 归档 | 🟡 中等 |
| **Doc Gardening Agent** | 定期扫描过期文档，自动开 fix-up PR | 无自动文档维护机制 | 🔴 较大 |
| **Per-worktree 应用实例** | 每个 worktree 可启动独立应用实例 | worktree 仅用于代码隔离，不启动应用 | 🟡 中等 |
| **Agent-to-Agent Review** | Agent 自动 review + 迭代直到满意 | Reviewer Agent 存在但单次 review，无迭代循环 | 🟡 中等 |
| **"无聊"技术偏好** | 偏好 Agent 可完全理解的稳定技术 | 已遵循（SQLite, Hono, pino），但未明确文档化原则 | 🟢 较小 |
| **自实现 vs 外部依赖** | 宁可自实现也要 100% 可控 | `ConcurrencyLimiter` 自实现 ✅，但其他地方未系统化 | 🟢 较小 |

---

## 三、高优先级改进建议（P0/P1）

### H-1: 重构 AGENTS.md 为"目录 + 指针"模式

**对应洞察**: H1 + H3（目录而非百科全书 + 渐进式披露）

**问题分析**:

当前 `AGENTS.md` 有 277 行，包含完整的 Source Map、Tech Stack、Key Patterns、Common Pitfalls、
Environment Variables 等。对于 Agent 来说，这已经接近"一次性灌入所有信息"的反模式。
OpenAI 的经验表明：

> "Too much guidance becomes non-guidance. When everything is 'important,' nothing is."

**改进方案**:

将 AGENTS.md 精简为 ~100 行的"导航地图"，详细内容下沉到 docs/ 子文档：

```
AGENTS.md (100 行)
  ├── 项目简介（10 行）
  ├── 核心规则（8 条 Non-Negotiable Rules，20 行）
  ├── 快速命令参考（10 行）
  └── 导航指针：
      ├── → docs/ARCHITECTURE.md        # 模块分层 + 依赖方向
      ├── → docs/SOURCE_MAP.md          # 完整文件清单
      ├── → docs/CONVENTIONS.md         # 编码规范 + 模式
      ├── → docs/design-docs/index.md   # 设计决策索引
      ├── → docs/exec-plans/active/     # 活跃执行计划
      └── → docs/QUALITY_SCORE.md       # 各模块质量评级
```

**关键原则**：Agent 在开始工作时只读 AGENTS.md（~100 行），然后根据任务需要按指针深入。
这样 Context Window 的利用率大幅提升。

**对 Overlay 的影响**：`OverlayGenerator` 当前使用 `extractConventions()` 从项目 AGENTS.md
提取约定。重构后，Overlay 应该：
1. 注入精简版 AGENTS.md 全文
2. 根据 task 的 `file_scope` 自动选择相关的 docs/ 子文档片段
3. 实现"按需加载"——只给 Agent 它需要的上下文

**实施文件变更**:

| 文件 | 变更 |
|------|------|
| `AGENTS.md` | 精简为 ~100 行导航地图 |
| `docs/ARCHITECTURE.md` | 新增：模块分层 + 依赖方向图 |
| `docs/SOURCE_MAP.md` | 从 AGENTS.md 迁移 Source Map |
| `docs/CONVENTIONS.md` | 从 AGENTS.md 迁移编码规范 |
| `src/agents/overlay.ts` | 改造 `extractConventions()` 支持多文档源 |

**预估工期**: 3 天

---

### H-2: 建立结构化仓库知识体系

**对应洞察**: H2（仓库知识是唯一真相源）

**问题分析**:

OpenAI 的 docs/ 目录有清晰的分类：

```
docs/
├── design-docs/        # 设计决策（带验证状态）
│   ├── index.md        # 索引
│   └── core-beliefs.md # 核心信念
├── exec-plans/         # 执行计划（区分 active/completed）
│   ├── active/
│   ├── completed/
│   └── tech-debt-tracker.md
├── product-specs/      # 产品规格
├── references/         # 外部参考（LLM-friendly 格式）
├── DESIGN.md
├── QUALITY_SCORE.md
└── RELIABILITY.md
```

Swarm 的 docs/ 以 phase/epic 为主组织，缺少：
- **design-docs/**：为什么选择 SQLite 而非 Redis？为什么用 tmux 而非 Docker？
  这些决策散落在 plan.md 中，但没有独立的设计决策文档。
- **exec-plans/active vs completed**：计划没有生命周期管理。
- **QUALITY_SCORE.md**：各模块的质量评级（测试覆盖率、已知问题、稳定性）。
- **references/**：外部依赖的 LLM-friendly 参考文档。

**改进方案**:

```
docs/
├── design-docs/
│   ├── index.md                    # 设计决策索引（带验证状态）
│   ├── adr-001-sqlite-over-redis.md
│   ├── adr-002-tmux-over-docker.md
│   ├── adr-003-direct-api-over-sdk.md
│   ├── adr-004-overlay-template-engine.md
│   └── core-beliefs.md             # Agent-first 核心信念
├── exec-plans/
│   ├── active/                     # 当前活跃计划
│   ├── completed/                  # 已完成计划（带结果）
│   └── tech-debt-tracker.md        # 技术债务追踪
├── references/
│   ├── ollama-api-llms.txt         # Ollama API 参考
│   ├── hono-llms.txt               # Hono 框架参考
│   └── better-sqlite3-llms.txt     # better-sqlite3 参考
├── ARCHITECTURE.md                 # 模块分层 + 依赖方向
├── SOURCE_MAP.md                   # 完整文件清单
├── CONVENTIONS.md                  # 编码规范
├── QUALITY_SCORE.md                # 各模块质量评级
└── RELIABILITY.md                  # 可靠性要求
```

**核心信念文档 (core-beliefs.md) 示例**:

```markdown
# Swarm Core Beliefs

1. **Agent 可理解性优先于人类审美** — 代码风格可以不完美，但必须对未来 Agent 可读。
2. **仓库即全部上下文** — Slack 讨论、会议决策必须沉淀为 docs/ 文档，否则对 Agent 不存在。
3. **约束先于实现** — Scout 发现的约束比 Builder 写的代码更有价值。
4. **无聊技术优于炫酷技术** — 选择 Agent 训练数据中充分覆盖的稳定技术。
5. **自实现优于黑盒依赖** — 当外部库行为不透明时，宁可自实现子集。
6. **机械化执行优于文档约束** — 能用 linter 检查的规则，不要只写在文档里。
```

**实施文件变更**:

| 文件 | 变更 |
|------|------|
| `docs/design-docs/index.md` | 新增：设计决策索引 |
| `docs/design-docs/core-beliefs.md` | 新增：核心信念 |
| `docs/design-docs/adr-*.md` | 新增：3-5 个关键 ADR |
| `docs/exec-plans/` | 重组：active/ + completed/ |
| `docs/QUALITY_SCORE.md` | 新增：模块质量评级 |
| `docs/ARCHITECTURE.md` | 新增：分层架构 + 依赖方向 |

**预估工期**: 1 周

---

### H-3: 架构约束机械化执行

**对应洞察**: H4（机械化执行架构约束）

**问题分析**:

OpenAI 的关键实践是：

> "Each business domain is divided into a fixed set of layers, with strictly validated
> dependency directions and a limited set of permissible edges. These constraints are
> enforced mechanically via custom linters and structural tests."

> "Custom lints with error messages that inject remediation instructions into agent context."

Swarm 当前依赖 Biome（通用 linter）和 TypeScript strict mode，但缺少：
1. **模块依赖方向验证** — `cli/` 不应直接 import `stores/`，应通过 `core/` 中转
2. **文件大小限制** — 防止 Agent 生成巨型文件
3. **结构化日志强制** — 所有 `console.log` 应替换为 `logger.*`
4. **命名规范强制** — Store 类必须以 `Store` 结尾，Runner 类必须以 `Runner` 结尾
5. **Import 路径规范** — `.js` 扩展名检查（已有规则但未机械化）

**改进方案**:

创建 `scripts/lint-architecture.ts`，作为自定义架构 linter：

```typescript
// scripts/lint-architecture.ts
// 模块依赖方向规则
const LAYER_ORDER = [
  'types',      // 0: 纯类型
  'errors',     // 1: 错误定义
  'utils',      // 2: 工具函数
  'config',     // 3: 配置
  'stores',     // 4: 数据存储
  'backends',   // 5: AI 后端
  'messaging',  // 6: 消息
  'trace',      // 7: 追踪
  'metrics',    // 8: 指标
  'isolation',  // 9: 隔离层
  'agents',     // 10: Agent 实现
  'core',       // 11: 核心编排
  'merge',      // 12: 合并
  'bench',      // 13: 基准测试
  'dashboard',  // 14: 仪表盘
  'mcp',        // 15: MCP 服务
  'cli',        // 16: CLI 命令
];

// 禁止的依赖方向（高层不应依赖低层之外的模块）
const FORBIDDEN_IMPORTS: Record<string, string[]> = {
  'utils/': ['cli/', 'core/', 'agents/', 'dashboard/'],
  'stores/': ['cli/', 'core/', 'agents/', 'dashboard/'],
  'backends/': ['cli/', 'agents/', 'dashboard/'],
};
```

**Linter 错误消息应包含修复指导**（OpenAI 的关键实践）：

```
ERROR: src/cli/run.ts imports from src/stores/sessions.ts directly.
FIX: CLI commands should access stores through core/ modules.
     Use Dispatcher or Planner to access session data.
     See docs/ARCHITECTURE.md#layer-dependencies for details.
```

**实施文件变更**:

| 文件 | 变更 |
|------|------|
| `scripts/lint-architecture.ts` | 新增：自定义架构 linter |
| `package.json` | 新增 `lint:arch` 脚本 |
| `docs/ARCHITECTURE.md` | 新增：分层规则文档 |

**预估工期**: 1 周

---

### H-4: Agent 可观测性闭环（Agent 可查询自身指标）

**对应洞察**: H5（应用可观测性直接暴露给 Agent）

**问题分析**:

OpenAI 的做法极具启发性：

> "We wired the Chrome DevTools Protocol into the agent runtime and created skills for
> working with DOM snapshots, screenshots, and navigation."
>
> "Agents can query logs with LogQL and metrics with PromQL."
>
> "Prompts like 'ensure service startup completes in under 800ms' become tractable."

Swarm 当前的可观测性是**人类可见但 Agent 不可见**的：
- `swarm logs` — 人类在终端查看
- `swarm status` — 人类在终端查看
- Dashboard SSE — 人类在浏览器查看
- `metrics.db` — 数据存在但 Agent 无法查询

Builder Agent 在执行任务时，无法：
- 查看自己的 token 消耗
- 检查测试是否通过
- 验证自己的代码变更是否符合架构规则
- 查看其他 Agent 的状态

**改进方案**:

为 Agent 提供"自省工具"——在 Overlay 中注入可执行的查询命令：

```markdown
## Self-Inspection Tools (Available in your worktree)

# 查看你的 token 消耗
swarm metrics --agent ${agent_id} --json

# 运行测试并获取结构化结果
npm run test:json 2>/dev/null && cat .swarm/test-results.json

# 检查架构合规性
npm run lint:arch -- --scope ${file_scope} 2>&1

# 查看其他 Agent 的状态（只读）
swarm status --json

# 查看你的任务依赖是否完成
swarm task list ${plan_id} --json
```

**更进一步**：让 Builder Agent 在生成代码后自动运行验证循环：

```typescript
// src/agents/builder-runner.ts 改造
async run(taskDescription: string): Promise<void> {
  // 1. 生成代码（现有逻辑）
  const operations = await this.generateCode(taskDescription);
  await this.writeFiles(operations);

  // 2. 自验证循环（新增）
  for (let attempt = 0; attempt < 3; attempt++) {
    const testResult = await this.runTests();
    const lintResult = await this.runArchLint();

    if (testResult.passed && lintResult.passed) break;

    // 将失败信息反馈给 LLM，请求修复
    const fixPrompt = this.buildFixPrompt(testResult, lintResult);
    const fixOps = await this.generateCode(fixPrompt);
    await this.writeFiles(fixOps);
  }

  // 3. 提交 + 报告
  await this.commit();
  await this.sendCompletion();
}
```

**实施文件变更**:

| 文件 | 变更 |
|------|------|
| `src/agents/builder-runner.ts` | 新增自验证循环 |
| `src/agents/overlay.ts` | Overlay 注入自省工具命令 |
| `templates/agents.md.tmpl` | 新增 Self-Inspection Tools 章节 |
| `src/cli/metrics.ts` | 支持 `--agent` 过滤 |

**预估工期**: 1 周

---

### H-5: 熵管理——自动化代码质量巡检 Agent

**对应洞察**: H7（Golden Principles + 垃圾回收）

**问题分析**:

OpenAI 的经验：

> "Codex replicates patterns that already exist in the repository—even uneven or suboptimal
> ones. Over time, this inevitably leads to drift."
>
> "We started encoding 'golden principles' directly into the repository and built a recurring
> cleanup process."
>
> "On a regular cadence, we have background Codex tasks that scan for deviations, update
> quality grades, and open targeted refactoring pull requests."

Swarm 当前有 `swarm clean --ghosts` 清理僵尸资源，但没有：
- 代码质量自动巡检
- 模式偏移检测
- 自动修复 PR 生成
- 质量评级追踪

**改进方案**:

新增 `swarm audit` 命令——定期运行的"代码卫生巡检 Agent"：

```bash
# 全量巡检
swarm audit

# 针对特定目录
swarm audit src/agents/

# 只检查特定规则
swarm audit --rules naming,file-size,dead-code

# 自动生成修复建议
swarm audit --fix-suggestions
```

**巡检规则（Golden Principles）**:

| 规则 | 检查内容 | 自动修复？ |
|------|---------|-----------|
| `naming` | Store 类以 Store 结尾，Runner 以 Runner 结尾 | ✅ 可重命名 |
| `file-size` | 单文件不超过 500 行 | ❌ 需人工拆分 |
| `dead-code` | 未使用的 export、未引用的文件 | ✅ 可删除 |
| `console-log` | 禁止 `console.log`，必须用 `logger.*` | ✅ 可替换 |
| `import-cycle` | 检测循环依赖 | ❌ 需架构调整 |
| `test-coverage` | 新增文件必须有对应测试 | ❌ 需生成测试 |
| `doc-freshness` | docs/ 文档与代码是否一致 | ❌ 需更新文档 |
| `todo-tracker` | 代码中 TODO 注释追踪 | ✅ 可生成 issue |

**质量评级追踪 (QUALITY_SCORE.md)**:

```markdown
# Swarm Quality Score

Last updated: 2026-02-24 (auto-generated by `swarm audit`)

| Module | Coverage | Lint | Size | Dead Code | Score | Trend |
|--------|----------|------|------|-----------|-------|-------|
| backends/ | 85% | ✅ | ✅ | 0 | A | → |
| agents/ | 62% | ✅ | ⚠️ | 2 | B | ↑ |
| core/ | 71% | ✅ | ✅ | 1 | B+ | → |
| stores/ | 90% | ✅ | ✅ | 0 | A | → |
| cli/ | 45% | ✅ | ⚠️ | 3 | C+ | ↑ |
| mcp/ | 0% | ✅ | ✅ | 0 | D | → |
| dashboard/ | 55% | ✅ | ✅ | 1 | B- | → |
```

**实施文件变更**:

| 文件 | 变更 |
|------|------|
| `src/cli/audit.ts` | 新增：`swarm audit` 命令 |
| `src/core/auditor.ts` | 新增：巡检引擎 |
| `scripts/lint-architecture.ts` | 复用架构 linter |
| `docs/QUALITY_SCORE.md` | 新增：自动生成的质量评级 |
| `docs/design-docs/golden-principles.md` | 新增：Golden Principles 文档 |

**预估工期**: 2 周

---

## 四、中优先级改进建议（P2）

### H-6: Execution Plan 生命周期管理

**对应洞察**: H2（Plans 作为一等公民）

OpenAI 将 Execution Plan 视为版本化的一等公民：

> "Plans are treated as first-class artifacts. Ephemeral lightweight plans are used for
> small changes, while complex work is captured in execution plans with progress and
> decision logs that are checked into the repository."

**Swarm 现状**:
- `.swarm/plans/{id}.md` 存在但无进度追踪
- 计划完成后不归档，无 completed 状态
- 无决策日志（为什么选择方案 A 而非方案 B）

**改进方案**:

```
.swarm/plans/
├── active/
│   └── plan-20260224-001.md    # 包含进度标记
├── completed/
│   └── plan-20260223-001.md    # 包含结果摘要
└── decision-log.md             # 跨计划决策日志
```

计划文件增加进度追踪：

```markdown
# Execution Plan: plan-20260224-001

## Progress
- [x] task-001: Implement JWT validation (completed 14:30, 45s)
- [x] task-002: Update auth middleware (completed 14:31, 62s)
- [ ] task-003: Add integration tests (failed: timeout, retried 1x)
- [ ] task-004: Update API docs (blocked by task-003)

## Decision Log
- 14:25: Chose JWT over session tokens because existing middleware is stateless
- 14:32: task-003 timed out; increased timeout to 10min for test tasks
```

**实施文件变更**:

| 文件 | 变更 |
|------|------|
| `src/core/planner.ts` | 计划保存到 `active/`，完成后移到 `completed/` |
| `src/core/dispatcher.ts` | 执行时更新计划进度标记 |
| `src/cli/plan.ts` | `swarm plan list` 显示 active/completed |

**预估工期**: 3 天

---

### H-7: Agent-to-Agent Review 迭代循环（Ralph Wiggum Loop）

**对应洞察**: H8（Agent 自治 + 迭代直到满意）

OpenAI 描述了一个关键模式：

> "We instruct Codex to review its own changes locally, request additional specific agent
> reviews both locally and in the cloud, respond to any human or agent given feedback,
> and iterate in a loop until all agent reviewers are satisfied."

这被称为 [Ralph Wiggum Loop](https://ghuntley.com/loop/)——Agent 自我审查 + 外部 Agent
审查的迭代循环。

**Swarm 现状**:
- ReviewerRunner 执行单次 review，产出 approved/rejected
- 如果 rejected，需要人工介入或重新 dispatch
- 没有"Builder 根据 review 反馈自动修复"的循环

**改进方案**:

```
Builder 生成代码
    │
    ▼
Builder 自审（self-review）
    │ 发现问题？→ 自动修复 → 重新自审
    │
    ▼ 自审通过
Reviewer Agent 审查
    │ 发现问题？
    │     ▼
    │ 反馈发送给 Builder（via mail）
    │     ▼
    │ Builder 根据反馈修复
    │     ▼
    │ 重新提交给 Reviewer
    │     ▼
    │ 循环直到 Reviewer approved（最多 3 轮）
    │
    ▼ Reviewer approved
自动 merge
```

**实施文件变更**:

| 文件 | 变更 |
|------|------|
| `src/agents/builder-runner.ts` | 新增 `selfReview()` 方法 |
| `src/agents/reviewer-runner.ts` | 支持多轮 review，发送结构化反馈 |
| `src/core/dispatcher.ts` | 支持 builder-reviewer 迭代循环 |
| `src/messaging/types.ts` | 新增 `review_feedback` 消息类型 |

**预估工期**: 1 周

---

### H-8: Doc Gardening Agent（文档自动维护）

**对应洞察**: H7（定期扫描过期文档）

> "A recurring 'doc-gardening' agent scans for stale or obsolete documentation that does
> not reflect the real code behavior and opens fix-up pull requests."

**改进方案**:

新增 `swarm garden` 命令（或集成到 `swarm audit`）：

```bash
swarm garden                    # 扫描所有文档
swarm garden --fix              # 自动修复过期文档
swarm garden --check-links      # 检查文档内链接有效性
```

**检查项**:
1. **Source Map 一致性** — AGENTS.md 中的 Source Map 与实际文件是否匹配
2. **API 文档新鲜度** — docs/ 中描述的接口与代码是否一致
3. **死链接** — 文档内引用的文件/URL 是否存在
4. **配置文档同步** — config.yaml 示例与 Zod schema 是否匹配

**实施文件变更**:

| 文件 | 变更 |
|------|------|
| `src/cli/audit.ts` | 集成 `--garden` 选项 |
| `src/core/auditor.ts` | 新增文档检查规则 |

**预估工期**: 3 天

---

### H-9: Per-Worktree 应用验证环境

**对应洞察**: H5（每个 worktree 可启动独立应用实例）

> "We made the app bootable per git worktree, so Codex could launch and drive one instance
> per change."

**Swarm 现状**: Worktree 仅用于代码隔离。Builder Agent 无法在自己的 worktree 中启动应用
来验证行为。

**改进方案**:

在 `AgentSpawner` 中支持可选的"应用启动"步骤：

```yaml
# .swarm/config.yaml
agents:
  verification:
    enabled: true
    bootCommand: "npm run dev"     # 在 worktree 中启动应用
    healthCheck: "curl -s http://localhost:${PORT}/health"
    portRange: [4000, 4100]        # 每个 Agent 分配不同端口
    shutdownCommand: "kill $PID"
```

这让 Builder Agent 可以：
1. 写代码
2. 启动应用
3. 运行健康检查
4. 验证 API 行为
5. 关闭应用
6. 提交

**预估工期**: 1 周

---

## 五、低优先级改进建议（P3）

### H-10: "无聊技术"选择原则文档化

**对应洞察**: OpenAI 偏好 Agent 可完全理解的稳定技术

> "Technologies often described as 'boring' tend to be easier for agents to model due to
> composability, API stability, and representation in the training set."

Swarm 已经在实践这一原则（SQLite, Hono, pino, yargs），但未明确文档化。
建议在 `docs/design-docs/core-beliefs.md` 中增加"技术选择原则"章节。

### H-11: 自实现 vs 外部依赖决策框架

> "In some cases, it was cheaper to have the agent reimplement subsets of functionality
> than to work around opaque upstream behavior from public libraries."

Swarm 的 `ConcurrencyLimiter` 是一个好例子。建议建立决策框架：

```markdown
## 何时自实现

1. 外部库 API 不稳定或频繁变更
2. 只需要库功能的 <20%
3. 需要与内部可观测性深度集成
4. 库的行为对 Agent 不透明（无法从代码推断行为）

## 何时使用外部库

1. 功能复杂且经过充分测试（如 better-sqlite3）
2. 是事实标准（如 zod, pino）
3. Agent 训练数据中有大量使用示例
```

### H-12: Linter 错误消息注入修复指导

**对应洞察**: H4（自定义 lint 错误消息包含修复指导）

> "We write the error messages to inject remediation instructions into agent context."

这是一个高杠杆的小改进。当 Agent 遇到 lint 错误时，错误消息本身就告诉它如何修复：

```
ERROR [swarm/no-direct-store-import]:
  src/cli/run.ts:42 imports SessionsStore directly.

  REMEDIATION: CLI commands should not import stores directly.
  Instead, use the Dispatcher or Planner which encapsulate store access.

  Example:
    // ❌ Wrong
    import { SessionsStore } from '../stores/sessions.js';
    // ✅ Correct
    import { Dispatcher } from '../core/dispatcher.js';
```

---

## 六、实施路线图

```
Phase 1 (Week 1-2): 知识体系重构
├── H-1: AGENTS.md 精简为导航地图
├── H-2: 结构化仓库知识体系（design-docs/, ARCHITECTURE.md, QUALITY_SCORE.md）
└── H-10/H-11: 核心信念 + 技术选择原则文档化

Phase 2 (Week 3-4): 机械化约束
├── H-3: 自定义架构 linter（依赖方向 + 文件大小 + 命名规范）
├── H-12: Linter 错误消息注入修复指导
└── H-8: Doc Gardening（集成到 swarm audit）

Phase 3 (Week 5-6): Agent 自治能力提升
├── H-4: Agent 可观测性闭环（自省工具 + 自验证循环）
├── H-7: Agent-to-Agent Review 迭代循环
└── H-6: Execution Plan 生命周期管理

Phase 4 (Week 7-8): 熵管理
├── H-5: swarm audit 代码质量巡检
├── H-9: Per-Worktree 应用验证环境
└── 质量评级自动追踪
```

---

## 七、预期收益

| 指标 | 当前值 | 改进后目标 | 对应改进项 |
|------|--------|-----------|-----------|
| AGENTS.md 大小 | 277 行 | ~100 行 | H-1 |
| Agent Context 利用率 | 全量注入 | 按需加载 | H-1, H-3 |
| 架构约束执行方式 | 文档约定 | 机械化 linter | H-3, H-12 |
| Builder 自验证 | 无 | 3 轮自动修复循环 | H-4 |
| Review 迭代 | 单次 | 最多 3 轮自动迭代 | H-7 |
| 文档新鲜度 | 人工维护 | 自动检测 + 修复建议 | H-8 |
| 代码质量追踪 | 无 | 自动评级 + 趋势 | H-5 |
| 设计决策可追溯性 | 散落在 plan.md | ADR 索引 + 决策日志 | H-2, H-6 |

---

## 八、与现有改进计划的关系

| 现有计划 | 关系 | 说明 |
|---------|------|------|
| plan-V3.md（执行监控 + 失败恢复） | 互补 | H-4 的自验证循环建立在 V3 的心跳/重试基础上 |
| plan-next.md H1（Pre-Sprint Scout） | 互补 | H-2 的知识体系为 Scout 提供更好的上下文 |
| plan-next.md H2（Adversarial Planning） | 互补 | H-7 的迭代循环可用于 adversarial review |
| plan-next.md H4（Data-Driven Routing） | 正交 | 不冲突，可并行推进 |
| plan-next.md H5（Constraint Library） | 互补 | H-2 的 exec-plans/completed 可为约束库提供历史数据 |
| plan-next.md M1（MCP Server） | 正交 | 不冲突 |
| improve-bench.md（评估能力改进） | 互补 | H-5 的质量评级可作为 bench 的新维度 |
| epic-stories-v3.md（V3 EPIC） | 已完成 | H-4 建立在 V3 EPIC 1-3 的基础上 |

---

## 九、风险与缓解

| 风险 | 影响 | 缓解措施 |
|------|------|---------|
| AGENTS.md 精简后 Agent 找不到信息 | 高 | 渐进式迁移，先保留旧版作为 fallback |
| 自定义 linter 误报率高 | 中 | 先 warning-only 模式运行 2 周，收集反馈后再 enforce |
| Builder 自验证循环增加执行时间 | 中 | 设置最大迭代次数（3 轮），超时后跳过 |
| Doc Gardening 产生噪音 PR | 低 | 只在检测到实质性偏差时触发 |
| 架构分层过于严格限制灵活性 | 中 | 提供 `// lint-disable: layer-violation` 逃生舱 |

---

## 十、总结

OpenAI Harness Engineering 文章的核心启示是：**在 Agent-first 世界中，工程师的工作从"写代码"
转变为"设计让 Agent 高效工作的环境"。** 这个环境包括：

1. **知识架构** — 给 Agent 地图而非百科全书（H-1, H-2）
2. **机械化约束** — 用 linter 而非文档来执行规则（H-3, H-12）
3. **可观测性闭环** — Agent 不仅被观测，还能自我观测（H-4）
4. **熵管理** — 持续的自动化质量巡检（H-5, H-8）
5. **迭代自治** — Agent 自审 + 互审的循环直到质量达标（H-7）

Swarm 项目已经在多 Agent 编排、隔离执行、约束发现等方面建立了坚实基础。
上述改进建议旨在将 Swarm 从"多 Agent 编排工具"提升为"Agent-first 开发环境"——
不仅编排 Agent 的执行，还优化 Agent 的工作环境，使其能更自主、更高质量地完成任务。

---

## 参考

- [OpenAI: Harness Engineering](https://openai.com/zh-Hans-CN/index/harness-engineering/) — 本文核心参考
- [OpenAI: Unlocking the Codex Harness](https://openai.com/zh-Hans-CN/index/unlocking-the-codex-harness/) — Codex App Server 架构
- [OpenAI: Codex Execution Plans](https://cookbook.openai.com/articles/codex_exec_plans) — Execution Plan 最佳实践
- [Ralph Wiggum Loop](https://ghuntley.com/loop/) — Agent 自审迭代模式
- [matklad: ARCHITECTURE.md](https://matklad.github.io/2021/02/06/ARCHITECTURE.md.html) — 架构文档最佳实践
- [Parse, Don't Validate](https://lexi-lambda.github.io/blog/2019/11/05/parse-don-t-validate/) — 边界解析原则
- [Bicameral AI: Tech Debt Meeting](https://www.bicameral-ai.com/blog/tech-debt-meeting) — 约束发现研究
- [plan-phases-0-9.md](../completed/plan-phases-0-9.md) — Swarm 原始实现计划
- [plan-V3.md](../completed/plan-V3.md) — V3 执行监控 + 失败恢复计划
- [plan-next.md](../completed/plan-next.md) — 下阶段改进计划
- [docs/improve-bench.md](./improve-bench.md) — 评估能力改进计划
