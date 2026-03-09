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

---

## 九、第三轮联合会诊（基于 `swarm-run-log.bak` 的增量建议）

> 本节基于一条新的真实运行样本补充：任务为“评估当前项目的 AI 亲和度并输出报告”，执行日志位于 `swarm-run-log.bak`。
>
> 这一轮不重复讨论前两轮已经提出的 `heartbeat / status model / audit fast path / result envelope / queen authority / wax capsule` 等方向，而是只记录**这次日志直接暴露出来的新增问题与增量建议**。

### 9.1 本轮新增判断

本轮最重要的判断只有一句话：

**Swarm 当前的主要短板已经从“是否具备蜂群角色”转移为“是否把蜂群协议做成了可运行、可降级、可验收的硬机制”。**

换句话说：

- `Scout / Builder / Reviewer` 的角色划分已经基本清楚；
- `Queen / Pheromone / Wax / Provider` 仍有较强的“哲学命名先于协议落地”倾向；
- 当 OpenCode 作为 Provider 之一运行 headless audit 时，这种协议缺口会被直接放大。

---

### 9.2 本次样本暴露出的新增问题

#### P0-1. `Provider Analysis` 仍然是 audit 流水线的主瓶颈

本次运行里，`[6/9] Provider Analysis` 独占 120 秒，已经明显超过其他阶段总和中的大头。

更关键的是，它不是“稳定长推理”，而是：

- 前 24 秒仍处于 `reasoning`
- 32 秒后持续进入 `stalled`
- 一直到 120 秒超时才结束

这说明当前问题更像：

- provider/session 卡顿
- transport 层等待
- server lifecycle 抖动

而不仅仅是“模型思考比较久”。

#### P0-2. `timeout_salvaged` 还不是 Queen 可消费的硬门禁信号

本次运行已经比早期版本更好：provider 超时被标记为 `timeout_salvaged`，而不是直接伪装成普通成功。

但现状仍有一个关键缺口：

- `Recommendation Guard`
- `Fact-Check`
- `Merge & Report`

在 provider timeout 之后仍可瞬时通过。

这意味着当前系统可以“描述部分失败”，但还不能稳定地“阻断部分失败进入最终可信结论”。

#### P0-3. deterministic facts 仍缺少 `repo topology fingerprint`

本次样本把项目识别为 `single-package`，但真实仓库形态是：

- 根目录只提供 proxy scripts
- 真正应用运行根在 `app/`
- `app/package.json` 承载真实脚本
- `app/vitest.config.ts` 提供 coverage threshold
- `app/src/test/architecture.test.ts` 提供结构化架构门禁

这说明 scanner 仍然停留在“文件存在级别”，没有升到“仓库拓扑语义级别”。

#### P1-1. OpenCode 生命周期仍偏脆弱

这次运行链路表现为：

1. 启动 managed OpenCode server
2. 建立 HTTP connection
3. 声明 HTTP mode available
4. 结束时 shutdown
5. 随后又出现 `fetch failed` 并 fallback to CLI

这类现象说明 provider 层目前仍跨多个隐性状态：

- 冷启动
- 连接建立
- 热态运行
- 关闭
- 回退

但还没有被统一建模成稳定的 lifecycle contract。

#### P1-2. 仓库入口层与蜂群哲学仍存在轻微割裂

当前 Swarm 的蜂群思想主要沉淀在：

- `plan-*`
- `swarm-improve.md`
- `sideeffect-loop.md`

而默认仓库入口 `README.md` 仍主要描述被评估项目本身。

这不会立即造成运行错误，但会导致：

- 新进入的 Agent 默认先读到“应用模板”视角
- 蜂群协议作为二级知识存在，而非入口级知识

---

### 9.3 本轮新增的 6 条改进建议

#### N-1. `stall_circuit_breaker`

在连续多个 heartbeat 进入 `stalled` 状态时，Queen 不应继续被动等待硬超时，而应主动触发降级策略。

建议规则：

- 连续 2~3 个 `stalled` heartbeat -> 触发 `provider_slow`
- 连续 4~5 个 `stalled` heartbeat -> Queen 进入降级决策
- 可选动作：
  - 切 direct provider
  - 切 cheap model
  - 限缩 schema
  - 结束为 partial verdict

目标：

- 不再把 120 秒硬超时当作唯一故障检测器
- 让 Queen 真正拥有“运行时裁决权”

#### N-2. `repo_topology_fingerprint`

建议在 audit / review / report 流程最前面生成一个标准化仓库拓扑工件，而不是把这部分判断分散在 provider prompt 里。

最少字段建议：

- `repo_root`
- `runtime_roots[]`
- `proxy_scripts[]`
- `quality_gates[]`
- `coverage_thresholds`
- `arch_tests_present`
- `hooks_present`
- `package_mode = single | nested | monorepo`

这份工件应成为：

- Scout 的标准输出之一
- Provider 的固定输入之一
- compare / replay / resume 的可复用事实层

#### N-3. `provider_slo_scoreboard`

当前 provider compare 仍偏向“质量对比”，但这次样本表明，Provider 的运行时体感同样关键。

建议为每个 provider 长期记录：

- `startup_ms`
- `first_progress_ms`
- `stall_ratio`
- `timeout_ratio`
- `timeout_salvage_ratio`
- `teardown_cleanliness`
- `effective_cost_per_verified_claim`

最终用途：

- 决定默认 provider
- 决定何时降级
- 决定哪类任务适合 OpenCode，哪类任务不适合

#### N-4. `audit_evidence_pack`

对 headless audit 场景，OpenCode 不应再自由扫仓，而应只消费一个预先生成的 `Evidence Pack`。

建议包含：

- inventory facts
- config facts
- runtime checks
- topology fingerprint
- claim seeds
- artifact hashes

Provider 在 audit 模式中只负责：

- synthesis
- contradiction detection
- recommendation drafting

而不负责再次“自由探索代码库”。

#### N-5. `partial_result_gate`

建议把 `timeout_salvaged`、`partial`、`failed` 三类状态正式接入 Guard / Merge / Report 的准入链。

规则建议：

- `success` -> 可正常进入最终报告
- `partial` -> 允许进入，但必须显式降低置信度并标注缺失维度
- `timeout_salvaged` -> 默认不允许产出普通总结，除非 Queen 明确 ratify
- `failed` -> 阻断最终报告，只允许输出失败说明与重跑建议

这项能力的本质不是“改状态名”，而是让 Queen 的审批语义贯穿到底。

#### N-6. `provider_lifecycle_contract`

建议把 provider 运行路径正式建模成 lifecycle：

1. `cold_start`
2. `healthy`
3. `busy`
4. `stalled`
5. `degrading`
6. `shutdown`
7. `fallback`

同时要求：

- 每次状态转换都产生日志事件
- shutdown 后不应再冒出不带上下文的 transport 错误
- fallback 必须带上明确原因、触发条件和上一个状态

这样 OpenCode 才能真正从“黑盒后端”变成“被 Hive 理解的 provider 组件”。

---

### 9.4 本轮建议的落地顺序（增量）

#### 第 1 批：先解决运行时体感问题

1. `stall_circuit_breaker`
2. `repo_topology_fingerprint`
3. `provider_lifecycle_contract`

#### 第 2 批：再解决可信度门禁问题

4. `partial_result_gate`
5. `audit_evidence_pack`

#### 第 3 批：最后把 Provider 治理制度化

6. `provider_slo_scoreboard`

---

### 9.5 第三轮最值得优先落地的 5 个 backlog

1. `stall_circuit_breaker`
2. `repo_topology_fingerprint`
3. `partial_result_gate`
4. `audit_evidence_pack`
5. `provider_slo_scoreboard`

---

### 9.6 一句话总结（第三轮）

这次 `swarm-run-log.bak` 真正新增的信号是：**OpenCode 作为 Provider 之一时，问题已经不只是“慢”或“偶发超时”，而是 Swarm 还缺少围绕 stalled heartbeat、仓库拓扑事实、partial 结果门禁和 provider 生命周期的硬协议**；下一轮应把这些运行时机制补齐，让蜂群哲学真正落到 Queen 可裁决、Hive 可观察、Wax 可复放的系统行为上。

---

## 十、第四轮联合会诊（在“第三轮已修复”前提下，聚焦恢复协议）

> 前提说明：用户已确认“## 九、第三轮联合会诊”中的建议都已修复。
>
> 因此本节不再重复 `stall_circuit_breaker / repo_topology_fingerprint / provider_lifecycle_contract / partial_result_gate / audit_evidence_pack / provider_slo_scoreboard`，而是只讨论**修完这些以后，`[6/9] Provider Analysis (104.0s) [timeout_salvaged]` 仍然揭示出的更深层问题**。

### 10.1 本轮核心判断

本轮最重要的结论只有两句：

1. **`timeout_salvaged` 的问题，已经不再是“能不能发现 stalled”，而是“Swarm 能不能把 salvage 结果变成 Queen 可裁决、Hive 可恢复、Wax 可复放的正式协议对象”。**
2. **OpenCode 的 session 可以复用，但它只能充当 continuation substrate（上下文/连接/暖状态载体），不能直接充当 Swarm 的权威 checkpoint。**

换句话说：

- 第三轮解决的是“运行时治理”；
- 第四轮要解决的是“语义恢复治理”；
- 真正的断点继续，不能只靠 provider 会话历史，必须由 Swarm 自己掌握 phase 级恢复状态。

---

### 10.2 对 `timeout_salvaged` 的新理解

如果把第三轮建议视为已落地，那么这次样本最值得注意的，不再是：

- 有没有 heartbeat
- 有没有 circuit breaker
- 有没有 partial gate

而是下面这个事实：

**`timeout_salvaged` 表示这次 Provider Analysis 没有健康收敛，而是 Hive 依靠残余可用产物完成了“降级收尾”。**

这意味着它不是：

- 正常成功
- 普通失败
- 简单重试一次就能恢复

而是一种更复杂的中间态：

- provider 本轮没有完整交付最终 verdict
- 但 deterministic facts、已生成片段、schema 化残片、fallback 信息中，仍有一部分可以被抢救
- 最终报告可能依赖“幸存信号 + 既有工件 + 后续门禁”共同拼装

因此，第四轮要解决的不是“再多打一层日志”，而是：

- 到底救回了什么
- 哪些结论仍可信
- 哪些维度其实缺失
- 哪些内容允许继续流入下一阶段

---

### 10.3 关键问题直答：可以复用 OpenCode session 作为断点继续吗？

答案分两层：

#### 10.3.1 可以复用，但只能复用为“会话载体”

从 OpenCode 的公开能力看，它具备 session 级 continuation / resume / fork / attach 的能力。

这说明它**适合**做这些事情：

- 复用最近一次会话上下文
- 复用已建立好的 provider 连接和暖状态
- 在指定 session 上继续追问或补充 prompt
- 人工 attach 到已有 session 做诊断或接管
- 从已有 session fork 出一个新分支做对比试验

也就是说，OpenCode session 适合作为：

- `transport handle`
- `conversation memory`
- `warm context`
- `human takeover entry`

#### 10.3.2 但不应直接当成 Swarm 的断点 checkpoint

原因有 5 个：

1. **session history ≠ phase checkpoint**
   - 会话历史保存的是“说过什么”
   - Swarm 断点恢复需要的是“这个 phase 已经做到哪一步、哪些维度已完成、哪些 claim 已 ratify、哪些 artifacts 已校验”

2. **公开能力证明的是“继续对话”，不是“精确恢复一次已超时的 in-flight provider turn”**
   - 可以继续某个 session
   - 不等于可以从超时那一刻精准续跑同一轮内部执行点

3. **如果直接在原 session 上继续，容易重复执行或引入语义污染**
   - transport 超时不代表后端一定已经彻底停止
   - 再补一轮 prompt 可能把恢复、补跑、二次解释混在一起

4. **对 headless audit 来说，恢复正确性应依赖可哈希工件，而不是依赖聊天历史**
   - audit 场景更需要 evidence pack + claim ledger + artifact hashes
   - 而不是越积越长的上下文会话

5. **蜂群哲学要求主权在 Queen，不在 provider 私有 session**
   - Provider 可以保留记忆
   - 但“是否允许继续”“继续到什么程度”“哪些 salvage 结果可入报告”必须由 Queen 裁决

一句话归纳：

**OpenCode session 可以复用，但应该被定义为“恢复辅助层”；真正的 checkpoint 必须是 Swarm 自己的 phase-level state。**

---

### 10.4 第四轮新增建议（只记录真正新增 backlog）

#### P0-1. `salvage_provenance_matrix`

建议把 `timeout_salvaged` 进一步拆成可判定的 provenance matrix，至少回答：

- salvage 自哪一层而来：
  - deterministic facts
  - provider partial schema
  - stream buffer
  - retry residue
  - fallback provider/CLI
- salvage 覆盖了哪些维度
- salvage 漏掉了哪些维度
- salvage 的可信度和来源完整度如何

目标：

- 让 Queen 批准的是“有来源说明的 salvage”，而不是一个笼统状态词
- 让最终报告能显式写出“哪些结论来自完整推理，哪些只来自幸存工件”

#### P0-2. `semantic_phase_resume_cursor`

建议新增 phase 内部的语义游标，而不是只保存 phase 成败：

- `loaded_artifacts[]`
- `completed_dimensions[]`
- `verified_claim_ids[]`
- `contradiction_pass_done`
- `summary_draft_done`
- `schema_validation_done`
- `last_good_output_offset`

这样 resume 的含义就不再是“把 `[6/9]` 再跑一次”，而是：

- 从哪个语义节点恢复
- 哪些工作不必重做
- 哪些工作必须重新校验

这才是真正符合 Hive checkpoint 思想的“断点继续”。

#### P0-3. `degraded_verdict_quorum`

建议在 provider 以 `partial / timeout_salvaged` 收尾时，引入一个更高层的裁决机制：

- Provider 只提交 degraded verdict
- Reviewer 对 surviving claims 做二次审核
- Queen 只有在 quorum 通过后，才允许把结论 wax 化进入最终报告

规则建议：

- 无 quorum -> 只能输出“失败说明/重跑建议”
- 有 quorum 但缺维度 -> 只允许输出 partial report
- quorum 完整 -> 才允许升级为可引用的最终 verdict

本质上，这是把“部分可用”变成“部分可裁决”。

#### P1-1. `opencode_session_bridge_not_checkpoint`

建议正式定义一个桥接层，明确：

- `session_id`
- `attach_url`
- `fork_from_session_id`
- `last_committed_turn`
- `session_storage_scope`
- `session_health`

但同时在协议上明确写死：

- session bridge 只提供“接回已有上下文”的能力
- 不提供“绕过 Swarm checkpoint 直接恢复 phase 正确性”的能力

也就是说：

- Swarm checkpoint 决定 correctness
- OpenCode session 决定 convenience

#### P1-2. `recovery_mode_policy_matrix`

建议让 Queen 对恢复方式做明确分流，而不是默认“继续原 session”：

1. `continue_same_session`
   - 仅适合低风险、无工具副作用、evidence hash 未变化的场景

2. `fork_session_then_resume`
   - 适合保留 lineage、避免污染原会话的场景

3. `new_attempt_from_checkpoint`
   - 默认推荐给 headless audit / review / report

4. `switch_provider_from_same_checkpoint`
   - 适合确认 provider/session 已经不健康的场景

决策维度建议：

- 是否存在 tool side effects
- evidence pack 是否变更
- 当前 session 是否健康
- salvage 覆盖率是否足够
- 是否需要可复放与可比对

#### P1-3. `claim_missingness_map`

建议对每个评分维度和每条核心建议增加缺失分布图，而不是只给总分和总结。

最少状态建议：

- `provider_complete`
- `deterministic_only`
- `salvaged_partial`
- `stale_cache`
- `absent`

这样最终报告才不会给人一种“所有维度都完整分析过”的错觉。

#### P1-4. `safe_spec_projection`

如果 audit 结果要继续驱动：

- 后续 `swarm plan`
- 自动 backlog 生成
- Builder 的 spec 下发

那么必须增加一个投影规则：

- 只有 `ratified claims` 才能进入 Builder spec
- salvage hypothesis 只能进入“待验证假设”，不能静默升级为施工指令

否则一次 `timeout_salvaged` 的半真相，就可能继续污染 Builder 的执行面。

#### P2-1. `provider_attempt_lineage_dag`

建议把 provider 的多次尝试固化成 attempt lineage，而不只是平铺日志：

- attempt-1
- retry-from-breaker
- fresh-session-attempt
- fork-session-attempt
- cross-provider-attempt
- final-ratified-attempt

每个节点记录：

- 输入哈希
- session 关系
- salvage 继承关系
- 结束状态
- 被谁 ratify / supersede

这样 Wax 才能承载真正的“恢复谱系”，而不是只有结果快照。

#### P2-2. `semantic_replay_diff`

建议后续 replay 不只回放事件时间线，还要能回答：

- 哪些 claim 是第一次 attempt 就成立的
- 哪些 claim 是 salvage 后才进入结果
- 哪些 claim 在 resume/fork 后被推翻
- 最终 verdict 相比初始 verdict 到底变化了什么

这比纯日志 replay 更符合“蜂群复盘”的价值。

#### P2-3. `degraded_pheromone_ttl`

建议对 degraded run 产生的 pheromone 设置较短 TTL 或 decay 规则。

原因是：

- 完整 run 的结论可以进入长期共享记忆
- `timeout_salvaged` 的结论只能短期辅助下一轮判断
- 如果不衰减，半真相会污染 Hive 的长期知识面

---

### 10.5 建议的恢复状态机（推荐实现）

建议统一为以下状态机：

1. `prepared`
2. `checkpointed`
3. `provider_healthy`
4. `running`
5. `stalled`
6. `degrading`
7. `timeout_salvaged | failed | success`
8. `queen_gate`
9. `accept_partial | retry_from_checkpoint | fork_session_resume | switch_provider`
10. `ratified`
11. `waxed`

关键原则：

- `timeout_salvaged` 之后，不直接默认继续原 session
- 必须先进入 `queen_gate`
- 由 Queen 根据 recovery policy 决定：
  - 继续原 session
  - fork session
  - 从 checkpoint 新开 attempt
  - 切换 provider

---

### 10.6 本轮建议的落地顺序（第四轮）

#### 第 1 批：先把“恢复正确性”立住

1. `salvage_provenance_matrix`
2. `semantic_phase_resume_cursor`
3. `degraded_verdict_quorum`

#### 第 2 批：再把 OpenCode session 放到正确层级

4. `opencode_session_bridge_not_checkpoint`
5. `recovery_mode_policy_matrix`
6. `claim_missingness_map`

#### 第 3 批：最后补强复盘与长期记忆

7. `safe_spec_projection`
8. `provider_attempt_lineage_dag`
9. `semantic_replay_diff`
10. `degraded_pheromone_ttl`

---

### 10.7 第四轮最值得优先落地的 5 个 backlog

1. `salvage_provenance_matrix`
2. `semantic_phase_resume_cursor`
3. `degraded_verdict_quorum`
4. `opencode_session_bridge_not_checkpoint`
5. `recovery_mode_policy_matrix`

---

### 10.8 一句话总结（第四轮）

第三轮修完之后，Swarm 下一步最值得做的，不是继续围绕“发现 stalled”和“管理 provider 生命周期”打补丁，而是**把 `timeout_salvaged` 提升为正式的恢复协议：由 Swarm 自己掌握 checkpoint 与语义游标，把 OpenCode session 降位为可复用的会话载体/暖连接/人工接管入口，让 Queen 重新收回断点继续与最终裁决的主权**。