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

---

## 八、第二轮联合会诊（增量建议：蜂群协议层）

> 本节是在“上一轮 `heartbeat / status model / audit fast path / SSOT / claim ledger / freshness / resume / monorepo inventory` 已进入修复或已基本修复”的前提下，进一步给 Swarm Agent 的后续改造提供增量 backlog。
>
> 额外说明两点：
>
> 1. 当前 `swarm-run-log.bak` 更像最终评估报告快照，而不是原始 phase 事件流，因此本节重点评估“对外产物 + 编排哲学”，而不是重复判断某条 runtime 日志是否存在。
> 2. 在当前样本里，`Grade: C (69.9/100)` 与各维度加权分可以自洽复算，说明评分口径漂移问题在这个样本上已基本收敛；因此本节不再把 score 漂移作为主焦点，而转向更高阶的协议与架构问题。

### 8.1 核心判断

本轮新增判断只有一句话：

**Swarm 下一阶段最值得补的，不是再加更多执行阶段，而是把 `Queen 主权`、`Pheromone 决策协议`、`Wax 工件封装`、`Provider 输出契约` 做成真正的一等能力。**

换句话说：

- 上一轮主要解决的是 provider 黑盒、错误语义和 report 可核验性；
- 这一轮要解决的是蜂群内部“谁有权决策、信息如何流动、结果如何封装、Provider 怎样成为可替换部件”。

---

### 8.2 P0：先固化蜂群协议面

#### P0-1. 建立统一 `ResultEnvelope`，让 provider/tool 输出先变成协议对象

当前 audit 结果虽然已经能渲染成结构化 markdown，但本质上仍是“面向人阅读的最终报告”。

下一轮建议统一所有 provider / tool / report 阶段的输出契约，最少包含：

- `kind`
- `status`
- `payload`
- `provenance`
- `artifacts`
- `cost`
- `diagnostics`
- `next_actions`

设计原则：

- markdown 只负责展示，不再承担事实真相源职责；
- MCP / CLI / compare / renderer 全部消费同一份 envelope；
- 后续 provider 替换时，只替换实现，不替换上层编排逻辑。

这项改造的价值不是“再加一层 JSON”，而是把 provider 从“输出一份报告”升级为“交付一个可被 Queen 和其他阶段消费的标准结果对象”。

#### P0-2. 建立 `Queen Authority Matrix`，收回任务晋级与 mergeable 判定主权

当前角色哲学里，Coordinator / Queen 负责 plan -> dispatch -> evaluate -> merge，Scout / Builder / Reviewer 各自边界已经很清楚。

但随着 auto-enqueue merge queue、partial success merge 等能力增强，系统存在一个隐患：

- Builder 完成 ≠ 全局可合并
- Reviewer 通过 ≠ Queen 已批准
- 局部成功 ≠ 整体已经收敛

因此建议把任务与分支的生命周期显式建模为：

1. `draft`
2. `reviewed`
3. `ratified`
4. `mergeable`
5. `waxed`

规则建议：

- Builder 只能把产物推进到 `draft`
- Reviewer 只能把产物推进到 `reviewed`
- 只有 Queen 能把状态推进到 `ratified` / `mergeable`
- Human override 只在高风险 checkpoint 上覆盖 Queen

目标是防止自动 merge 逐步侵蚀蜂王的全局裁决权。

#### P0-3. 引入 `Wax Capsule`，把 artifacts 从“本机路径”升级为“不可变执行胶囊”

当前报告里 artifacts 仍以本机绝对路径形式出现：

- `/Users/.../.swarm/cache/inventory.json`
- `/Users/.../.swarm/cache/config_facts.json`

这种形态适合本地调试，但不适合：

- 跨机器复核
- provider compare
- MCP 调用
- 历史重放
- 事故追溯

建议每次 run 结束后生成 `Wax Capsule`，最少包含：

- `commit_sha`
- `branch`
- `schema_version`
- `generated_at`
- `artifact_hashes`
- `decision_snapshot`
- `constraint_snapshot`
- `final_verdict`
- `cost_latency_summary`

同时要求：

- artifact 使用相对 URI 或 content-addressed id，不再直接暴露本机绝对路径；
- capsule 不覆盖、只追加；
- 历史 capsule 可引用，但绝不直接伪装为当前真相。

---

### 8.3 P1：再补蜂群内部语义

#### P1-1. 把 `Pheromone` 从“发现结果”升级为“正式决策协议”

现在 Swarm 已经很重视 constraint discovery、constraint library、stakeholder report 和 adversarial planning，这说明“发现问题”这件事已经在变强。

但系统仍缺少一个 run-scoped、可被所有角色消费的正式决策载体。

建议建立 `Decision Pheromone Ledger`，每条记录至少有：

- `decision_id`
- `source_constraint_ids`
- `scope`
- `options`
- `chosen`
- `rationale`
- `owner`
- `expires_at`
- `supersedes`

核心规则：

- Builder 不得自行脑补未决策约束；
- Reviewer 需要基于 decision ledger 区分“实现偏差”与“前置决策未闭合”；
- Queen 负责 seal 决策，未 seal 的决策不得跨 checkpoint 流入下游。

#### P1-2. 给 Hive 信息流分层：`Stream / Pheromone / Checkpoint / Wax`

现在系统已经拥有 logs、trace、mail、metrics、dashboard SSE、heartbeat、constraint artifacts 等多种信道。

问题不是信息少，而是语义层次还不够清楚。

建议明确四层：

1. `Stream`：高频时序信号，只用于观测、调试、tail
2. `Pheromone`：归一化语义对象，如 finding / decision / verdict
3. `Checkpoint`：阶段性通过快照，作为准入门禁
4. `Wax`：不可变归档胶囊，作为复盘、对比、训练与审计材料

调度建议：

- Queen 默认只读 `Pheromone + Checkpoint`
- Dashboard / logs 主要消费 `Stream`
- compare / eval / replay / incident review 优先消费 `Wax`

这样才能避免随着能力变多，Queen 被原始时序噪声淹没。

#### P1-3. 定义 `Convergence Contract`，把“何时停”变成协议

V3 已经规划了重试、依赖失败策略、partial merge、手动 task 干预、模型降级和预算门禁。

但这些更偏“流程控制”，还不等于“真正定义系统已经收敛”。

建议统一为 4 个终态：

- `converged`
- `plateaued`
- `contradicted`
- `budget_exhausted`

判断维度建议包括：

- reviewer findings 是否单调减少
- 是否出现新的 blocker / contradiction
- 是否仍存在未 seal 的 decision
- 额外一轮重试或复审带来的边际收益是否仍高于成本

只有 `converged` 才允许推进到 `mergeable`；`plateaued` 应触发 Queen 重规划或人工裁决，而不是机械重试。

---

### 8.4 P2：最后把 OpenCode 放到最适合的位置

#### P2-1. 把 provider 定位从“品牌绑定”升级为“能力类目”

当前文档里已经逐步形成一个共识：

- OpenCode 对 coding / interactive 场景仍有价值；
- 对 headless audit / review / report，更适合 evidence-first、schema-first 的轻路径。

因此下一轮建议不再围绕“OpenCode 特判”继续堆策略，而是抽象出能力类目，例如：

- `interactive_shell`
- `structured_batch_audit`
- `second_opinion`
- `cheap_draft`

然后让 OpenCode、direct provider、其他兼容 provider 分别去实现这些能力位。

收益是：

- provider 可替换
- role 与 vendor 解耦
- routing 更清晰
- compare 结果更容易落到同一维度

#### P2-2. 建立 `Provider Qualification Harness`，把 compare 从功能升级为准入机制

上一轮已经提出“同一组 artifacts 上做 provider compare”。

这一轮建议再往前一步：把 compare 固化成正式准入赛道。

建议维护一组冻结 artifacts corpus，并长期跟踪：

- 矛盾率
- artifact 完整度
- 人工兜底率
- 单位有效产出成本
- 平均收敛轮数
- timeout / salvage 比例

最终用途不是“偶尔跑一下对比”，而是：

- 决定默认 provider
- 决定什么时候降级或切换 provider
- 为不同 role 选择最合适的能力实现

#### P2-3. 为长任务定义中途检查点交互协议

即使 heartbeat、timeout 语义、resume 都补齐了，长任务依然可能有一个体验缺口：

**用户只能等待最终结果，而不能在中途基于阶段性产物做判断。**

建议在 provider 长任务中引入显式事件：

- `checkpoint_ready`
- `partial_report`
- `needs_input`
- `continue`
- `skip`
- `stop`

这项能力尤其适合 OpenCode：

- 它擅长交互式修正与多轮补充；
- 不必被限制为“一次性吐出最终答案”的黑盒 provider。

---

### 8.5 建议的增量落地顺序（v2）

#### 第 1 批：先把协议面立住

1. `result_envelope`
2. `queen_authority_matrix`
3. `wax_capsule`

#### 第 2 批：再补蜂群内部语义

4. `decision_pheromone_ledger`
5. `stream_pheromone_checkpoint_wax_layering`
6. `convergence_contract`

#### 第 3 批：最后完成 Provider 定位收束

7. `provider_capability_taxonomy`
8. `provider_qualification_harness`
9. `checkpoint_interaction_protocol`

---

### 8.6 第二轮最值得优先落地的 6 个 backlog

1. `result_envelope`
2. `queen_authority_matrix`
3. `wax_capsule`
4. `decision_pheromone_ledger`
5. `convergence_contract`
6. `provider_qualification_harness`

---

### 8.7 一句话总结（第二轮）

Swarm 在补齐 provider 黑盒、评分一致性和可恢复性之后，下一阶段最该做的，是**把蜂群的决策主权、信息流分层、执行工件封装和 provider 能力定位固化为协议**，让 OpenCode 成为可调度的能力实现，而不是继续充当默认万能 provider。