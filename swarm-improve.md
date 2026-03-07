# Swarm Agent 改进建议

> 基于 `swarm-run-log.bak` 与 `swarm-run.md` 的一次复盘，目标是提升 Swarm Agent 在 AI 亲和审计类任务中的稳定性、可验证性与异步自治能力。

## 一、核心结论

这次 Swarm 的总体方向正确：它识别出本项目是一个 AI 亲和度较高的仓库，也抓到了 `AGENTS.md`、Mock 模式、质量门禁等关键信号。

但这次结果的主要问题不在“方向错误”，而在“事实校验不足”：

1. 存在明显误判，如将 lint 识别为缺失、建议新增已经存在的 `.prettierrc` 与 CI。
2. 没有完整识别已有的 Outer Loop 资产，如结构测试、IHS 报告、质量脚本。
3. 建议生成未经过仓库规则冲突检查，输出了与 `AGENTS.md` “优先更新现有文档”相冲突的新增文档建议。
4. Read-only fast path 仍偏重 LLM 自由探索，而不是先做 deterministic inventory，再做汇总。

结论：Swarm 当前更像“会写结论的多 Agent”，还不够像“有 Harness 的可验证异步开发系统”。

---

## 二、本次暴露出的关键问题

### 1. 仓库事实识别不稳定

表现：

- 日志中出现 `Linter: (none detected)`。
- 最终建议中包含“新增 `.prettierrc`”“新增 GitHub Actions CI”。
- 但仓库实际已有：
  - `app/eslint.config.js`
  - `.prettierrc`
  - `.github/workflows/ci.yml`
  - `.github/workflows/pr-check.yml`
  - `.github/workflows/cypress-e2e.yml`

影响：

- 降低报告可信度。
- 让后续 Builder/Reviewer 在错误前提上继续工作。
- 增加人工二次筛查成本。

根因判断：

- 缺少 scanner-first 的 deterministic inventory。
- 最终报告生成前没有做 existence check。

### 2. 未充分吸收仓库已有 Harness 资产

表现：

- 未充分识别 `app/src/test/architecture.test.ts` 提供的结构测试能力。
- 未充分识别 `docs/IHS.md` 已经承担的趋势/健康度追踪作用。
- 没有利用仓库中的 `ai-friendly-audit` 技能规定的标准审计流程。

影响：

- 已有机制被当作“缺失项”或“弱项”。
- 报告更像一次松散分析，而不是一次可复现审计。

根因判断：

- Scout 阶段缺少对“既有评估基础设施”的专门探测。
- 汇总阶段没有把“已有机制”映射到固定维度模型。

### 3. 建议引擎没有读取仓库规则约束

表现：

- 建议新增 `docs/AI_ITERATION_MAP.md`、`.cursor/rules/error-handling.md` 等新文档。
- 但仓库顶层规则明确要求“优先更新现有文档，不创建新文档”。

影响：

- 输出与仓库治理原则冲突。
- 不利于云端/本地异步协作时维持稳定风格。

根因判断：

- Recommendation 阶段没有做 policy conflict check。
- `AGENTS.md` 被读取了，但没有转化为硬约束。

### 4. Adversarial review 不具备事实纠错能力

表现：

- 日志中显示 adversarial review “No issues detected”。
- 但最终结果仍包含多个可直接核验的事实错误。

影响：

- Review 阶段形同“文字复述”，未起到质量门禁作用。

根因判断：

- 当前 review 更偏语义一致性，而不是 claim-by-claim fact-check。

### 5. 审计类任务的执行路径成本偏高

表现：

- simple + read-only 的任务仍派出多个 scout，耗时较长。
- 大量 token 花在仓库探索与重复摘要，而不是高价值证据归纳。

影响：

- 不利于云端异步大规模运行。
- 不利于做 provider 对比与成本优化。

根因判断：

- 任务编排没有针对“审计/评估类任务”做专门快路径。

---

## 三、优先级改进建议

## P0：先补可验证性，再补智能性

### P0-1. 增加 scanner-first 的 Preflight Inventory

在任何 Scout 推理前，先由系统生成一份标准化 `inventory.json`，至少包含：

- `package.json` scripts
- `eslint/prettier/tsconfig/vitest` 配置
- `AGENTS.md`
- `.cursor/rules/*`
- `docs/*`
- `.github/workflows/*`
- `.husky/*`
- 结构测试、质量脚本、IHS 相关文件

预期收益：

- 降低“仓库明明有，报告却说没有”的误判率。
- 让多个 agent 共享同一份事实基线。
- 为后续 fact-check 提供统一证据源。

### P0-2. 对每条建议强制执行 3 个检查

最终建议进入报告前，必须经过：

1. `existence_check`
2. `duplicate_capability_check`
3. `policy_conflict_check`

示例：

- 若建议“新增 `.prettierrc`”，先检查文件是否存在。
- 若建议“新增 CI”，先检查 `.github/workflows/`。
- 若建议“新增文档”，先检查 `AGENTS.md` 是否禁止创建新文档。

### P0-3. 将 adversarial review 改为 fact-check review

不要让 reviewer 只判断“说得通不通”，而要逐条核验：

- 这条 claim 是否有文件证据？
- 这条建议是否与现有资产冲突？
- 这条结论是否和 inventory 相符？

建议输出格式：

- claim
- status: `verified | inferred | contradicted`
- evidence
- conflict
- confidence

### P0-4. 报告必须区分“已验证”与“推断”

建议所有最终报告条目都带状态：

- `Verified`：有明确文件或命令证据
- `Inferred`：基于模式推断，但未直接验证
- `Unknown`：信息不足，不应写成确定结论

这样能显著降低“写得像对的，但其实没验证”的问题。

---

## P1：把审计任务产品化为固定 Harness

### P1-1. 为审计类任务提供专用 Audit Mode

不要复用通用 scout prompt，改为固定流水线：

1. 读取 `AGENTS.md`
2. 跑 `repo_scan.py`
3. 跑 `check_file_size.py`
4. 读取关键配置文件
5. 执行 2-3 条高信号命令
6. 按固定维度生成报告

适合本类任务的高信号命令包括：

- `npm run lint:check`
- `npm run format:check`
- `npm run type-check`
- `npm run test -- src/test/architecture.test.ts`

### P1-2. 评分模型标准化

不要每次由模型自由决定评分维度。建议统一采用固定评分表：

- 最小可运行环境
- 类型系统与静态分析
- 测试体系
- 文档完备性
- 代码规范与自动化
- 模块化架构
- 上下文窗口友好性
- 代码自述性
- AI 工具与 SDD 支持
- 依赖隔离与可复现性
- Outer Loop & 反馈闭环

同时产出：

- `score_breakdown.json`
- `findings.json`
- `report.md`

这能支持回归检测、provider 对比、趋势追踪。

### P1-3. Recommendation Engine 默认“更新优先”

建议动作排序应为：

1. 更新现有文档
2. 扩展现有规则
3. 扩展现有测试/脚本
4. 仅在确有必要时创建新文件

这样更符合真实项目维护方式，也更适合长期异步协作。

---

## P1：针对 opencode Provider 的执行改进

### P1-4. 为 opencode 输出增加结构化约束

建议在 provider 输出层强制：

- JSON schema
- 最大轮次
- 最大 token budget
- 必须返回 evidence 列表
- 结论与建议分离

如果 provider 返回的结果不满足 schema，则不进入最终报告。

### P1-5. simple 审计任务默认只派 1 个 scout

仅在以下条件满足时才扩展 scout 数量：

- 首轮 inventory 与结论冲突
- 高风险 claim 数量超阈值
- 需要交叉验证 provider 行为差异

这样能降低 read-only fast path 的耗时与成本。

### P1-6. 多 scout 共享缓存，不重复扫仓

将以下内容写入共享缓存：

- inventory
- config 摘要
- docs 索引
- commands 结果

让不同 scout 在相同事实表上工作，而不是各自扫描整个仓库。

---

## P2：为“睡后编程”补异步自治基础设施

### P2-1. 每次 run 产出 4 类标准工件

建议每次任务至少保存：

1. `inventory.json`
2. `evidence.json`
3. `report.md`
4. `resume_state.json`

意义：

- 支持本地/云端切换
- 支持中断恢复
- 支持审计追溯
- 支持 benchmark 重放

### P2-2. 将“人类可读输出”和“机器可读输出”分离

建议：

- `report.md` 给人看
- `evidence.json` 给系统做 fact-check
- `score_breakdown.json` 给 dashboard 和 benchmark 用

这样后续接入 MCP、Dashboard、异步恢复时会更稳。

### P2-3. 为 Swarm 自身建立评估指标

建议新增以下指标，作为 Swarm 演进基线：

- `false_positive_recommendation_rate`
- `missed_existing_capability_rate`
- `policy_conflict_rate`
- `evidence_coverage_rate`
- `valid_findings_per_1k_tokens`
- `time_to_first_verified_finding`

这些指标比“总结写得像不像”更能反映真实能力。

---

## 四、建议补充：确定性代码检查/扫描脚本工具

为避免不同 Provider 在“仓库探索、能力识别、建议生成”阶段产生差异，建议将高信号检查前置为一组固定脚本工具，让 Provider 只消费结构化结果，而不是直接面对整个仓库自由发挥。

原则：

1. 脚本优先，LLM 只做汇总与裁决
2. 所有脚本默认输出稳定 JSON
3. 输出路径、数组顺序、键顺序、状态枚举全部固定
4. 同一仓库、同一提交、同一命令，产出必须可复现
5. Provider 之间共享同一份 `inventory/evidence/findings`，避免各扫各的

### 4.1 推荐脚本清单

#### 1. `scripts/swarm_audit/repo_inventory.py`

用途：

- 扫描仓库事实清单，替代“让 scout 猜仓库里有什么”。

建议输出：

- `inventory.json`

建议采集字段：

- 仓库基础信息：branch、commit、workspace_root
- package manager / lock files
- `package.json` scripts
- lint / format / type-check / test / coverage / build 配置
- `AGENTS.md`
- `.cursor/rules/*`
- `docs/*`
- `.github/workflows/*`
- `.husky/*`
- 结构测试文件
- IHS / benchmark / quality 脚本

建议命令：

- `python3 scripts/swarm_audit/repo_inventory.py --repo /workspace --out .swarm/cache/inventory.json`

确定性要求：

- 路径统一转为 repo-relative
- 所有数组按字典序排序
- 缺失字段输出空数组，不省略 key
- 不读取 Provider 私有会话日志

#### 2. `scripts/swarm_audit/config_facts.py`

用途：

- 解析关键配置的真实能力，避免只靠文件名猜测。

建议输出：

- `config_facts.json`

重点解析：

- `tsconfig*.json` 中的 `strict`、`paths`、`noEmit`
- `vitest.config.*` 中的 coverage thresholds、reporter、test environment
- `eslint.config.*` / `.eslintrc*`
- `.prettierrc*`
- GitHub Actions 中的 lint/test/build job
- husky hooks 是否真实存在

建议命令：

- `python3 scripts/swarm_audit/config_facts.py --repo /workspace --out .swarm/cache/config_facts.json`

确定性要求：

- 布尔型能力必须来自 AST/JSON 解析，不来自字符串猜测
- 每项事实都附 `source_file` 与 `source_key`

#### 3. `scripts/swarm_audit/structure_checks.py`

用途：

- 提取“机械化不变量”资产，而不是只判断仓库是否有测试框架。

建议输出：

- `structure_checks.json`

重点识别：

- `architecture.test.*`
- import boundary tests
- file-size checks
- forbidden dependency checks
- JSDoc / docs presence checks
- custom lint rules

建议命令：

- `python3 scripts/swarm_audit/structure_checks.py --repo /workspace --out .swarm/cache/structure_checks.json`

#### 4. `scripts/swarm_audit/runtime_checks.sh`

用途：

- 用固定命令拿运行时证据，减少 Provider 自行选命令带来的波动。

建议输出：

- `runtime_checks.json`
- `runtime_checks.log`

建议执行矩阵：

- `npm run lint:check`
- `npm run format:check`
- `npm run type-check`
- `npm run test -- src/test/architecture.test.ts`
- 可选：`npm run coverage`

建议命令：

- `bash scripts/swarm_audit/runtime_checks.sh /workspace .swarm/cache/runtime_checks.json`

确定性要求：

- 命令顺序固定
- 每条命令单独记录 exit code、duration_ms、stdout_path、stderr_path
- 对 warning / failure 使用固定状态枚举：`pass | warn | fail | skipped`

#### 5. `scripts/swarm_audit/policy_guard.py`

用途：

- 将 `AGENTS.md`、仓库约定、禁令项转为机器可执行约束。

建议输出：

- `policy_rules.json`

可提取规则示例：

- 优先更新现有文档，不新建文档
- SQL 统一落在 `app/supabase/setup.sql`
- 禁止直接操作 IndexedDB / Supabase
- 禁止 Tailwind v2/v3 语法

建议命令：

- `python3 scripts/swarm_audit/policy_guard.py --repo /workspace --out .swarm/cache/policy_rules.json`

#### 6. `scripts/swarm_audit/recommendation_guard.py`

用途：

- 对 LLM 产出的建议做二次过滤，拦截明显错误与冲突。

输入：

- `inventory.json`
- `config_facts.json`
- `policy_rules.json`
- `draft_findings.json`

输出：

- `guarded_findings.json`

核心检查：

- existence check
- duplicate capability check
- policy conflict check
- evidence coverage check

建议命令：

- `python3 scripts/swarm_audit/recommendation_guard.py --draft .swarm/cache/draft_findings.json --repo /workspace --out .swarm/cache/guarded_findings.json`

#### 7. `scripts/swarm_audit/normalize_report.py`

用途：

- 将上游多个脚本与 Provider 输出统一成固定结构，供 Dashboard、MCP、Resume 使用。

建议输出：

- `report.json`
- `report.md`

标准字段建议：

- `task`
- `repo`
- `commit`
- `summary`
- `scores`
- `verified_findings`
- `inferred_findings`
- `contradictions`
- `recommendations`
- `artifacts`

### 4.2 推荐的固定流水线

建议将审计类任务改为以下固定步骤：

1. `repo_inventory.py`
2. `config_facts.py`
3. `structure_checks.py`
4. `policy_guard.py`
5. `runtime_checks.sh`
6. Provider 读取上述 JSON，生成 `draft_findings.json`
7. `recommendation_guard.py`
8. `normalize_report.py`

这样 Provider 的角色变成：

- 解释证据
- 合并发现
- 生成排序后的建议

而不是：

- 自己探索仓库
- 自己判断事实
- 自己猜测建议

### 4.3 输出格式约束建议

所有脚本统一遵守：

- stdout：只输出 JSON 或简短 machine-readable 状态
- stderr：只输出调试信息
- exit code：
  - `0` 成功
  - `1` 脚本自身错误
  - `2` 输入参数错误
  - `3` 仓库不满足预期结构

JSON 约束建议：

- 顶层必须带 `schema_version`
- 顶层必须带 `generated_at`
- 顶层必须带 `repo_root`
- 顶层必须带 `commit_sha`
- 顶层必须带 `tool_name`
- 所有列表按字典序排序
- 所有路径统一使用 `/`
- 所有状态字段使用固定枚举

### 4.4 降低 Provider 差异的具体方法

要避免 Gemini / OpenAI / Anthropic / Qwen / opencode 等不同 Provider 对同一仓库得出不一致的“基础事实”，关键不是换模型，而是让它们只处理已经标准化的中间产物。

建议机制：

1. Provider 不直接读全仓库，优先读 `.swarm/cache/*.json`
2. Provider 不能跳过 `recommendation_guard.py`
3. Provider 输出只允许填写固定 schema 中的文本字段
4. 分数计算优先由脚本完成，Provider 只做解释
5. 允许多 Provider 复核同一份 `draft_findings.json`，而不是让它们各自扫描仓库

### 4.5 最小可落地版本（MVP）

如果你想先快速落地一版，建议先做这 4 个：

1. `repo_inventory.py`
2. `config_facts.py`
3. `runtime_checks.sh`
4. `recommendation_guard.py`

这 4 个已经足够显著降低：

- “仓库有但报告说没有”
- “建议新增已存在文件”
- “不同 Provider 给出不同基础判断”

---

## 五、建议的近期实现顺序

### 第一阶段（立即做）

1. 实现 `inventory.json` 预扫描
2. 为建议增加 existence / policy / duplicate 三重检查
3. 将 adversarial review 改成 fact-check review

### 第二阶段（本周做）

4. 增加审计专用 Audit Mode
5. 统一评分模型与结构化输出
6. 为 opencode 输出增加 schema 约束

### 第三阶段（后续演进）

7. 实现 run 工件标准化与 resume 状态持久化
8. 建立 Swarm 自身 benchmark 与回归指标体系
9. 支持 provider 间审计结果对比

---

## 六、建议的验收标准

以下标准可作为后续改造是否有效的判断依据：

### 准确性

- 对已有文件/能力的误报率显著下降
- 不再建议新增已存在文件
- 不再输出与 `AGENTS.md` 冲突的建议

### 可验证性

- 每条核心结论均附 evidence
- 最终报告支持区分 verified / inferred
- review 阶段能主动拦截事实错误

### 成本与吞吐

- simple read-only 审计任务耗时下降
- token 使用下降
- 首个有效结论的产出速度提升

### 异步自治能力

- 每次 run 可恢复、可复核、可重放
- 本地与云端能共享同一份任务工件

---

## 七、最值得优先落地的 5 个 Backlog

1. `scanner-first inventory`
2. `fact-check review`
3. `policy conflict gate`
4. `audit mode`
5. `structured evidence output`

---

## 八、一句话总结

Swarm 下一阶段最重要的，不是“让 Agent 更会写报告”，而是“让 Agent 先拿到可信事实，再基于事实稳定地产出结论”，把多 Agent 编排升级为真正的 Harness Engineering 系统。