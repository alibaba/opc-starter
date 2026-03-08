# Swarm Agent 下一轮改进建议

> 基于 `swarm-run-log.bak`、`swarm-run.md` 与当前仓库现状的联合复盘。前一轮关于 `inventory / policy / recommendation_guard / fact-check / artifacts` 的建议可视为已基本落地，本文只记录下一轮最值得做的优化。

## 一、联合会诊结论

本轮结论很明确：

1. **当前主要矛盾已经不是“缺少审计基线能力”，而是“在已有证据之上如何更快、更准地汇总结论”。**
2. **`OpenCode` 的 `serve + localhost:4096` 方式不是唯一瓶颈，真正的大头是 `Provider Analysis` 仍然过重。**
3. **对于 AI 亲和度审计这种 read-only、证据驱动、结构化输出任务，`OpenCode` 更适合当“结论压缩器”，不适合继续当“自由扫仓器”。**
4. **下一轮优化重点应从“补能力”切换为“压缩模式、硬化门禁、降低 provider 自由度、提升 cache 命中率”。**

一句话总结：**Swarm 已经从“没有 Harness”进化到“有 Harness 但执行形态还不够经济”，下一阶段要优化的是运行模式，而不是继续堆更多阶段名。**

---

## 二、上一轮已经完成的基线能力

以下能力已经不应再作为当前 backlog 重复提出：

### 1. 审计流水线已经成型

日志显示当前 Audit Mode 已经具备完整阶段：

- `Inventory Scan`
- `Config Facts`
- `Policy Rules`
- `Runtime Checks`
- `Script Score`
- `Provider Analysis`
- `Recommendation Guard`
- `Fact-Check`
- `Merge & Report`

这说明上一轮“先补 deterministic preflight / guard / report artifacts”的方向已经基本落地。

### 2. 当前仓库的基础质量链路是通的

当前仓库已经具备：

- `lint:check`
- `format:check`
- `type-check`
- `coverage`
- `build`
- `ai:check`
- `quality_check.sh`

因此，Swarm 后续不该再重复输出“新增 Prettier / 新增 CI / 新增 Husky / 新增 commitlint”这类已经过时的建议。

### 3. 当前仓库已存在真实的 Outer Loop 资产

当前仓库已经有：

- `app/src/test/architecture.test.ts` 结构测试
- `docs/IHS.md` 仓库健康度报告
- `app/.husky/pre-commit`
- `app/.husky/commit-msg`
- `app/commitlint.config.js`
- `.github/workflows/*.yml`

所以，新一轮建议必须聚焦“如何更好利用这些资产”，而不是继续误报它们缺失。

---

## 三、当前真实仍存在的问题

## P0-1. Provider 阶段过重，已经成为主瓶颈

从本次日志看：

- `Runtime Checks` 仅 `11.9s`
- `Provider Analysis` 单阶段 `421.9s`
- 总耗时 `7m28s`

这说明 **主要耗时不在扫描脚本，也不在 guard，而在 provider 仍然承担了过多自由分析工作**。

对审计类任务来说，这不是理想形态。

## P0-2. Guard 已经存在，但还不够“硬”

当前日志中 `Recommendation Guard` 与 `Fact-Check` 都是 `0.0s` 完成，但最终报告仍然出现了明显的不一致：

- `Grade: D (53.9/100)`
- 摘要却写“总体良好（估算 75-80/100）”
- Score Breakdown 里还有 `10/4`、`9/4` 这类展示异常

这说明现阶段的 guard 更像“阶段名存在”，还不是“claim 级硬门禁”。

## P0-3. 当前 deterministic scanner 仍有 monorepo / 子应用路径盲区

这次实际复跑 `repo_scan.py` 后能识别：

- 结构测试
- IHS
- coverage thresholds
- workflow
- `.prettierrc`

但它仍将 `git_hooks` 扫描为空，漏掉了实际存在的 `app/.husky/*`。

这说明下一轮不能只盯 LLM 输出，**还必须补齐 scanner 对 nested app / monorepo layout 的识别能力**。

## P0-4. 报告缺少 freshness gate

`swarm-run.md` 是一次历史审计快照，不是当前工作树的实时事实。若后续继续复用旧报告而不校验：

- `repo_root`
- `branch`
- `commit`
- `schema_version`

就很容易把“旧问题”误当成“当前问题”。

## P1-1. 资产存在与门禁硬度没有被清晰区分

当前仓库虽然已有 `ai:check`、结构测试、IHS、CI，但并不代表这些能力都已经以同等强度接入默认阻塞门禁。

下一轮评分与建议应当显式区分四个层次：

1. `present`
2. `locally_enforced`
3. `ci_enforced`
4. `blocking_with_trend`

否则很容易再次出现两类偏差：

- 有资产却被误报为缺失
- 有脚本却被夸大为“质量闭环已完善”

---

## 四、关于 OpenCode：有没有比“每次先 `opencode serve` 再走 `localhost:4096`”更好的方式？

答案是：**有，而且优先级非常高。**

### 方案 A：对 headless 审计任务，直接绕过 OpenCode server

这是最推荐的方式。

适用场景：

- AI 亲和度审计
- repo review
- read-only 报告生成
- 结构化 evidence 汇总

推荐做法：

- Swarm 直接走自己的 backend abstraction
- 对接 OpenAI-compatible / Qwen / Ollama / Anthropic 等直连 provider
- provider 只读取 `.swarm/cache/*.json`
- provider 只负责总结、排序、压缩建议

原因：

- 少一层本地 server hop
- 少一次额外进程启动
- 更容易做 request 级 timeout / retry / token budget / schema 校验
- 更适合 headless、批处理、可恢复任务

**结论：对于 audit mode，最佳实践不是“每次先起 OpenCode serve”，而是“尽量不走 OpenCode 这一层”。**

### 方案 B：如果短期必须保留 OpenCode，就把它变成长寿命 daemon

不要每次执行 swarm CLI 都重新启动一次 `opencode serve`。

更优方式：

1. 将 `opencode serve` 变为长寿命后台服务
2. Swarm 每次运行前只做 health check
3. 复用现有 warm session / connection / model state
4. 仅在服务失活时才重启

推荐形态：

- systemd user service
- tmux/screen 常驻会话
- 单独的 supervisor 脚本

**结论：如果还要走 OpenCode server，至少要从“per-run startup”切到“persistent daemon + health check”。**

### 方案 C：把 OpenCode 降级成“证据解释器”，而不是“自由探索器”

审计任务默认模式建议改成：

- `single scout`
- `single synthesis`
- `strict schema`
- `max_turns = 1~2`
- `shared cache only`

只有在以下情况下才升级为多 scout：

- inventory 与结论冲突
- 高风险 claim 数量超阈值
- 需要对比不同 provider 的判断

**结论：OpenCode 更适合做结论压缩，不适合承担默认扫仓。**

### 方案 D：做 mode routing，而不是 provider 一刀切

建议将任务路由分成三类：

| 任务类型 | 默认 provider 形态 | 推荐模式 |
| --- | --- | --- |
| coding / interactive | OpenCode | `serve` / sessionful / tool-rich |
| audit / review / report | direct provider | evidence-first / single-scout |
| benchmark / compare | multi-provider | same artifacts / compare only |

**结论：OpenCode 适合 Coding Agent，不代表它也适合作为所有 Swarm 子任务的默认 headless provider。**

---

## 五、下一轮最值得做的优化建议

## P0：先优化模式与硬约束

### P0-1. 增加 Audit Fast Path

默认规则：

- `1 scout`
- `0 builder`
- `0~1 reviewer`
- provider 只读取 cache artifacts
- 单次 synthesis 产出最终 draft

触发升级条件：

- 事实冲突
- 高风险 claim
- provider compare

预期收益：

- 降低总耗时
- 降低 token 消耗
- 减少重复扫仓

### P0-2. 将 Fact-Check 升级为 Claim Ledger

每条结论都必须带：

- `claim`
- `status = verified | inferred | contradicted | unknown`
- `evidence[]`
- `conflict[]`
- `confidence`

未进入 ledger 的结论，不允许进入最终报告。

### P0-3. 增加 Freshness Gate

每次 run 必须写入并校验：

- `repo_root`
- `branch`
- `commit_sha`
- `task_type`
- `schema_version`
- `generated_at`

若当前上下文与历史报告不一致，则自动标记为：

- `historical`
- `needs_rerun`

### P0-4. 修复 deterministic scanner 的子路径盲区

重点补强：

- `app/.husky/*`
- root `package.json` 与 `app/package.json` 双层脚本
- nested `vitest/eslint/tsconfig`
- workflow 与实际工作目录的映射

目标：

- 降低“仓库有但 inventory 没扫到”的误差

## P1：压缩 provider 自由度

### P1-1. 强制 schema 输出

provider 输出至少拆成：

- `summary`
- `scores`
- `verified_findings`
- `inferred_findings`
- `contradictions`
- `recommendations`
- `artifacts`

不满足 schema 就不进入 `report.md`。

### P1-2. 限制 provider 预算

建议默认增加：

- `max_turns`
- `max_input_files`
- `max_output_tokens`
- `per-claim evidence requirement`

否则 audit mode 仍会滑回自由探索模式。

### P1-3. 多 scout 共享同一份缓存

必须共享：

- `inventory.json`
- `config_facts.json`
- `policy_rules.json`
- `runtime_checks.json`
- `fact_check.json`

而不是让每个 scout 都重新扫仓。

## P1：当前仓库侧的附带优化

这些不是 Swarm 主问题，但会提升审计信号质量：

1. 将 `ai:check`、`coverage`、`IHS` 更显式地纳入默认 CI 阻塞链
2. 让 CI 优先执行 `lint:check`，避免使用带 `--fix` 的 `lint`
3. 逐步将 `architecture.test.ts` 中的 warning / tolerated threshold 收紧为 hard fail

---

## 六、建议的实验顺序

### 第 1 轮：先砍掉最不经济的路径

1. 上线 `Audit Fast Path`
2. 审计任务默认 `single scout + direct provider`
3. 若保留 OpenCode，则改成长寿命 daemon

### 第 2 轮：把报告从“像真的”变成“可核验”

4. 上线 `Claim Ledger`
5. 上线 `Freshness Gate`
6. 修复 score / summary / markdown 表达一致性

### 第 3 轮：提升可恢复与可对比能力

7. 统一 `report.json / report.md / evidence.json`
8. 引入 commit 级 cache key
9. 支持同一 artifacts 上的 provider compare

---

## 七、下一轮验收标准

### 准确性

- 不再建议新增已存在的文件或能力
- `inventory` 对 nested app 资产识别准确
- 报告不再出现 summary 与 score 自相矛盾

### 可验证性

- 每条核心结论都有 evidence
- 最终报告区分 `verified / inferred / unknown`
- reviewer 可以拦截 claim 级错误

### 成本与吞吐

- `Provider Analysis` 占比显著下降
- simple audit 默认耗时明显低于当前基线
- 首个 verified finding 产出时间缩短

### 异步自治能力

- 每次 run 可恢复、可复核、可重放
- 本地与云端共享同一份审计工件
- 同一 commit 的重复审计优先复用历史 artifacts

---

## 八、最值得优先落地的 5 个 backlog

1. `audit_fast_path`
2. `claim_ledger_fact_check`
3. `freshness_gate`
4. `monorepo_aware_inventory`
5. `direct_provider_for_headless_audit`

---

## 九、一句话总结

Swarm 下一轮最重要的，不是继续增加新的审计阶段，而是**把已有阶段压缩成更适合任务的运行模式**：对 Coding Agent 保留 OpenCode，对 headless audit 改走 direct provider，对所有结论加上 freshness 与 claim 级硬校验。