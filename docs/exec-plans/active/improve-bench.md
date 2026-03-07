# Swarm 评估能力改进计划

> 创建时间：2026-02-22
>
> 背景：结合 [Bicameral AI 文章](https://www.bicameral-ai.com/blog/tech-debt-meeting) 的洞察、
> [cline-bench](https://github.com/cline/cline-bench) 的评估理念、以及当前 Swarm 项目的
> `swarm-ai-loop` 技能和 `report.md` 迭代机制，设计一套完整的评估改进方案。
>
> 核心目标：**让每次迭代的效果可量化、可追溯、可回归——确保持续改进而非变坏。**

---

## 1. 问题诊断

### 1.1 当前评估体系的能力边界

| 已有能力 | 缺失能力 |
|----------|----------|
| `swarm bench` 5 维评分（correctness/planning/efficiency/coordination/cost） | 无"约束发现质量"评分维度 |
| `RegressionGuard` 检测分数回归 | 无 AI Loop 迭代间的回归检测 |
| 13 个 benchmark tasks（smoke/core/stress） | 无约束发现/Stakeholder 报告质量的 task |
| `report.md` 人工记录每轮结果 | 无自动化的迭代间对比指标 |
| `smoke-test.sh` 40+ CLI 冒烟用例 | 冒烟测试不产出结构化评分数据 |
| `BenchStore` SQLite 持久化 run 数据 | AI Loop 迭代数据未持久化 |

### 1.2 cline-bench 的启发

cline-bench 的设计有三个值得借鉴的核心理念：

1. **真实场景驱动**：每个 task 来自真实用户会话，不是人造的 toy problem
2. **二值判定 + 自动化验证**：`reward = 1.0`（全部测试通过）或 `0.0`（任一失败），用 pytest 自动判定
3. **环境隔离**：每个 task 有独立的 Dockerfile，确保可复现

Swarm 的评估需要在此基础上扩展——因为 Swarm 不只是"写代码"，还包括"发现约束"、"生成报告"、"协调多 Agent"等维度。

### 1.3 Bicameral 视角下的评估缺口

Bicameral 文章的核心论点是：AI 编程助手加速了实现但跳过了约束发现。对 Swarm 而言，评估体系必须回答：

> **Scout 是否真的在实现前发现了约束？发现的约束是否有价值？Stakeholder 报告是否可读？**

当前的 5 维评分没有覆盖这些问题。

---

## 2. 改进方案总览

```
┌──────────────────────────────────────────────────────────────────┐
│                    评估能力改进三层架构                            │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Layer 3: AI Loop 迭代追踪                                       │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │  report.md 结构化指标 → iteration-metrics.db → 趋势分析    │  │
│  └────────────────────────────────────────────────────────────┘  │
│                                                                  │
│  Layer 2: 约束发现评估维度                                       │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │  新 bench tasks + constraint_quality 评分 + report 评分     │  │
│  └────────────────────────────────────────────────────────────┘  │
│                                                                  │
│  Layer 1: 基础评估加固                                           │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │  冒烟测试结构化输出 + bench guard 接入 AI Loop + baseline   │  │
│  └────────────────────────────────────────────────────────────┘  │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

---

## 3. Layer 1：基础评估加固

### 3.1 冒烟测试结构化输出

**问题**：`smoke-test.sh` 输出人类可读文本，但无法被程序解析用于趋势追踪。

**改进**：让冒烟测试输出 JSON 摘要，可被 AI Loop 自动采集。

```bash
# smoke-test.sh 末尾新增 JSON 摘要输出
# 输出到 .swarm/smoke-results.json
{
  "timestamp": "2026-02-22T10:30:00Z",
  "version": "1.0.0",
  "total": 40,
  "passed": 40,
  "failed": 0,
  "skipped": 0,
  "duration_sec": 12.3,
  "failures": []
}
```

**实现要点**：
- 在 `smoke-test.sh` 中增加 `--json` 选项
- 通过/失败计数已有，只需在脚本末尾输出 JSON
- 输出路径：`.swarm/smoke-results.json`

### 3.2 单元测试结果采集

**问题**：`npm run test` 的输出只有尾部几行，丢失了详细的通过/失败信息。

**改进**：使用 Vitest 的 JSON reporter 输出结构化结果。

```bash
# 在 package.json 中新增脚本
"test:json": "vitest run --reporter=json --outputFile=.swarm/test-results.json"
```

**输出格式**（Vitest 原生）：
```json
{
  "numTotalTests": 660,
  "numPassedTests": 660,
  "numFailedTests": 0,
  "numTotalTestSuites": 47,
  "success": true
}
```

### 3.3 Bench Guard 接入 AI Loop

**问题**：`swarm bench guard` 存在但未被 AI Loop 使用。每次迭代后没有自动检测回归。

**改进**：在 `swarm-ai-loop` SKILL 的 Phase 6（验证与提交）中，增加 bench guard 检查步骤。

```markdown
## Phase 6 新增步骤

# 如果有 bench baseline，运行回归检查
if swarm bench baseline list --json 2>/dev/null | grep -q '"name"'; then
  swarm bench guard --format json > .swarm/guard-result.json
  # 如果 guard 失败，阻止提交
fi
```

---

## 4. Layer 2：约束发现评估维度

### 4.1 新增评分维度：constraint_quality

在现有 5 维评分基础上，新增第 6 维：**约束发现质量**。

```typescript
interface ConstraintQualityMetrics {
  /** Scout 发现的约束数量 */
  constraintsFound: number;
  /** 其中 blocking 级别的数量 */
  blockingFound: number;
  /** 约束是否在 Builder 开始前就被发现（而非实现中才遇到） */
  preImplementationDiscovery: boolean;
  /** 约束是否被正确分类（与 ground truth 对比） */
  categoryAccuracy: number;
  /** Stakeholder 报告是否生成 */
  stakeholderReportGenerated: boolean;
  /** Stakeholder 报告中是否包含业务影响描述 */
  businessImpactIncluded: boolean;
}
```

**评分公式**：

```
constraint_quality = (
  discovery_rate × 0.30 +        // 约束发现率（found / expected）
  timing_score × 0.25 +          // 是否在实现前发现
  category_accuracy × 0.20 +     // 分类准确度
  report_quality × 0.25          // 报告完整性和可读性
)
```

**权重调整**（新的 6 维默认权重）：

| 维度 | 原权重 | 新权重 | 说明 |
|------|--------|--------|------|
| correctness | 0.40 | 0.30 | 仍然最重要，但让出空间 |
| planning | 0.20 | 0.15 | |
| efficiency | 0.20 | 0.15 | |
| coordination | 0.10 | 0.10 | 不变 |
| cost | 0.10 | 0.10 | 不变 |
| constraint_quality | — | 0.20 | 新增 |

### 4.2 新增 Benchmark Suite：constraint-discovery

借鉴 cline-bench 的"真实场景"理念，设计专门评估约束发现能力的 task。

```
benchmarks/suites/constraint-discovery/
  suite.toml
  tasks/
    hidden-api-dependency/          # 隐藏的 API 依赖
    cross-module-type-break/        # 跨模块类型破坏
    database-migration-blocker/     # 数据库迁移阻塞
    auth-assumption-violation/      # 认证假设违反
    concurrent-state-corruption/    # 并发状态损坏
    tech-debt-accumulation/         # 技术债务累积
```

**每个 task 的结构**：

```
tasks/hidden-api-dependency/
  task.toml                    # 元数据 + 预期约束
  instruction.md               # 任务描述（看似简单的需求）
  workspace/                   # 初始代码（埋有隐藏约束）
  verify/
    assertions.toml            # 代码正确性断言
    expected-constraints.toml  # 预期应发现的约束（ground truth）
```

**`expected-constraints.toml` 示例**：

```toml
# Ground truth: Scout 应该发现这些约束

[[constraint]]
category = "api_contract"
severity = "blocking"
description_pattern = ".*user.*endpoint.*pagination.*"
affected_files = ["src/api/users.ts"]

[[constraint]]
category = "silent_dependency"
severity = "warning"
description_pattern = ".*cache.*invalidation.*"
affected_files = ["src/services/cache.ts"]
```

**验证逻辑**：对比 Scout 实际发现的约束与 `expected-constraints.toml`，计算 precision/recall。

### 4.3 Task 设计原则（来自 Bicameral 洞察）

每个 constraint-discovery task 应模拟 Bicameral 文章中描述的真实场景：

| 场景类型 | 对应 Bicameral 发现 | Task 设计思路 |
|----------|---------------------|--------------|
| "看似简单实则复杂" | "一个简单的 filter 触及 3 个微服务" | 需求描述简单，但代码中有跨模块依赖 |
| "隐性假设" | "50% 的约束在实现中才发现" | workspace 中有未文档化的隐性假设 |
| "技术债务预测" | "AI 不会拒绝写坏代码" | 需要 Adversarial Scout 识别方案的长期风险 |
| "跨职能沟通" | "70% 的约束需要传达给非技术人员" | 验证 Stakeholder Report 的可读性 |

### 4.4 Stakeholder Report 质量评估

**问题**：Stakeholder Report 的"质量"难以自动化评估。

**解决方案**：定义可自动检查的质量指标。

```toml
# verify/report-quality.toml

[stakeholder_report]
# 必须包含的章节
required_sections = ["Executive Summary", "What Needs to Happen First", "Effort"]
# 不得包含的内容（技术术语）
forbidden_patterns = [
  "\\bfunction\\b",
  "\\bclass\\b",
  "\\bimport\\b",
  "\\binterface\\b",
  "\\bconsole\\.log\\b",
  "```typescript",
  "```javascript"
]
# 字数限制（PM 不会读超过 400 字的报告）
max_words = 500
# 必须包含工期估算
requires_effort_estimate = true
# 必须包含风险等级
requires_risk_level = true
```

**评分**：

```
report_quality = (
  section_completeness × 0.30 +    // 必要章节是否齐全
  no_tech_jargon × 0.25 +          // 无技术术语泄漏
  brevity × 0.20 +                 // 字数在限制内
  actionability × 0.25             // 包含工期、风险、建议
)
```

---

## 5. Layer 3：AI Loop 迭代追踪

### 5.1 迭代指标结构化

**问题**：`report.md` 是人类可读文档，但每轮迭代的关键指标散落在文本中，无法自动对比。

**改进**：每轮迭代在 `report.md` 更新的同时，写入结构化指标文件。

```
.swarm/
  iterations/
    iteration-001.json
    iteration-002.json
    ...
    iteration-006.json    # 当前第六轮
    summary.json          # 跨迭代汇总
```

**`iteration-NNN.json` 格式**：

```json
{
  "iteration": 6,
  "timestamp": "2026-02-22T10:00:00Z",
  "version": "1.0.0",
  "metrics": {
    "build": { "success": true, "errors": 0 },
    "typecheck": { "success": true, "errors": 0 },
    "smoke_test": { "total": 40, "passed": 40, "failed": 0 },
    "unit_test": { "total": 660, "passed": 660, "failed": 0, "suites": 47 },
    "bugs": {
      "found": 1,
      "fixed": 1,
      "carried_over": 4,
      "by_priority": { "P0": 0, "P1": 0, "P2": 1, "P3": 3 }
    },
    "tech_debt": {
      "known_items": 5,
      "resolved_this_round": 1,
      "new_this_round": 0
    }
  },
  "delta_from_previous": {
    "smoke_test_delta": 0,
    "unit_test_delta": 0,
    "bugs_found_delta": -2,
    "bugs_fixed_delta": 1,
    "net_bug_change": -3
  }
}
```

### 5.2 迭代健康度公式

定义一个**迭代健康度分数**（Iteration Health Score, IHS），用于判断"这轮迭代是改进还是变坏"。

```
IHS = (
  test_stability × 0.30 +          // 测试通过率稳定性
  bug_trajectory × 0.25 +          // Bug 净减少趋势
  regression_freedom × 0.25 +      // 无回归
  debt_trajectory × 0.20           // 技术债务趋势
)
```

**各分项计算**：

| 分项 | 计算方式 | 满分条件 |
|------|----------|----------|
| test_stability | `min(smoke_pass_rate, unit_pass_rate) × 100` | 两项均 100% |
| bug_trajectory | `max(0, 100 - active_bugs × 10)` | 无活跃 Bug |
| regression_freedom | 本轮无回归 = 100，有回归 = `100 - regressions × 25` | 零回归 |
| debt_trajectory | `100 × (1 - new_debt / max(resolved_debt, 1))` | 解决 > 新增 |

**健康度判定**：

| IHS 范围 | 判定 | AI Loop 行为 |
|----------|------|-------------|
| 90–100 | 优秀 | 可以推进新功能 |
| 75–89 | 良好 | 继续当前节奏 |
| 60–74 | 警告 | 优先修复回归，暂停新功能 |
| < 60 | 危险 | 停止一切，专注修复 |

### 5.3 `swarm-ai-loop` SKILL 升级

在现有 Phase 0–6 基础上，增加**指标采集和健康度检查**。

**Phase 0 升级**（收集状态）：

```bash
# 原有
bash .cursor/skills/swarm-ai-loop/scripts/project-context.sh

# 新增：采集上轮迭代指标
if [ -f .swarm/iterations/summary.json ]; then
  echo "=== 迭代趋势 ==="
  cat .swarm/iterations/summary.json | jq '.trend'
fi
```

**Phase 3 升级**（执行测试）：

```bash
# 原有
bash .cursor/skills/swarm-ai-loop/scripts/smoke-test.sh --verbose
npm run test 2>&1 | tail -15

# 新增：采集结构化结果
bash .cursor/skills/swarm-ai-loop/scripts/smoke-test.sh --json
npm run test:json 2>/dev/null || true
```

**Phase 4 升级**（更新 report.md）：

```markdown
# 新增步骤：写入迭代指标文件

在更新 report.md 的同时，创建/更新 .swarm/iterations/iteration-NNN.json：
1. 从冒烟测试和单元测试的 JSON 输出中提取指标
2. 从 report.md 中提取 Bug 统计
3. 计算 delta_from_previous
4. 计算 IHS（迭代健康度分数）
5. 更新 summary.json
```

**Phase 6 升级**（验证与提交）：

```markdown
# 新增步骤：健康度门禁

计算本轮 IHS，写入 report.md 结论部分：

## 迭代健康度
| 指标 | 值 |
|------|-----|
| IHS | 92/100 |
| 测试稳定性 | 100 |
| Bug 趋势 | 90（活跃 1 个） |
| 回归自由度 | 100（零回归） |
| 债务趋势 | 80（新增 0，解决 1） |

判定：优秀 ✅ — 可以推进新功能
```

### 5.4 report.md 新增结构

在现有 `report.md` 模板中新增"迭代健康度"章节：

```markdown
## 迭代健康度趋势

| 轮次 | IHS | 测试稳定性 | Bug 趋势 | 回归 | 债务趋势 | 判定 |
|------|-----|-----------|----------|------|---------|------|
| R4   | 78  | 100       | 70       | 75   | 65      | 良好 |
| R5   | 85  | 100       | 80       | 100  | 60      | 良好 |
| R6   | 92  | 100       | 90       | 100  | 80      | 优秀 |

趋势：📈 持续改进（连续 3 轮上升）
```

---

## 6. 实施路线图

### Sprint 1（Week 1-2）：Layer 1 基础加固

| 任务 | 文件 | 工作量 |
|------|------|--------|
| 6.1.1 `smoke-test.sh` 增加 `--json` 输出 | `scripts/smoke-test.sh` | 2h |
| 6.1.2 `package.json` 增加 `test:json` 脚本 | `package.json` | 10min |
| 6.1.3 AI Loop SKILL Phase 6 接入 bench guard | `SKILL.md` | 1h |
| 6.1.4 创建初始 bench baseline | 运行 `swarm bench run` + `swarm bench baseline save` | 1h |

**验收标准**：
- `smoke-test.sh --json` 输出有效 JSON 到 `.swarm/smoke-results.json`
- `npm run test:json` 输出有效 JSON 到 `.swarm/test-results.json`
- AI Loop 迭代中自动检查 bench guard

### Sprint 2（Week 3-4）：Layer 3 迭代追踪

| 任务 | 文件 | 工作量 |
|------|------|--------|
| 6.2.1 定义 `iteration-NNN.json` schema | `src/bench/types.ts` 或新文件 | 1h |
| 6.2.2 创建迭代指标采集脚本 | `scripts/collect-iteration-metrics.sh` | 3h |
| 6.2.3 实现 IHS 计算逻辑 | 脚本内或 `src/bench/` 新模块 | 2h |
| 6.2.4 升级 SKILL.md Phase 0/3/4/6 | `SKILL.md` | 2h |
| 6.2.5 report.md 模板增加健康度章节 | `SKILL.md` 模板部分 | 1h |
| 6.2.6 回填历史迭代数据（R1-R6） | `.swarm/iterations/` | 1h |

**验收标准**：
- 每轮 AI Loop 迭代自动生成 `iteration-NNN.json`
- `report.md` 包含迭代健康度趋势表
- IHS < 60 时 AI Loop 自动切换为"修复优先"模式

### Sprint 3（Week 5-6）：Layer 2 约束发现评估

| 任务 | 文件 | 工作量 |
|------|------|--------|
| 6.3.1 设计 constraint-discovery suite | `benchmarks/suites/constraint-discovery/` | 4h |
| 6.3.2 创建 6 个 constraint-discovery tasks | 每个 task 约 1h | 6h |
| 6.3.3 实现 `expected-constraints.toml` 验证器 | `src/bench/verifier.ts` 扩展 | 3h |
| 6.3.4 实现 constraint_quality 评分维度 | `src/bench/scorer.ts` 扩展 | 2h |
| 6.3.5 实现 report-quality 检查器 | `src/bench/verifier.ts` 扩展 | 2h |
| 6.3.6 更新 `BenchScore` 类型和权重 | `src/bench/types.ts` | 1h |

**验收标准**：
- `swarm bench list --suite constraint-discovery` 列出 6 个 task
- `swarm bench run --suite constraint-discovery` 产出包含 constraint_quality 维度的评分
- Stakeholder Report 质量有自动化检查

---

## 7. 与现有系统的集成点

### 7.1 与 `swarm bench` 的关系

```
现有 bench 体系（不变）          新增评估能力
┌─────────────────────┐      ┌─────────────────────────┐
│ smoke suite (4)     │      │ constraint-discovery (6) │
│ core suite (6)      │      │ constraint_quality 维度   │
│ stress suite (3)    │      │ report_quality 检查       │
│ 5 维评分            │      │ 6 维评分                  │
│ RegressionGuard     │  ←→  │ IterationHealthScore     │
│ BenchStore          │      │ iteration-metrics.db     │
└─────────────────────┘      └─────────────────────────┘
```

- 新增的 `constraint-discovery` suite 完全兼容现有 `BenchLoader`/`BenchRunner` 流程
- `constraint_quality` 作为第 6 维加入 `BenchScorer`，向后兼容（旧 task 该维度默认 N/A）
- `IterationHealthScore` 是独立于 `BenchScore` 的指标，用于 AI Loop 而非 bench

### 7.2 与 `swarm-ai-loop` SKILL 的关系

```
当前 SKILL 流程                    升级后 SKILL 流程
Phase 0: 收集状态                  Phase 0: 收集状态 + 读取迭代趋势
Phase 1: 分析 report.md            Phase 1: 分析 report.md + IHS 趋势
Phase 2: 设计测试计划              Phase 2: 设计测试计划（IHS 驱动优先级）
Phase 3: 执行测试                  Phase 3: 执行测试 + 采集结构化指标
Phase 4: 更新 report.md            Phase 4: 更新 report.md + 写入 iteration.json
Phase 5: 代码改造                  Phase 5: 代码改造（不变）
Phase 6: 验证提交                  Phase 6: 验证提交 + IHS 门禁 + bench guard
```

### 7.3 与 `report.md` 的关系

`report.md` 保持人类可读的中枢地位，但新增两个变化：

1. **健康度趋势表**：每轮迭代自动追加一行，形成可视化趋势
2. **结构化数据影子**：每轮的详细指标同步写入 `.swarm/iterations/`，供程序读取

`report.md` 不会变得更复杂——健康度表只增加一行/轮，而详细数据在 JSON 中。

---

## 8. 成功指标

| 指标 | 当前状态 | 目标 |
|------|----------|------|
| 迭代间可量化对比 | 不可能（纯文本） | 每轮自动生成 IHS 分数 |
| 回归检测 | 人工阅读 report.md | IHS 下降自动告警 |
| 约束发现评估 | 无 | 6 个 task + constraint_quality 评分 |
| 报告质量评估 | 无 | 自动检查 Stakeholder Report |
| 历史趋势可视化 | 无 | report.md 健康度趋势表 |
| AI Loop 自动化程度 | 60%（大量人工判断） | 80%（IHS 驱动决策） |

---

## 9. 风险与缓解

| 风险 | 影响 | 缓解措施 |
|------|------|---------|
| IHS 公式权重不合理 | 误判迭代质量 | 先用默认权重跑 3 轮，根据实际调整 |
| constraint-discovery tasks 设计过于人造 | 评估结果不反映真实能力 | 从项目自身历史 Bug 中提取 task 场景 |
| 结构化指标采集增加 AI Loop 耗时 | 迭代变慢 | 采集脚本目标 < 30 秒 |
| 向后兼容性 | 旧 bench 数据无法对比 | constraint_quality 对旧 task 标记 N/A |
