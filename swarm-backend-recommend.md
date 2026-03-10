# Swarm CLI Backend / AI Coding CLI 选型建议

> 适用前提：Swarm CLI 是团队内部自研的多代理编排器，负责模拟团队成员去驱动外部 AI Coding Tools；它本身不是对外产品，也不应被某一个 vendor/tool 的交互范式反向绑架。

## 一、先说结论

如果目标是选择**符合 Swarm CLI 设计理念**的 backend，我的建议不是“选一个万能工具当总后端”，而是：

1. **把 backend 设计成能力位，而不是品牌位。**
2. **默认后端优先选无头、可脚本化、结构化输出强的 CLI。**
3. **把偏 Coworker / 交互式 / server-client 的工具降级为特定能力适配器，而不是默认总后端。**

基于这个思路，推荐梯队如下：

### 第一梯队：最适合做 Swarm 默认 backend 的 AI Coding CLI

1. **Codex CLI**
2. **Claude Code**
3. **Gemini CLI**
4. **Qwen Code**

### 第二梯队：适合做“特定能力适配器”，不建议做默认总后端

5. **OpenCode**
6. **Aider**

---

## 二、Swarm 需要的不是“会写代码”，而是“适合被编排”

Swarm CLI 的设计理念，本质上不是单体 Copilot，而是一个：

- 多角色并行调度器
- 可批处理、可脚本化的 agent runtime
- 可回放、可观测、可恢复的执行系统
- 能把 Scout / Builder / Reviewer / Coordinator 分别路由到不同能力源的蜂群控制层

因此，选 backend 时真正要看的不是“这个工具平时写代码厉不厉害”，而是它是否适合被 Swarm 当作**被调度组件**。

### 核心选型标准

#### 1. 无头运行能力

至少要支持：

- 非交互式单命令执行
- 适合 shell / CI / daemon 调用
- 进程退出码明确
- stdout / stderr 语义稳定

如果一个工具主要依赖 TUI、人工接管、长会话互动，它就不适合当 Swarm 的默认 backend。

#### 2. 结构化输出能力

最好支持：

- JSON / JSONL / stream-json
- schema 约束输出
- 分阶段事件流
- 结果与日志分离

Swarm 需要的不只是“一段最终回答”，而是：

- 状态判断
- 中间进度
- 可复核的结果对象
- 可被 Guard / Merge / Report 消费的结构化产物

#### 3. 可观测性与生命周期

理想 backend 要能被外层系统做：

- health check
- timeout 控制
- 重试
- 降级
- 会话恢复或至少幂等重跑

如果 backend 对 Swarm 来说是黑盒，只能“发命令然后傻等”，它就很难成为可靠的蜂群底座。

#### 4. 权限与沙箱控制

Swarm 要给不同角色不同权限：

- Scout：只读
- Builder：可写但有 scope
- Reviewer：只读 + 测试
- Coordinator：不写代码，只调度

所以 backend 最好支持：

- 只读 / 可写模式
- 工具白名单
- 自动批准策略
- 最大回合数限制

#### 5. 并发友好

Swarm 是多代理并行的。一个适合的 backend，应该至少做到：

- 支持多进程并发调用
- 不强依赖单会话人工 attach
- 冷启动成本可控
- 会话模型不会与外部调度冲突

#### 6. 成本与路由友好

Swarm 的角色天然分层：

- Scout 更看重成本、速度
- Builder 更看重代码修改质量
- Reviewer / Coordinator 更看重稳定性、结构化表达和推理质量

因此适合的 backend 应该便于：

- 按角色路由
- 按任务复杂度路由
- 按 provider 健康度降级

---

## 三、推荐结果总览

| 候选 | 适合作默认 backend | 适合角色 | 主要优点 | 主要问题 |
|------|--------------------|----------|----------|----------|
| Codex CLI | **强烈推荐** | Builder / Reviewer / 部分 Coordinator | 无头强、JSON 强、schema 强、自动化友好 | 生态偏 OpenAI，云依赖较强 |
| Claude Code | **强烈推荐** | Coordinator / Reviewer / 高价值 Builder | 复杂任务质量高、headless 完整、结构化输出好 | 成本较高，本地化弱 |
| Gemini CLI | **推荐** | Scout / Planner / 轻量 Builder | 便宜、快、headless 成熟、JSON 输出稳定 | 深度代码执行闭环通常不如前两者 |
| Qwen Code | **推荐** | Scout / Builder / 中国区低成本路径 | 中文场景友好、headless/stream-json 可用、成本友好 | 生态成熟度和外部集成经验仍在爬坡 |
| OpenCode | **谨慎使用** | Interactive Builder / 人机协作模式 | server/client 强、attach 强、交互式 coding 体验好 | Coworker 心智太重，不适合做默认总后端 |
| Aider | **只建议特定场景** | 单任务 Builder / Patch Bot | 文件编辑能力强、Git 集成好、单任务改代码高效 | 更像单兵作战工具，不像可编排总后端 |

---

## 四、逐个推荐与理由

## 4.1 Codex CLI —— 最像“可被 Swarm 编排的工业型后端”

### 为什么推荐

Codex CLI 很适合 Swarm 这种“外层 orchestrator + 内层 agent runtime”的结构，核心原因有 5 个：

1. **非交互模式明确**
   - 适合脚本、CI、批处理运行。
2. **JSON / JSONL 事件流强**
   - 很适合被外层调度器消费，而不是只给人看。
3. **支持 output schema**
   - 非常适合 Scout 结果、Reviewer 结论、风险报告、任务摘要这类结构化产物。
4. **有明确的 sandbox / permission 语义**
   - 可以按角色设置只读、workspace-write 等模式。
5. **适合“每次任务一个进程”的蜂群模型**
   - 很适合 Builder / Reviewer 这种 task-oriented agent。

### 最适合的 Swarm 角色

- **Builder**
- **Reviewer**
- **Structured batch Scout**

### 适合的使用方式

- `BuilderBackend`
- `ReviewerBackend`
- `BatchAnalysisBackend`

### 不足

- 更偏 OpenAI 生态，provider 可替换性不如“纯协议层 + 自己接模型 API”。
- 如果你们长期目标是 local-first / self-host-first，它更适合作为高质量云 fallback，而不是唯一底座。

### 结论

如果你们今天就要挑一个**最适合做 Swarm 默认 coding backend** 的 CLI，我会优先选 **Codex CLI**。

---

## 4.2 Claude Code —— 最适合高价值协调、评审与复杂改造

### 为什么推荐

Claude Code 的优势不是“最像 shell 工具”，而是它在以下场景通常更稳：

- 复杂代码理解
- 规划与重构
- 评审与风险识别
- 多轮但仍可 headless 化的任务

它适合 Swarm 的原因在于：

1. **支持 headless print 模式**
2. **支持 JSON / stream-json**
3. **支持 json-schema**
4. **支持工具白名单与最大回合控制**
5. **很适合做高质量 reviewer / coordinator 型 worker**

### 最适合的 Swarm 角色

- **Coordinator**
- **Reviewer**
- **高风险 Builder**

### 最佳定位

不要把 Claude Code 当“所有 agent 都用它”的唯一后端，而是把它放在：

- 高价值 reviewer
- 高复杂 coordinator
- 高风险 patch / refactor builder

### 不足

- 成本通常高于 Gemini / Qwen 路径。
- 不适合作为大规模低成本并行 scout 的唯一来源。
- 本地自托管路线不强。

### 结论

如果你们想做“**高质量决策层 + 高质量审查层**”，Claude Code 非常适合作为 Swarm 的高级 backend。

---

## 4.3 Gemini CLI —— 最适合高吞吐 Scout / Planner 路径

### 为什么推荐

Gemini CLI 最大的价值，不一定是“改代码最猛”，而是它很适合：

- 大量无头运行
- 快速出结构化结果
- 成本较敏感的批处理任务
- 轻量级 planning / scouting

它适合 Swarm 的原因：

1. **headless mode 成熟**
2. **支持 JSON 输出**
3. **便于脚本化**
4. **统计信息输出较友好**
5. **很适合并行批量 scout**

### 最适合的 Swarm 角色

- **Scout**
- **Planner**
- **Cheap Draft Reviewer**

### 最佳定位

把 Gemini CLI 作为：

- 默认 Scout backend
- 低成本 planner
- 第一轮草稿分析器

会比把它硬塞进重度 Builder 主路径更合适。

### 不足

- 在深度代码改写闭环上，通常不如 Codex CLI / Claude Code 稳。
- 更适合作为“高吞吐前置层”，不是唯一高质量执行层。

### 结论

如果 Swarm 的目标是“**先让 4~10 个 scout 很便宜地并行跑起来**”，Gemini CLI 非常值得接。

---

## 4.4 Qwen Code —— 最适合成本敏感、中文友好、区域友好的第二主力

### 为什么推荐

如果你们团队在意以下因素：

- 中文任务理解
- 中国区可用性
- 成本控制
- 与本地 / 兼容 OpenAI 风格生态协同

那么 Qwen Code 是很值得纳入 Swarm 体系的。

它的优点是：

1. **支持 headless**
2. **支持 json / stream-json**
3. **支持继续会话**
4. **在中文工程场景更友好**
5. **可以作为便宜的 Builder / Scout 路线**

### 最适合的 Swarm 角色

- **Scout**
- **Builder**
- **Cheap Reviewer**

### 最佳定位

如果你们希望形成：

- `Gemini / Qwen` 负责低成本广覆盖
- `Codex / Claude` 负责高价值兜底

那 Qwen Code 很适合作为其中一条主力线。

### 不足

- 外部生态、第三方自动化案例、团队熟悉度，通常没有 Claude Code / Codex CLI 那么成熟。
- 若你们特别强调超强结构化协议和高质量 reviewer，往往还需要更强模型做二次裁决。

### 结论

Qwen Code 很适合成为 Swarm 的**低成本主力 backend 之一**，尤其适合中文团队和中国区基础设施环境。

---

## 4.5 OpenCode —— 不适合做默认总后端，但适合做 interactive_shell 能力位

### 为什么你会觉得它“不太匹配”

你的直觉是对的。OpenCode 的问题不是“不好”，而是它的产品心智更像：

- Coworker
- 交互式 coding companion
- server/client 会话系统
- attach / 持续会话 / 人机协作体验

这和 Swarm 想要的默认 backend 心智并不完全一致。Swarm 需要的默认 backend 更像：

- 无头 worker
- 批处理任务执行器
- 可严格脚本化
- 容易做 health / retry / timeout / JSON parsing 的组件

### OpenCode 适合什么位置

OpenCode 不该被彻底排除，而应该被放到更准确的位置：

- **Interactive Builder**
- **人工接管模式**
- **需要 attach / remote session 的复杂问题处理**
- **需要 server/client 常驻服务的协作工位**

### 为什么不建议当默认总后端

1. **交互范式偏重**
2. **server/client 生命周期会增加外层编排复杂度**
3. **如果默认所有角色都走它，Swarm 会被它的会话模型反向约束**
4. **对于 audit / review / report 这类 headless 场景，它通常太重**

### 结论

我的建议不是“别用 OpenCode”，而是：

> **不要让 OpenCode 定义 Swarm 的 backend 抽象；让 Swarm 定义自己的能力抽象，再把 OpenCode 接进 interactive_shell 能力位。**

---

## 4.6 Aider —— 很适合单兵 Builder，但不适合做总控后端

### 为什么它仍值得接

Aider 的长项很清楚：

- 面向代码编辑本身
- 单任务文件修改很高效
- Git 集成强
- 对 patch 型工作很实用

如果你们有这类 agent：

- 修单个 bug
- 改几个文件
- 做小范围 patch

它很好用。

### 为什么不适合当 Swarm 默认 backend

1. **更像“单兵编码器”而不是“被大规模编排的后端”**
2. **脚本化可用，但结构化事件能力相对不算最强**
3. **更适合 Builder，不太适合 Scout / Coordinator / Reviewer 全角色覆盖**

### 结论

Aider 很适合作为：

- `PatchBuilderBackend`
- `SingleTaskFixBackend`

但不建议作为 Swarm 的统一默认 backend。

---

## 五、最推荐的架构做法：能力分层，而不是工具单选

## 5.1 不要设计成

```text
Swarm -> OpenCode
```

或者：

```text
Swarm -> Claude Code
```

这种“一个工具吃掉全部角色”的结构，短期快，长期会被该工具的交互模型、权限模型、输出模型、会话模型绑死。

## 5.2 更合理的做法是

```text
Swarm
  ├─ structured_batch_audit
  ├─ cheap_scout
  ├─ builder
  ├─ reviewer
  ├─ interactive_shell
  └─ second_opinion
```

然后把不同 CLI 映射进去：

| 能力位 | 优先候选 | 备选 |
|--------|----------|------|
| cheap_scout | Gemini CLI / Qwen Code | Claude Code |
| builder | Codex CLI / Qwen Code | Aider / OpenCode |
| reviewer | Claude Code / Codex CLI | Gemini CLI |
| coordinator_assist | Claude Code | Gemini CLI |
| interactive_shell | OpenCode | Claude Code |
| second_opinion | Claude Code / Codex CLI | Qwen Code |

这样做有三个好处：

1. **角色与厂商解耦**
2. **可以按成本/质量动态路由**
3. **某个工具失效时容易降级**

---

## 六、给你们团队的实际推荐方案

## 方案 A：最稳的“工业化蜂群”路线

适合：追求稳定、结构化、评审质量、自动化集成。

### 推荐组合

- **Scout**：Gemini CLI
- **Builder**：Codex CLI
- **Reviewer**：Claude Code
- **Coordinator Assist / Second Opinion**：Claude Code
- **Interactive Escalation**：OpenCode

### 为什么这样配

- 成本与质量分层清晰
- 每个工具都放在自己最擅长的位置
- 不会让 OpenCode 的 server/client 模型绑住全部角色

### 我对这个方案的总体评价

**最推荐。**

---

## 方案 B：成本优先、中文友好的路线

适合：中文团队、区域网络约束较强、成本敏感。

### 推荐组合

- **Scout**：Qwen Code / Gemini CLI
- **Builder**：Qwen Code
- **Reviewer**：Claude Code 或 Codex CLI
- **Interactive Escalation**：OpenCode

### 为什么这样配

- 大部分流量走低成本路径
- 高风险节点再切到更强 reviewer
- 更符合中文团队的现实使用习惯

### 总体评价

**推荐。**

---

## 方案 C：全部走单一高质量云工具

例如：

- Builder / Reviewer / Coordinator 全部走 Claude Code
- 或全部走 Codex CLI

### 我不推荐的原因

1. 成本高
2. 很难体现 Swarm 的角色分层价值
3. 某个工具出故障时，整套系统一起退化
4. 不利于后续做 provider qualification 和动态路由

### 总体评价

**不建议作为长期方案。**

---

## 七、如果只让我给一个“最终推荐名单”

### 默认推荐顺序

1. **Codex CLI** —— 最适合默认 Builder / structured execution backend
2. **Claude Code** —— 最适合高级 Reviewer / Coordinator backend
3. **Gemini CLI** —— 最适合高吞吐 Scout backend
4. **Qwen Code** —— 最适合低成本中文主力 backend
5. **OpenCode** —— 适合 interactive_shell，不适合默认总后端
6. **Aider** —— 适合 patch bot，不适合全角色统一 backend

---

## 八、最后的判断：你现在该怎么选

如果你现在已经发现 **OpenCode 的 Coworker、server/client、attach 心智不太匹配 Swarm 默认 backend**，那我建议你们直接做两个决定：

### 决定 1：停止把“默认 backend”与“交互型 coding tool”绑定

默认 backend 应优先满足：

- headless
- JSON / stream-json
- schema
- timeout / retry / health
- role-based automation

这类诉求下，**Codex CLI / Claude Code / Gemini CLI / Qwen Code** 都比 OpenCode 更适合当默认 backend。

### 决定 2：把 OpenCode 重新定义为 specialized capability

给它的定位改成：

- `interactive_shell`
- `human_takeover`
- `remote_attach_builder`

而不是：

- `default_backend`
- `all_role_runtime`

这样你们就能既保留 OpenCode 的长处，又不让它牵着 Swarm 的抽象走。

---

## 九、我的最终建议

### 最推荐的一句话版本

> **Swarm 的默认 backend，优先选 Codex CLI / Claude Code / Gemini CLI / Qwen Code 这类无头、可脚本化、结构化输出强的工具；OpenCode 保留，但只放到 interactive_shell 能力位，不要让它定义 Swarm 的总抽象。**

### 如果只能先接两个

- **Builder 主后端**：Codex CLI
- **Scout 主后端**：Gemini CLI

然后再补：

- **高级 Reviewer / Coordinator**：Claude Code
- **低成本中文路线**：Qwen Code
- **人工接管与交互工位**：OpenCode

---

## 十、建议你们下一步在 Swarm 里落地的 backend 抽象

建议至少定义统一适配接口：

```ts
interface ToolBackend {
  name: string;
  capabilities: Array<
    | "cheap_scout"
    | "builder"
    | "reviewer"
    | "interactive_shell"
    | "structured_batch"
    | "second_opinion"
  >;

  healthCheck(): Promise<HealthStatus>;
  run(task: BackendTask): Promise<BackendResult>;
  runStream?(task: BackendTask): AsyncIterable<BackendEvent>;
  cancel?(taskId: string): Promise<void>;
}
```

这样你们后续接：

- Codex CLI
- Claude Code
- Gemini CLI
- Qwen Code
- OpenCode
- Aider

时，Swarm 本身都不需要被某一个工具的产品形态反向塑形。
