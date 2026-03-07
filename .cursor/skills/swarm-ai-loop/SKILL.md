---
name: inner-ai-loop
description: 项目内循环闭环工作流（V13）：3 Phase 架构（Scan+Assess → Fix → Verify+Tag），自动审查外循环引入的新复杂度，消除存量技术债，保持测试/源码/文档一致性，检测面向用户的文档与源码漂移，每轮打 Git Tag 锚点。适用于：用户要求"测试当前 swarm CLI"、"更新调试报告"、"修复 report.md 中的问题"、"归档文档"、"进行一轮完整的 AI Loop 迭代"、"根据 report 改进代码"、"检查迭代健康度"、"分析用户执行报告"、"提取 Epic 需求"、"内循环闭环"、"消除技术债"、"检查文档一致性"时。
---

# Swarm AI Loop — 内循环闭环工作流 v13

## 双循环开发模型

```
┌──────────────────────────────────────────────────────────────────────┐
│                        Swarm 开发双循环                              │
│                                                                      │
│  ┌─────────────────────┐     ┌──────────────────────────────────┐   │
│  │  外循环（开放）      │     │  内循环（闭环） ← 本工作流       │   │
│  │                     │     │                                  │   │
│  │  • 引入新思想/需求   │────▶│  Phase A: Scan + Assess          │   │
│  │  • 新业务复杂度      │     │  Phase B: Fix                    │   │
│  │  • 新 Epic/Bench     │     │  Phase C: Verify + Tag           │   │
│  │  • 外部评估报告      │     │                                  │   │
│  │                     │     │  产出: 稳定的 CLI + Git Tag 锚点 │   │
│  │  产出: 新代码/文档   │     │                                  │   │
│  └─────────────────────┘     └──────────────────────────────────┘   │
│                                                                      │
│  外循环推进功能，内循环维护稳定性。两者通过 Git Tag 锚点衔接。       │
└──────────────────────────────────────────────────────────────────────┘
```

**3 Phase 行动导向**：

```
┌───────────────────────────────────────────────────────────────────────┐
│  Phase A              Phase B              Phase C                    │
│  Scan + Assess        Fix                  Verify + Tag              │
│  (~15% context)       (~65% context)       (~20% context)            │
│                                                                       │
│  "变了什么？该修什么？"  "修！修一个测一个"   "通过？打Tag"            │
└───────────────────────────────────────────────────────────────────────┘
```

**关键原则**：
- **Git Tag 是锚点**：每轮结束打 `ai-loop-rYYYYMMDD` 标签，下轮自动以此为基准
- **外循环纳入**：Phase A 自动发现新增的 src/test/epic/bench 文件，纳入修复清单
- **存量债务检测**：health-check 检查过期文档、腐坏测试、孤立文件、SOURCE_MAP 新鲜度
- **修一个测一个**：Phase B 中每修一个问题立即 `npm run typecheck && npm run test`
- **report.md 是副产品**：修完代码后顺手更新，不单独花一个 Phase
- **源码是唯一真相**：所有文档和配置模板都从 schema.ts / registry.ts 派生

---

## 遗留项管理

遗留项如果不主动管理，会无限推迟直到腐烂。age 机制的目的是制造紧迫感——问题拖得越久，修复成本越高，因为上下文会逐渐流失。

| age | 状态 | 行为 | 原因 |
|-----|------|------|------|
| 1–2 | 新鲜 | 可推迟，须说明理由 | 刚发现，上下文还在，可以等更合适的时机 |
| 3–5 | 老化 | 本轮处理或验证 | 上下文开始流失，再拖下去修复成本会急剧上升 |
| 6+  | 腐烂 | 本轮修复或升级为 Epic | 已经拖了太久，要么现在解决，要么承认它足够大需要专门规划 |

| 优先级 | 含义 | 处理方式 |
|--------|------|---------|
| P0 | 核心流程崩溃 | 立即修复 |
| P1 | 功能错误 | 本轮修复 |
| P2 | 体验问题 | 本轮修复 |
| P3 | 文档/测试 | 记录，可推迟 |

---

## Phase A：Scan + Assess（扫描+评估，~15% context）

**目标**：一次性完成变动扫描和修复决策，避免两个 Phase 重复分析同样的 Git 数据。

### 步骤 1：运行 Delta Scan

```bash
bash .cursor/skills/swarm-ai-loop/scripts/git-delta-scan.sh
```

脚本输出包含：
- 上次 AI Loop Tag 信息 + 距今 commit 数
- 已提交变动分类：源码 / 测试 / 文档 / Epic / Bench / 配置
- 未提交变动：新增文件 + 修改文件 + 未跟踪文件
- 存量技术债信号：过期文档引用、Epic 状态不一致、TODO/FIXME 统计、跳过的测试、SOURCE_MAP 缺失

### 步骤 2：运行项目状态检查

```bash
bash .cursor/skills/swarm-ai-loop/scripts/quick-status.sh
```

脚本输出包含：
- Build/Typecheck 通过状态
- report.md 遗留项 → **ACTION LIST**（FIX / VERIFY / DEFER 分类）
- 外循环纳入项（新 src 无测试、新 Epic 未集成）
- IHS 分数 + 活跃 Epic 数
- 外部报告（swarm-run-report.md）紧急项

### 步骤 3：用户表面一致性检查

当 Delta 包含 `src/backends/`、`src/config/`、`src/cli/init.ts` 变动时，执行以下检查。这些是用户直接接触的"表面"——如果文档和实际行为不一致，用户会困惑。

| 检查项 | 源码真相 | 文档/配置位置 | 检查方法 |
|--------|---------|-------------|---------|
| Backend 类型 | `registry.ts` `createBackends()` | README.md "Backend System" | 表格中的 provider 是否与源码一致 |
| Executor 类型 | `registry.ts` `createExecutor()` | README.md + config.yaml | switch 分支是否全部体现 |
| Config Schema | `schema.ts` 所有 Schema | README.md "Configuration" 示例 | YAML 示例结构是否匹配 schema |
| Init 模板 | `init.ts` `generateDefaultConfig()` | `.swarm/config.yaml` | 模板是否包含 schema 中的关键配置节 |
| Env Vars | `defaults.ts` `ENV_VAR_MAPPINGS` | README.md + CONVENTIONS.md | 映射表是否一致 |
| Features 描述 | 实际支持的 backend/executor | README.md "Features" | 描述是否反映当前架构 |
| AGENTS.md 入口 | `src/backends/*.ts` 实际文件 | AGENTS.md | 引用的文件是否存在 |
| SOURCE_MAP | `src/` 目录实际文件 | `docs/SOURCE_MAP.md` | 列出的文件是否存在 |

发现漂移 → 纳入修复清单，标记为 `[DRIFT]`

### 步骤 4：综合决策（不超过 15 行）

综合 Delta Scan + ACTION LIST + 用户表面检查，确定本轮修复清单：

```markdown
本轮修复清单：
1. [P1] xxx — 原因（来源：report.md）
2. [DELTA] yyy — 原因（来源：外循环新增）
3. [DEBT] zzz — 原因（来源：技术债检测）
4. [DRIFT] aaa — 原因（来源：文档-源码漂移）
5. [age=5] bbb — 原因（来源：遗留项老化）
```

**决策规则**：
- Build/Typecheck 失败 → 先修这个，其他全部推迟
- P0/P1 → 纳入
- age >= 6 → 纳入（或升级 Epic）
- age >= 3 → 尽量纳入
- IHS < 60 → 只修 Bug，不做新功能
- 外循环新增 src 无测试 → 纳入（补测试或标记为 P3 跟踪）
- 文档-源码漂移 [DRIFT] → 纳入（面向用户的不一致会造成困惑）
- SOURCE_MAP 缺失 > 3 → 纳入文档同步
- 外部报告 P0/P1 → 直接纳入

### 步骤 5：Epic 检查（仅在需要时）

只在以下情况创建 Epic：
- 遗留项 age >= 6 且涉及 >3 文件
- 外部报告有跨模块大改进
- report.md 标注"Epic"但无对应文件

Epic 模板见 `references/templates.md`。创建后更新 `docs/epics/README.md`。

---

## Phase B：Fix（修复，~65% context）

**目标**：按修复清单逐个修复，修一个测一个。这是整个迭代的核心，context 预算的大头应该花在这里。

### 工作循环

对清单中的每个问题：

```
Read 源文件 → 修改代码 → typecheck+test → 通过？→ 下一个
                                          → 失败？→ 修复失败 → 重新验证
```

### 每次修复后的快速验证

```bash
npm run typecheck 2>&1 | tail -3
npm run test 2>&1 | tail -5
```

只看最后几行，确认通过即可。完整验证是 Phase C 的事。

### 修复规则

1. **Read before edit**：修复前先读源文件
2. **修后即验**：每个修复后立即 typecheck + test
3. **格式化**：`npx biome format --write <file>`
4. **lint 检查**：修改文件后 `npx biome check <file>`
5. **不做无关改动**：只修清单中的问题

### 文档同步（顺手做）

修复过程中如果涉及：
- CLI 命令变更 → 顺手更新 `README.md`
- 源文件结构变更 → 顺手更新 `docs/SOURCE_MAP.md`
- 模块依赖变更 → 顺手更新 `docs/ARCHITECTURE.md`
- Epic 完成 → 顺手归档到 `docs/archive/epics/` 并更新 `docs/epics/README.md`

### [DRIFT] 项文档同步链

当修复清单包含 `[DRIFT]` 项时，按以下链条同步——从源码真相出发，逐层传播到所有文档：

```
源码真相 (schema.ts / registry.ts / init.ts)
  ↓ 同步到
config.yaml 模板 (init.ts generateDefaultConfig)
  ↓ 同步到
README.md (Configuration / Backend System / Features / Env Vars / Prerequisites)
  ↓ 同步到
docs/CONVENTIONS.md (Config 结构 / Env Vars)
  ↓ 同步到
AGENTS.md + docs/SOURCE_MAP.md + docs/ARCHITECTURE.md
  ↓ 同步到
docs/mcp-integration.md (MCP 配置示例)
```

归档文档（`docs/archive/`）不修改。

### 批量处理同类 P3

如果有多个同类 P3（如"5 个文件的 lint 问题"），用 Task 子代理并行处理。

---

## Phase C：Verify + Report + Tag（验证+报告+打标签，~20% context）

**目标**：一键验证全部通过，更新报告，打 Git Tag 锚点。

### 步骤 1：一键健康检查

```bash
bash .cursor/skills/swarm-ai-loop/scripts/health-check.sh
```

脚本输出包含：
- Build/Typecheck/Unit/Smoke 全部结果
- Delta 对比（vs 上轮）
- **BETTER / WORSE / STABLE** 判定
- Core Flow 验证（8 个核心命令）
- 技术债审计结果
- IHS 自动采集
- Git Tag 建议

### 步骤 2：处理结果

| 判定 | 动作 |
|------|------|
| BETTER/STABLE | 继续步骤 3 |
| WORSE | 回到 Phase B 修复回归，再跑一次 health-check |

### 步骤 3：更新 report.md

report.md 三段式更新（格式参考见 `references/templates.md`）：

**1. 执行摘要**（更新顶部）：轮次号 +1，本轮做了什么（1-2 句话）

**2. 上轮结果**：把当前"当前规划"降级为"上轮结果"，附测试结果表

**3. 当前规划 + 遗留问题**：
- 本轮修复清单 + 状态（✅/❌）
- 遗留问题表：已修复的标 ✅，未处理的 age+1，新发现的 age=1
- 下轮建议关注点（结构化表格）

**4. IHS 趋势表**：追加本轮 IHS

### 步骤 4：同步外部报告（如有变更）

- 已修复条目：状态改为 `✅ RXX 已修复`
- 已纳入 Epic：状态改为 `→ Epic {ID}`

### 步骤 5：归档（按需）

| 条件 | 动作 |
|------|------|
| report.md > 200 行 | 归档到 `docs/report-archived.md` |
| report.md > 150 行 | 标记下轮归档 |
| 已完成 Epic | `bash .cursor/skills/swarm-ai-loop/scripts/archive-docs.sh` |

### 步骤 6：提交 + 打 Tag

```bash
git add -A && git commit -m "fix: [本轮修复摘要] (AI Loop RXX)"
git tag -a "ai-loop-rYYYYMMDD" -m "AI Loop RXX: [摘要]"
```

**Tag 命名规范**：
- 格式：`ai-loop-rYYYYMMDD`（如 `ai-loop-r20260301`）
- 同一天多轮：`ai-loop-r20260301-2`
- Message 包含轮次号和摘要

---

## 快速模式：SKIP 环境变量

Phase B 修复过程中需要快速验证时，可跳过耗时步骤：

```bash
# 只验证 build+typecheck（最快，~10s）
SKIP_SMOKE=1 SKIP_UNIT=1 SKIP_METRICS=1 SKIP_DEBT=1 bash .cursor/skills/swarm-ai-loop/scripts/health-check.sh

# 跳过冒烟测试和技术债检测（中等，~20s）
SKIP_SMOKE=1 SKIP_DEBT=1 bash .cursor/skills/swarm-ai-loop/scripts/health-check.sh

# 完整验证（最终提交前）
bash .cursor/skills/swarm-ai-loop/scripts/health-check.sh
```

---

## 单测策略

### 核心流程

```
init → doctor → plan → run → merge → status → logs → clean
```

### Coverage 目标（核心链路）

| 维度 | 目标 | 非核心模块 |
|------|------|-----------|
| 行覆盖率 | ≥ 60% | 不设阈值 |
| 分支覆盖率 | ≥ 50% | 不设阈值 |
| 函数覆盖率 | ≥ 70% | 不设阈值 |

| 规则 | 说明 |
|------|------|
| 核心流程测试失败 | **阻塞迭代**，必须修复 |
| 非核心模块测试失败 | 记录到 report.md，不阻塞 |
| 测试超时 | 单个 ≤5s，整体 ≤30s |

非核心模块（测试失败不阻塞）：`bench/` `constraints/` `trace/` `metrics/` `messaging/` `isolation/`

---

## IHS（迭代健康度分数）

```
IHS = test_stability × 0.30 + bug_trajectory × 0.25 +
      regression_freedom × 0.25 + debt_trajectory × 0.20
```

由 `collect-iteration-metrics.sh` 自动计算（health-check.sh 会自动调用）。

| IHS | 策略 |
|-----|------|
| 90–100 | 可推新功能 + 消化 age >= 3 债务 |
| 75–89 | 继续节奏 + 消化 age >= 5 债务 |
| 60–74 | 优先修复，暂停新功能 |
| < 60 | 停止一切，专注修复 |

---

## 记忆墙防护

这些规则的目的是防止单轮迭代超出 context window 容量。当信息量超载时，模型会丢失早期上下文，导致修复质量下降。

| 情况 | 处理 | 原因 |
|------|------|------|
| report.md > 200 行 | 先归档再读取 | 避免报告本身占满 context |
| 源文件 > 200 行 | 只读相关函数段 | 不需要的代码浪费 context |
| Bug 跨多文件 | 每次修一个，修后立即测试 | 并行修多个容易互相干扰 |
| 外部报告需求 > 3 个 | 拆为 Epic，本轮只创建文件 | 大量需求一轮做不完，强行塞入会降低质量 |
| 同类 P3 可批量 | 用 Task 子代理并行处理 | 机械性工作适合并行 |
| Epic 文件 > 100 行 | 拆分为更小的 Task | 保持每个 Task 可在单次对话中完成 |
| 活跃 Epic > 5 个 | 优先完成现有 Epic | 避免 WIP 过多导致上下文切换成本 |
| Delta 变动 > 50 文件 | 只关注 src/ + tests/ 变动 | 大规模变动时聚焦核心代码 |

---

## 脚本清单

| 脚本 | 用途 | Phase |
|------|------|-------|
| `scripts/git-delta-scan.sh` | Git Tag 差异扫描 + 技术债信号 | A |
| `scripts/quick-status.sh` | 项目状态 + Delta 摘要 + 行动清单 | A |
| `scripts/health-check.sh` | 一键验证 + IHS + 技术债审计 + Tag 建议 | C |
| `scripts/smoke-test.sh` | CLI 冒烟测试 | (被 health-check 调用) |
| `scripts/collect-iteration-metrics.sh` | IHS 计算 | (被 health-check 调用) |
| `scripts/archive-docs.sh` | Epic 归档 | C (按需) |
| `scripts/project-context.sh` | 项目上下文（首次接触用） | — |
| `scripts/analyze-report.sh` | report.md 详细分析（调试用） | — |

> 所有脚本路径前缀：`.cursor/skills/swarm-ai-loop/`

**日常迭代只需 3 个脚本**：`git-delta-scan.sh`（Phase A）、`quick-status.sh`（Phase A）和 `health-check.sh`（Phase C）。

---

## 完整迭代示例

```bash
# ── Phase A: Scan + Assess (~15% context) ──
bash .cursor/skills/swarm-ai-loop/scripts/git-delta-scan.sh
bash .cursor/skills/swarm-ai-loop/scripts/quick-status.sh
# LLM 综合决策，输出修复清单（~15 行）

# ── Phase B: Fix (~65% context) ──
# 逐个修复，每个修复后：
npm run typecheck 2>&1 | tail -3
npm run test 2>&1 | tail -5
# 重复直到清单完成

# ── Phase C: Verify + Report + Tag (~20% context) ──
bash .cursor/skills/swarm-ai-loop/scripts/health-check.sh
# LLM 更新 report.md
# LLM 归档（如需要）
git add -A && git commit -m "fix: [本轮修复摘要] (AI Loop RXX)"
git tag -a "ai-loop-r$(date +%Y%m%d)" -m "AI Loop RXX: [摘要]"
```

---

## 迭代结束自查

- [ ] Phase A 运行了 git-delta-scan.sh 和 quick-status.sh？
- [ ] 外循环新增的 src 文件已检查测试覆盖？
- [ ] 用户表面一致性检查已执行？（backend/config/env 变动时）
- [ ] age >= 6 遗留项全部处理/关闭/升级为 Epic？
- [ ] Phase B 每个修复后都跑了 typecheck+test？
- [ ] [DRIFT] 项已按同步链修复？
- [ ] health-check.sh 输出 STABLE 或 BETTER？
- [ ] 技术债审计无新增严重项？
- [ ] report.md 已更新（遗留项 age 正确、新发现已记录）？
- [ ] 如有 WORSE，已修复回归并重新验证？
- [ ] 已打 Git Tag `ai-loop-rYYYYMMDD`？

---

## 历史经验要点

这些教训来自 14 轮迭代的实践，每一条都对应过去犯过的错误：

1. **P3 无限推迟** → age 强制机制（没有 deadline 的低优先级永远不会被修）
2. **IHS 虚高掩盖债务** → aging_penalty（分数好看但问题在积累）
3. **批量处理同类 P3** → Task 子代理并行（机械性工作不值得逐个手动处理）
4. **外部报告全塞单轮** → Epic 提取（贪多嚼不烂，质量会崩）
5. **仪式消耗 context** → 压缩 Phase 数量，把 context 留给代码改造
6. **测试计划设计消耗 context** → 去掉独立的测试计划，修一个测一个
7. **报告更新独占 Phase** → 合并到 Phase C，修完顺手更新
8. **不知道上轮改了什么** → Git Delta Scan + Tag 锚点
9. **外循环新增代码不被检测** → 自动扫描未跟踪文件 + 测试覆盖缺口
10. **存量技术债隐性积累** → health-check 增加技术债审计
11. **面向用户的文档/配置与源码漂移** → 用户表面一致性检查 + 同步链

### 文档导航

| 文件 | 何时读取 |
|------|---------|
| `AGENTS.md` | 首次接触项目 |
| `docs/ARCHITECTURE.md` | 修改跨模块代码时 |
| `docs/SOURCE_MAP.md` | 定位文件时 |
| `docs/CONVENTIONS.md` | 编写新代码时 |
| `docs/epics/README.md` | 创建/查找 Epic 时 |
| `report.md` | 每次迭代 Phase A |
| `swarm-run-report.md` | Phase A 脚本自动检查 |
| `references/templates.md` | 创建 Epic 或更新 report.md 时 |
