# Swarm Agent 下一轮改进建议

> 基于本次 `OpenCode` 作为 provider 的真实运行结果复盘：输入任务为“评估当前项目的 AI 亲和度并写入 `swarm-run.md`”，证据来自 `swarm-run-log.bak`、`swarm-run.md` 与当前仓库现状。上一轮 `inventory / policy / guard / artifacts` 方向可视为已基本补齐，本轮只记录新的增量优化建议。

## 一、联合会诊结论

本轮的核心判断只有一句话：

**Swarm 现在的问题已经不是“没有审计流水线”，而是“Provider Analysis 太重、太黑盒、太难复核”。**

展开后有 4 个结论：

1. **`[6/9] Provider Analysis` 已经成为整条链路的主瓶颈。**
2. **比“慢”更严重的是“慢的过程中没有心跳、没有阶段内进度、没有中间产物”。**
3. **当前 guard/fact-check 仍偏软，无法拦住 score、summary、evidence 三者不一致的问题。**
4. **对 audit/review/report 这类 headless 任务，OpenCode 更适合当“证据解释器”，而不应继续当“默认自由探索器”。**

换句话说：**下一轮要优化的是运行模式、可观测性和门禁硬度，而不是继续堆更多阶段名。**

---

## 二、本次运行暴露出的新增问题

## P0-1. `Provider Analysis` 长时间等待且完全无心跳

本次日志里最明显的问题不是超时本身，而是：

- `[6/9] 📋 Provider Analysis...` 之后长时间无任何阶段内输出
- 中间没有 `heartbeat`
- 没有 `elapsed` / `attempt` / `turn` / `token budget` / `files loaded`
- 没有“正在重试 / 正在降级 / 正在等待 OpenCode”这类过程日志

最终只在 606 秒后看到一条：

- `OpenCode CLI timed out`

这意味着当前用户体验是标准的 **黑盒等待**。对 CLI 工具来说，这是最高优先级问题。

## P0-2. 超时被记录了，但语义仍然不够正确

当前行为是：

1. provider 实际超时
2. 日志打印 `timed out`
3. 阶段仍显示 `✅ Provider Analysis`
4. 后续 `Recommendation Guard`、`Fact-Check`、`Merge & Report` 继续执行

这会把“部分失败 + 不完整结果”伪装成“成功完成”，后果是：

- 用户不知道这份报告是否可信
- reviewer 无法区分 `success`、`partial`、`timeout-but-salvaged`
- 下游阶段可能在不完整草稿上继续合并

## P0-3. 报告内部仍存在多套评分口径

本次产物同时出现了以下现象：

- 日志写 `Grade: D (57.9/100)`
- 摘要却写“综合评分 68/100”
- score breakdown 里出现 `5.5/4`、`10/4`、`9/4`
- `swarm-run.md` 里的 markdown 表又换成了另一套分母

这说明当前 report 不是从同一个 typed score object 统一渲染出来的，而是：

- scanner 一套
- provider summary 一套
- renderer/markdown 一套

只要这 3 层不统一，Guard 就算存在，也拦不住“看起来很完整但其实互相矛盾”的报告。

## P0-4. deterministic scanner 仍不够 monorepo-aware

当前仓库已经具备不少真实资产，例如：

- 根目录 `package.json` 代理脚本
- `app/package.json` 真实执行脚本
- `app/.husky/*`
- `app/src/test/architecture.test.ts`
- `app/vitest.config.ts` 覆盖率阈值

但 scanner 仍容易漏掉 nested app 语义，尤其是：

- 根代理脚本与子应用真实入口的映射
- `app/.husky/*` 这类子路径 hooks
- root script 与 nested runtime root 的关系
- “资产存在”与“默认阻塞门禁”之间的差别

因此本轮的重点不只是“让 provider 更聪明”，而是先让 deterministic facts 更准确。

## P1-1. 当前产物缺少 freshness / lineage 信息

`swarm-run.md` 是一次历史执行快照。若后续继续复用历史报告或 cache，却不校验以下元数据：

- `repo_root`
- `branch`
- `commit_sha`
- `task_type`
- `schema_version`
- `generated_at`

就会把“旧事实”继续当成“当前事实”使用。

## P1-2. 当前缺少 phase-level resume

现在的 cache 已经存在，但还是偏“结果缓存”，不是“可恢复执行状态”。

缺的不是 `json` 文件数量，而是这些执行态工件：

- `provider_input.json`
- `provider_attempt.json`
- `provider_raw_output.ndjson`
- `provider_error.json`
- `artifact_hashes.json`

如果没有这些内容，`[6/9]` 一旦超时，就很难只重跑 provider 阶段。

---

## 三、下一轮最值得做的改进建议

## P0：先解决黑盒等待与错误语义

### P0-1. 为 `Provider Analysis` 增加硬性心跳与过程日志

建议每 5-10 秒输出一次 provider 心跳，字段至少包含：

- `phase`
- `elapsed_ms`
- `last_activity_at`
- `attempt`
- `turn`
- `provider_state`
- `input_artifact_count`
- `estimated_prompt_tokens`
- `timeout_at`

建议同时区分 4 类事件：

- `provider_started`
- `provider_progress`
- `provider_slow`
- `provider_timeout`

目标不是“日志更多”，而是让用户能判断现在究竟是：

- 正常推理
- IO 等待
- 重试中
- 卡住
- 即将超时

### P0-2. 把 provider 结果状态从二元成功/失败改成四态

建议统一成：

- `success`
- `partial`
- `timeout_salvaged`
- `failed`

并明确规则：

- provider 超时但保留了合法 schema 输出 -> `timeout_salvaged`
- provider 超时且没有合法输出 -> `failed`
- 不允许再把 timeout 直接显示成 `✅`

这样 reviewer、CLI 和后续 merge/fact-check 才能正确理解产物可信度。

### P0-3. 对 audit mode 引入 `Audit Fast Path`

默认策略建议改成：

- `1 scout`
- `0 builder`
- `0~1 reviewer`
- provider 只读取 `.swarm/cache/*.json`
- `max_turns = 1~2`
- `strict schema`

升级为重模式的条件只保留 3 类：

- deterministic facts 与 provider 判断冲突
- 高风险 claim 超过阈值
- 用户显式要求 provider compare

结论很明确：**对 audit 任务，provider 应该做 synthesis，不应再做自由扫仓。**

### P0-4. 若短期必须保留 OpenCode，改为长寿命 daemon

短期若还不能把 audit 切到 direct provider，至少要避免“每次 run 都重新起一层 provider server”。

推荐形态：

- `persistent daemon + health check`
- 运行前先做健康探测
- 仅在服务失活时重启
- 复用 warm session / model state / connection

这一步不能彻底解决问题，但能先压缩 provider 阶段的冷启动与不确定等待。

## P1：把报告从“像真的”变成“可核验”

### P1-1. 建立单一评分真相源（Single Score SSOT）

建议所有阶段统一消费同一个 score 数据结构，最少包含：

- `dimension`
- `raw_score`
- `weight`
- `weighted_score`
- `grade_band`
- `evidence_refs`

日志摘要、markdown、json report、score breakdown 都必须从这一个对象渲染。

只要这一步不做，`57.9 / 68 / 10/4` 这种口径漂移就还会反复出现。

### P1-2. 将 Fact-Check 升级为 `Claim Ledger`

每条核心结论必须带：

- `claim`
- `status = verified | inferred | contradicted | unknown`
- `evidence[]`
- `conflicts[]`
- `confidence`

规则建议改为：

- 未进入 ledger 的结论，不允许进入最终报告
- 被标记 `contradicted` 的结论，直接阻断 merge
- `summary` 只能消费 `verified + inferred`，且必须显式区分

### P1-3. Recommendation Guard 要从“存在阶段”升级为“硬门禁”

Guard 至少应拦截以下错误：

1. summary 与 total score 不一致
2. weighted score 超过 weight
3. 维度分数超出 `0~4`
4. 建议里重复提出仓库已存在的能力
5. `artifacts` 缺失或与当前 run 不匹配

如果这 5 类错误过不了，报告就不该落到最终 `swarm-run.md`。

### P1-4. 增加 freshness gate

每次 run 必须写入并校验：

- `repo_root`
- `branch`
- `commit_sha`
- `task_type`
- `schema_version`
- `generated_at`

若不匹配，则自动标记：

- `historical`
- `needs_rerun`

不要再让历史报告静默伪装成当前事实。

## P1：先把 deterministic layer 补准

### P1-5. 让 inventory 变成 monorepo-aware + semantic-aware

建议 scanner 升级为可识别：

- root proxy scripts
- nested app runtime root
- nested `tsconfig / vitest / eslint`
- `app/.husky/*`
- coverage thresholds
- architecture tests
- `present / locally_enforced / ci_enforced / blocking_with_trend`

注意，这里不只是“找到文件”，而是要识别语义层级。

### P1-6. 区分“资产存在”与“门禁生效”

建议所有质量项都拆成 4 档：

1. `present`
2. `locally_enforced`
3. `ci_enforced`
4. `blocking_with_trend`

这样才能避免两种常见误判：

- 实际有资产，却被误报为缺失
- 实际只是有脚本，却被误判为已经形成闭环

## P2：提升恢复能力与对比能力

### P2-1. 增加 phase-level resume

推荐在 provider 阶段固定落盘：

- `provider_input.json`
- `provider_attempt.json`
- `provider_raw_output.ndjson`
- `provider_error.json`
- `artifact_hashes.json`

目标：

- `[6/9]` 失败后只重跑 `[6/9]`
- 相同 commit 的重复审计优先复用 artifacts
- 支持失败后复核与重放

### P2-2. 增加 provider compare 模式

建议支持在同一组 artifacts 上对比：

- `OpenCode`
- direct provider
- 不同模型档位

这样可以把 OpenCode 放回更适合它的位置：

- coding / interactive 使用它
- audit / review 只在需要 compare 时才调用它

---

## 四、建议的落地顺序

### 第 1 批：先解决用户可感知的痛点

1. `provider_heartbeat_and_progress`
2. `provider_result_status_model`
3. `audit_fast_path`

### 第 2 批：再解决“报告像真的但不一定真”

4. `single_score_ssot`
5. `claim_ledger_fact_check`
6. `freshness_gate`

### 第 3 批：最后补长期收益能力

7. `monorepo_semantic_inventory`
8. `phase_level_resume`
9. `provider_compare_on_same_artifacts`

---

## 五、下一轮验收标准

### 可观测性

- `Provider Analysis` 在等待期间持续输出心跳
- 用户可看到当前 attempt、elapsed、provider_state
- 首次进度信号不晚于阶段开始后 10 秒

### 正确性

- 不再出现 `Grade`、`summary`、`score breakdown` 互相矛盾
- 所有核心结论都能追溯到 `claim ledger`
- timeout 结果不再被渲染为普通成功

### 识别精度

- 能正确识别 nested app 的 hooks、scripts、coverage、architecture tests
- 能区分“存在”和“阻塞门禁”
- 不再建议新增仓库已存在的能力

### 吞吐与恢复

- simple audit 的 provider 阶段明显短于当前基线
- `[6/9]` 失败后支持只重跑 provider
- 同一 commit 的重复执行优先复用 artifacts

---

## 六、最值得优先落地的 6 个 backlog

1. `provider_heartbeat_and_progress`
2. `provider_result_status_model`
3. `audit_fast_path`
4. `single_score_ssot`
5. `claim_ledger_fact_check`
6. `monorepo_semantic_inventory`

---

## 七、一句话总结

Swarm 下一轮最该做的，不是再发明更多阶段，而是**把 `[6/9] Provider Analysis` 从“长时间黑盒等待”改造成“有心跳、可恢复、可核验的 provider synthesis 阶段”**；对 Coding Agent 继续保留 OpenCode，对 headless audit 优先走更轻的 evidence-first 路径。