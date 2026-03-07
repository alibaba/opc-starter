# AI 亲和度评估报告

- **Task**: swarm autopilot "评估当前项目的AI亲和度,并且给出改进建议,将改进建议保存在 swarm-run.md 中"
- **Repo**: /Users/pusongyang/Workspace/pusongyang/opc-starter
- **Commit**: `aea77995b80875064453fc490ace2df67c869849`
- **Grade**: D (53.9/100)

## 执行摘要

AI 亲和度评估完成。总分: 53.9/100, 等级: D

## 加权评分表

| # | 维度 | 权重 | 原始分 | 加权分 | 评估 |
|---|------|------|--------|--------|------|
| 1 | 最小可运行环境 | 11% | ██░░ 2/4 | 5.5/11 | 环境配置需改进 |
| 2 | 类型系统与静态分析 | 11% | █░░░ 1/4 | 2.8/11 | 类型系统需加强 |
| 3 | 测试体系 | 14% | █░░░ 1/4 | 3.5/14 | 测试体系需改进 |
| 4 | 文档完备性 | 10% | ████ 4/4 | 10/10 | 文档完备 |
| 5 | 代码规范与自动化 | 7% | ██░░ 2/4 | 3.5/7 | 代码规范需改进 |
| 6 | 模块化架构 | 9% | ██░░ 2/4 | 4.5/9 | 模块化需改进 |
| 7 | 上下文窗口友好性 | 9% | ████ 4/4 | 9/9 | 上下文友好 |
| 8 | 代码自述性 | 7% | ██░░ 2/4 | 3.5/7 | 代码自述性良好 |
| 9 | AI 工具与 SDD 支持 | 8% | ████ 4/4 | 8/8 | AI 工具支持良好 |
| 10 | 依赖隔离与可复现性 | 5% | █░░░ 1/4 | 1.3/5 | 依赖隔离需改进 |
| 11 | Outer Loop & 反馈闭环 | 9% | █░░░ 1/4 | 2.3/9 | Outer Loop 需建设 |

## 各维度详细分析

### 最小可运行环境 (2/4)

环境配置需改进

**证据**:
- Has build/dev scripts
- All runtime checks pass

### 类型系统与静态分析 (1/4)

类型系统需加强

**证据**:
- typecheck passes

### 测试体系 (1/4)

测试体系需改进

**证据**:
- Tests pass

### 文档完备性 (4/4)

文档完备

**证据**:
- AGENTS.md exists
- 6 doc file(s)
- 6 cursor rule(s)

### 代码规范与自动化 (2/4)

代码规范需改进

**证据**:
- Formatter configured
- Lint passes

### 模块化架构 (2/4)

模块化需改进

**证据**:
- Multiple docs suggest organized structure
- 15 scripts suggest modular pipeline

### 上下文窗口友好性 (4/4)

上下文友好

**证据**:
- AGENTS.md provides navigation context
- 6 cursor rule(s) provide scoped context
- Distributed docs reduce per-file context load

### 代码自述性 (2/4)

代码自述性良好

**证据**:
- AGENTS.md serves as project-level self-documentation
- 6 doc file(s) supplement code documentation

### AI 工具与 SDD 支持 (4/4)

AI 工具支持良好

**证据**:
- AGENTS.md present
- 6 cursor rule(s)
- 3 quality script(s)
- CI workflows with defined triggers

### 依赖隔离与可复现性 (1/4)

依赖隔离需改进

**证据**:
- CI workflows present

### Outer Loop & 反馈闭环 (1/4)

Outer Loop 需建设

**证据**:
- 3 quality script(s)

## Artifacts

- `/Users/pusongyang/Workspace/pusongyang/opc-starter/.swarm/cache/inventory.json`
- `/Users/pusongyang/Workspace/pusongyang/opc-starter/.swarm/cache/config_facts.json`
- `/Users/pusongyang/Workspace/pusongyang/opc-starter/.swarm/cache/policy_rules.json`
- `/Users/pusongyang/Workspace/pusongyang/opc-starter/.swarm/cache/runtime_checks.json`

---

## 专家联合会诊复核（基于当前仓库现状）

### 复核结论

本次 OpenCode Provider 驱动的审计 run，**主要问题不是仓库 AI 亲和度低，而是 Swarm 审计 Harness 不够硬**。`swarm-run.md` 中的 D 级结论应视为**被低估的历史结果**，不应再直接作为当前仓库状态基线。

当前仓库已经可以直接反证若干低分项：

- 已存在根目录代理脚本，支持 `dev:test / lint:check / format:check / type-check / test / coverage / build / ai:check`
- 已存在 `.prettierrc`、ESLint、Husky、lint-staged、GitHub Actions 工作流
- 已存在覆盖率阈值与 `ai:check` / `quality_check.sh`
- 已存在结构测试 `app/src/test/architecture.test.ts`
- 已存在 MSW mock 开发模式与 Cypress E2E
- 已存在 `docs/IHS.md`、AGENTS.md、`.cursor/rules/*` 等 AI 协作基础设施

因此，这次 run 暴露出的主问题应重新定性为：

1. `fact-check` 阶段存在但没有变成硬门禁
2. `Recommendation Guard` 没有拦住“建议新增已存在能力”的误报
3. `Merge & Report` 没有把“已验证 / 推断 / 冲突”状态保留下来
4. 审计类只读任务仍然走了偏重的多 Agent 路径

### 当前仓库仍值得继续提升的点

这些点不是“基础能力缺失”，而是更高成熟度的优化项：

1. CI 尚未统一直接复用 `npm run ai:check` 或 `./scripts/quality_check.sh`
2. `README.md` 对 `ai:check` 的说明与 `AGENTS.md` / `app/package.json` 有轻微漂移
3. ESLint 当前主要覆盖 `ts/tsx`，JS 侧配置文件和 Cypress 配置的规则约束仍偏弱
4. `format:check` 主要覆盖 `src/`，尚未形成完整仓库级格式化门禁
5. `docs/IHS.md` 已存在，但尚未形成稳定自动回归链路

## 进一步优化建议（面向 Swarm Agent 本身）

### P0：先补“可信事实”，再补“更聪明的 Agent”

#### P0-1. Scanner-first 事实底座

任何审计任务先固定生成以下工件，再让 Provider 读这些工件，而不是自由探索整个仓库：

- `inventory.json`
- `config_facts.json`
- `structure_checks.json`
- `policy_rules.json`
- `runtime_checks.json`

目标：让多个 scout、reviewer、不同 provider 全都共享同一份事实表。

#### P0-2. Claim 级 fact-check 协议

每条 finding 都必须带：

- `claim`
- `status: verified | inferred | contradicted | unknown`
- `evidence_refs`
- `conflicts`
- `confidence`

任何 `contradicted` finding 不允许进入最终报告。

#### P0-3. Recommendation Guard 三重拦截

所有建议在写入报告前强制执行：

1. `existence_check`
2. `duplicate_capability_check`
3. `policy_conflict_check`

这样可以直接消灭“建议新增已存在文件 / 能力 / 文档”的错误。

#### P0-4. 报告归一化

不要只产出 prose markdown。至少同时落盘：

- `report.md`
- `report.json`
- `findings.json`
- `score_breakdown.json`
- `decision_log.json`

这样后续才能做 provider 对比、回归检测、Dashboard 展示与异步恢复。

### P1：把审计任务做成真正的 Audit Mode

#### P1-1. 只读审计专用编排

对于 simple/read-only 审计任务，默认：

- `1 scanner`
- `1 synthesizer`
- `1 fact-check reviewer`

仅当以下条件出现时再扩展多 scout：

- inventory 与结论冲突
- 高风险 claim 数量超阈值
- 需要多 provider 交叉复核

#### P1-2. Provider-neutral schema gate

Provider 输出必须遵守统一 schema：

- 结论与建议分离
- 必须返回 evidence 列表
- 分数尽量由脚本计算，Provider 只做解释与排序
- schema 不通过则不进入 `Merge & Report`

#### P1-3. 共享缓存而不是重复扫仓

缓存 key 建议至少包含：

- `repo`
- `commit_sha`
- `detector_version`
- `policy_version`

相同提交上的重复审计应优先命中 cache，而不是重复花 token 重新理解仓库。

### P2：为未来云端异步执行补齐基础设施

#### P2-1. 标准运行清单与恢复状态

每次 run 最少补齐：

- `run_manifest.json`
- `resume_state.json`
- `cost.json`
- `artifact_index.json`

并统一使用 repo-relative 路径或对象存储 URI，避免本机绝对路径污染结果文件。

#### P2-2. 成本与吞吐指标化

建议长期追踪：

- `false_positive_recommendation_rate`
- `policy_conflict_rate`
- `evidence_coverage_rate`
- `time_to_first_verified_finding`
- `valid_findings_per_1k_tokens`
- `cost_per_verified_finding`

这样才能真正验证“便宜模型 + 更细拆解”是否在逼近 SOTA 质量。

#### P2-3. 多 Provider 在同一事实表上复核

未来如果要让 OpenCode、OpenAI、Anthropic、Qwen 等 provider 并存，正确做法不是让它们各自扫仓，而是：

1. 共用 deterministic scanner 产物
2. 在同一份 `draft_findings.json` 上复核
3. 只在高风险冲突上升级更强模型

这才符合“便宜模型做大部分工作，强模型只处理仲裁”的目标。

## 建议的近期落地顺序

### 第一阶段（立刻做）

1. `scanner-first inventory`
2. `claim-level fact-check`
3. `recommendation guard`

### 第二阶段（本周内）

4. `audit mode`
5. `report.json + findings.json + score_breakdown.json`
6. `provider schema gate`

### 第三阶段（异步化前）

7. `run_manifest + resume_state`
8. `cost/accounting metrics`
9. `multi-provider same-facts review`

## 一句话总结

Swarm 下一步最重要的不是“让 Agent 写出更像专家的报告”，而是“让 Agent 在共享事实、硬门禁和可恢复工件之上稳定地产出结论”，把多 Agent CLI 升级为真正面向云端异步执行的 Harness 系统。
