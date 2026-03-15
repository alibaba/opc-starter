# Swarm Agent V3 改进计划：执行监控 + 失败恢复 + 智能调度

> 创建时间：2026-02-23
> 基于：swarm-run-report.md 真实执行发现 + Cursor SubAgent 分发机制分析
> 前置条件：R1–R40 共 93 项修复已完成，IHS 连续稳定 96+

---

## 设计哲学

### 从 Cursor SubAgent 机制中提炼的核心模式

在本次会话中，Cursor 使用了以下 SubAgent 分发模式来完成复杂任务：

| 模式 | Cursor 实现 | Swarm 现状 | 差距 |
|------|------------|-----------|------|
| **并行探索** | 同时启动 3 个 explore SubAgent 分别调查 timeout/ghost/agent-run | `Promise.all()` 并行 Scout | ✅ 已有 |
| **结果聚合** | SubAgent 返回结构化报告，主 Agent 综合决策 | Scout findings → Planner | ✅ 已有 |
| **流式感知** | SubAgent 输出实时可见，主 Agent 可随时读取进度 | tmux capture 一次性抓取，无流式 | ❌ 缺失 |
| **上下文隔离** | 每个 SubAgent 独立上下文，不互相干扰 | Git worktree + tmux 隔离 | ✅ 已有 |
| **失败不传染** | 一个 SubAgent 失败不影响其他并行任务 | 依赖链断裂导致级联失败 | ❌ 缺失 |
| **可恢复** | SubAgent 可通过 `resume` 参数恢复上下文继续执行 | Agent 失败后无法恢复 | ❌ 缺失 |
| **超时自适应** | `block_until_ms` 可按任务预期时长设置 | R40 已支持 `--task-timeout` | ✅ 已有 |
| **模型分级** | `fast` 用于简单任务，默认用于复杂任务 | `model_tier: low/mid/high` | ✅ 已有 |

**核心洞察**：Swarm 在"规划阶段"（Scout → Plan）已经很强，但在"执行阶段"（Run → Monitor → Recover）存在三个关键缺口：

1. **执行不透明**——无法实时观察 Agent 内部在做什么
2. **失败不可恢复**——一个 task 失败导致整条依赖链崩溃
3. **调度不够智能**——不能根据运行时信号动态调整策略

---

## 改进路线图

```
V3.1 执行监控        V3.2 失败恢复          V3.3 智能调度
(可观测性)           (韧性)                (自适应)
─────────────────────────────────────────────────────────
│ swarm logs         │ 任务重试             │ 动态超时
│ 实时日志流         │ 依赖链修复           │ 复杂度感知
│ Dashboard SSE      │ 部分成功 merge       │ 运行时降级
│ Agent 心跳         │ 手动干预接口         │ 成本预警
─────────────────────────────────────────────────────────
  Phase 1 (2周)        Phase 2 (2周)          Phase 3 (1周)
```

---

## V3.1 执行监控（Agent Observability）

### 动机

swarm-run-report.md 记录的真实执行场景中，用户只能看到：

```
[17:04:46] RUNNING  task-001 -> builder-mlyyahpy-5ug4
                    ... 66 秒的黑盒 ...
[17:05:32] DONE     task-001
```

中间 66 秒内 Agent 在做什么完全不可见。如果 Agent 卡住或走错方向，只能等到超时才发现。

### V3.1.1 `swarm logs` 命令

**目标**：实时查看指定 Agent 或所有 Agent 的 tmux 输出流。

**设计**：

```
swarm logs                        # 交错显示所有活跃 Agent 的输出
swarm logs --agent <agent-id>     # 只看指定 Agent
swarm logs --follow               # 持续跟踪（类似 tail -f）
swarm logs --since 5m             # 最近 5 分钟的日志
swarm logs --json                 # 结构化 JSON 输出
```

**实现方案**：

```typescript
// src/cli/logs.ts

interface LogEntry {
  timestamp: Date;
  agentId: string;
  role: AgentRole;
  taskId: string;
  content: string;
}

// 核心：轮询 tmux capture-pane，diff 出新增行
class AgentLogStream {
  private lastLineCount = new Map<string, number>();

  async poll(handles: AgentHandle[]): Promise<LogEntry[]> {
    const entries: LogEntry[] = [];
    for (const handle of handles) {
      const output = await handle.capture(200);
      const lines = output.split('\n');
      const lastCount = this.lastLineCount.get(handle.id) ?? 0;
      const newLines = lines.slice(lastCount);
      if (newLines.length > 0) {
        entries.push({
          timestamp: new Date(),
          agentId: handle.id,
          role: handle.role,
          taskId: handle.id, // 从 SessionsStore 查
          content: newLines.join('\n'),
        });
        this.lastLineCount.set(handle.id, lines.length);
      }
    }
    return entries;
  }
}
```

**文件变更**：

| 文件 | 变更 |
|------|------|
| `src/cli/logs.ts` | 新增：`swarm logs` 命令实现 |
| `src/cli/index.ts` | 注册 logs 命令 |
| `src/isolation/tmux.ts` | 新增 `tailCapture()` 方法（增量捕获） |
| `README.md` | 新增 logs 命令文档 |

**测试**：

- 单元测试：AgentLogStream 的增量捕获逻辑
- 集成测试：`swarm logs --help` 冒烟测试
- 冒烟测试脚本新增 logs 条目

### V3.1.2 Agent 心跳机制

**目标**：Agent 定期向 SessionsStore 写入心跳，Dispatcher/Watchdog 可据此判断 Agent 是否存活。

**设计**：

```typescript
// agent-run.ts 中的心跳循环
const heartbeatInterval = setInterval(() => {
  store.updateHeartbeat(agentId, {
    timestamp: Date.now(),
    phase: currentPhase,      // 'analyzing' | 'coding' | 'testing' | 'committing'
    progress: progressPercent, // 0-100
    lastAction: lastActionDesc,
  });
}, 10_000); // 每 10 秒
```

**数据库变更**：

```sql
ALTER TABLE agents ADD COLUMN last_heartbeat_at INTEGER;
ALTER TABLE agents ADD COLUMN heartbeat_data TEXT; -- JSON
```

**文件变更**：

| 文件 | 变更 |
|------|------|
| `src/stores/sessions.ts` | 新增 `updateHeartbeat()` / `getHeartbeat()` |
| `src/stores/migrations.ts` | 新增 migration：agents 表加心跳字段 |
| `src/cli/agent-run.ts` | 启动心跳循环，退出时清理 |
| `src/core/watchdog.ts` | 心跳超时检测（替代纯 trace 时间判断） |
| `src/cli/status.ts` | 显示心跳信息（phase、progress） |

### V3.1.3 Dashboard 实时推送

**目标**：Dashboard Web UI 通过 SSE（Server-Sent Events）实时推送 Agent 状态变化。

**设计**：

```typescript
// src/dashboard/api.ts

// GET /api/events — SSE 端点
app.get('/api/events', (c) => {
  return c.newResponse(
    new ReadableStream({
      start(controller) {
        const send = (event: string, data: unknown) => {
          controller.enqueue(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
        };

        // 订阅 Dispatcher 和 Watchdog 事件
        const dispatchListener = (e: DispatchEvent) => send('dispatch', e);
        const watchdogListener = (e: WatchdogEvent) => send('watchdog', e);

        dispatcher.on(dispatchListener);
        watchdog?.on(watchdogListener);

        // 每 5 秒发送心跳汇总
        const heartbeatTimer = setInterval(() => {
          const agents = sessionsStore.getActiveAgents();
          send('heartbeat', agents.map(a => ({
            id: a.id, status: a.status,
            heartbeat: sessionsStore.getHeartbeat(a.id),
          })));
        }, 5000);
      },
    }),
    { headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache' } },
  );
});
```

**文件变更**：

| 文件 | 变更 |
|------|------|
| `src/dashboard/api.ts` | 新增 `/api/events` SSE 端点 |
| `src/dashboard/templates/fleet.html` | 前端 EventSource 接入 |

---

## V3.2 失败恢复（Resilient Execution）

### 动机

swarm-run-report.md 记录的真实执行中：

```
task-003 FAILED (timeout) → task-004 FAILED (dependency) → task-005 FAILED (dependency)
```

一个 task 超时导致 3 个 task 失败，成功率从 100% 降到 40%。Cursor SubAgent 的做法是：每个 SubAgent 独立失败，不影响其他并行任务；失败的 SubAgent 可以通过 `resume` 恢复。

### V3.2.1 任务重试机制

**目标**：task 失败后自动重试（可配置次数和退避策略）。

**设计**：

```typescript
// DispatchOptions 扩展
export interface DispatchOptions {
  maxConcurrent: number;
  staggerDelayMs: number;
  dryRun: boolean;
  taskTimeoutMs?: number;
  // V3.2 新增
  maxRetries?: number;          // 默认 1（重试 1 次）
  retryDelayMs?: number;        // 默认 5000（5 秒）
  retryBackoffMultiplier?: number; // 默认 2（指数退避）
}

// waitForAgentCompletion 扩展
private async dispatchTaskWithRetry(
  task: Task, state: TaskState, limiter: ConcurrencyLimiter,
  options: DispatchOptions, spawner: AgentSpawner,
): Promise<void> {
  const maxRetries = options.maxRetries ?? 1;
  let retryDelay = options.retryDelayMs ?? 5000;
  const backoff = options.retryBackoffMultiplier ?? 2;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    if (attempt > 0) {
      this.emit({
        type: 'task_retry',
        taskId: task.id,
        attempt,
        maxRetries,
        timestamp: new Date(),
      });
      await new Promise(r => setTimeout(r, retryDelay));
      retryDelay *= backoff;
      // 清理上一次失败的 worktree
      if (state.handle) {
        try { await state.handle.kill(); } catch (_) {}
      }
      state.status = 'pending';
      state.error = undefined;
    }

    await this.dispatchTask(task, state, limiter,
      options.staggerDelayMs, spawner, options.taskTimeoutMs);

    if (state.status === 'completed') return;
    if (attempt < maxRetries) {
      logger.info({ taskId: task.id, attempt }, 'Task failed, will retry');
    }
  }
}
```

**CLI 选项**：

```
swarm run --max-retries 2         # 最多重试 2 次
swarm run --retry-delay 10000     # 重试间隔 10 秒
```

**文件变更**：

| 文件 | 变更 |
|------|------|
| `src/core/dispatcher.ts` | 新增 `dispatchTaskWithRetry()`，扩展 `DispatchOptions` |
| `src/cli/run.ts` | 新增 `--max-retries` / `--retry-delay` CLI 选项 |
| `src/core/dispatcher.ts` | 新增 `task_retry` 事件类型 |
| `tests/core/dispatcher.test.ts` | 重试逻辑测试 |

### V3.2.2 依赖链弹性处理

**目标**：依赖失败时不立即级联失败，而是提供多种策略。

**设计**：

```typescript
// 依赖失败策略
export type DependencyFailurePolicy =
  | 'cascade'     // 默认：依赖失败则本任务也失败
  | 'skip'        // 跳过失败的依赖，继续执行（适用于可选依赖）
  | 'wait-retry'  // 等待依赖重试完成后再决定
  | 'manual';     // 暂停，等待人工干预

// Task 接口扩展
export interface Task {
  id: TaskId;
  description: string;
  role: AgentRole;
  model_tier: ModelTier;
  file_scope: string[];
  depends_on: TaskId[];
  spec_path: string;
  // V3.2 新增
  dependency_policy?: DependencyFailurePolicy;
  optional?: boolean; // 可选任务，失败不影响整体结果
}
```

**getReadyTasks 改造**：

```typescript
getReadyTasks(taskStates: Map<TaskId, TaskState>): Task[] {
  for (const [, state] of taskStates) {
    if (state.status !== 'pending') continue;

    const depsFailed = state.task.depends_on.some(depId =>
      taskStates.get(depId)?.status === 'failed'
    );

    if (depsFailed) {
      const policy = state.task.dependency_policy ?? 'cascade';
      switch (policy) {
        case 'cascade':
          state.status = 'failed';
          state.error = 'Dependency failed';
          break;
        case 'skip':
          // 跳过失败的依赖，只要非失败依赖都完成就可以执行
          const nonFailedDepsCompleted = state.task.depends_on.every(depId => {
            const dep = taskStates.get(depId);
            return dep?.status === 'completed' || dep?.status === 'failed';
          });
          if (nonFailedDepsCompleted) ready.push(state.task);
          break;
        case 'wait-retry':
          // 等待，不做任何操作（依赖可能正在重试）
          break;
        case 'manual':
          state.status = 'blocked';
          this.emit({ type: 'task_blocked', taskId: state.task.id, ... });
          break;
      }
      continue;
    }
    // ...
  }
}
```

### V3.2.3 部分成功 Merge

**目标**：即使部分 task 失败，已成功的 task 仍可 merge。

**现状分析**：swarm-run-report.md 中 task-001 和 task-002 成功完成并自动 enqueue 到 merge queue，但因为整体 run 失败，用户可能不知道可以 merge 这些成功的分支。

**设计**：

```
swarm run <plan-id>
  # task-001 ✅ → auto-enqueued
  # task-002 ✅ → auto-enqueued
  # task-003 ❌ timeout
  # task-004 ❌ dependency failed
  # task-005 ❌ dependency failed

  Run completed with partial success: 2/5 tasks completed
  2 branches ready to merge. Run 'swarm merge --partial' to merge successful branches.
  Failed tasks can be retried with 'swarm run --retry-failed <plan-id>'
```

**新增命令**：

```
swarm run --retry-failed <plan-id>   # 只重新执行上次失败的 task
swarm merge --partial                # 合并所有已成功的分支
```

**文件变更**：

| 文件 | 变更 |
|------|------|
| `src/cli/run.ts` | 新增 `--retry-failed` 选项，从 plan 中过滤已完成的 task |
| `src/cli/merge.ts` | 新增 `--partial` 选项 |
| `src/core/dispatcher.ts` | `dispatch()` 支持 `skipCompleted` 参数 |

### V3.2.4 手动干预接口

**目标**：允许用户手动标记 task 状态（完成/跳过/重试）。

**设计**：

```
swarm task mark <task-id> --completed   # 手动标记为完成
swarm task mark <task-id> --skip        # 跳过此任务
swarm task retry <task-id>              # 重试指定任务
swarm task list <plan-id>               # 查看任务状态
```

**文件变更**：

| 文件 | 变更 |
|------|------|
| `src/cli/task.ts` | 新增：task 管理命令 |
| `src/cli/index.ts` | 注册 task 命令 |
| `src/stores/sessions.ts` | 新增 task 状态管理方法 |

---

## V3.3 智能调度（Adaptive Dispatch）

### V3.3.1 动态超时（基于文件作用域）

**目标**：根据 task 的 file_scope 大小自动调整超时。

**设计**：

```typescript
function calculateTaskTimeout(task: Task, baseTimeout: number): number {
  const fileCount = task.file_scope.length;
  const tierMultiplier = task.model_tier === 'high' ? 1.5
    : task.model_tier === 'mid' ? 1.2 : 1.0;

  // 基础超时 + 每文件 60 秒 + 模型层级系数
  return Math.min(
    baseTimeout + fileCount * 60_000 * tierMultiplier,
    30 * 60_000, // 上限 30 分钟
  );
}
```

**文件变更**：

| 文件 | 变更 |
|------|------|
| `src/core/dispatcher.ts` | 新增 `calculateTaskTimeout()`，在 `dispatchTask` 中调用 |

### V3.3.2 运行时模型降级

**目标**：当 high-tier 模型超时或失败时，自动降级到 mid-tier 重试。

**设计**：

```typescript
// 降级策略
const TIER_FALLBACK: Record<ModelTier, ModelTier | null> = {
  high: 'mid',
  mid: 'low',
  low: null, // 无法再降级
};

// 在 dispatchTaskWithRetry 中
if (state.status === 'failed' && attempt < maxRetries) {
  const fallbackTier = TIER_FALLBACK[task.model_tier];
  if (fallbackTier && state.error?.includes('timed out')) {
    logger.info({ taskId: task.id, from: task.model_tier, to: fallbackTier },
      'Downgrading model tier for retry');
    task.model_tier = fallbackTier;
  }
}
```

### V3.3.3 成本预警与预算门禁

**目标**：执行过程中实时监控成本，接近预算时暂停或降级。

**设计**：

```typescript
// Dispatcher 中的成本检查
private async checkBudget(): Promise<'ok' | 'warn' | 'halt'> {
  const metrics = new MetricsStore(this.projectPath);
  const summary = metrics.getSummary(7);
  const config = getConfig(this.projectPath);
  const budget = config.backends.budget;

  if (budget?.hardLimitUsd && summary.totalCost >= budget.hardLimitUsd) return 'halt';
  if (budget?.softLimitUsd && summary.totalCost >= budget.softLimitUsd * 0.8) return 'warn';
  return 'ok';
}
```

---

## 实施优先级与依赖关系

```
                    ┌─────────────────┐
                    │  V3.1.1 logs    │ ← 最高优先级，用户可见度最大
                    │  (1 周)         │
                    └────────┬────────┘
                             │
              ┌──────────────┼──────────────┐
              ▼              ▼              ▼
    ┌─────────────┐ ┌──────────────┐ ┌──────────────┐
    │ V3.1.2      │ │ V3.2.1       │ │ V3.2.3       │
    │ 心跳机制    │ │ 任务重试     │ │ 部分成功merge│
    │ (3 天)      │ │ (1 周)       │ │ (3 天)       │
    └──────┬──────┘ └──────┬───────┘ └──────────────┘
           │               │
           ▼               ▼
    ┌─────────────┐ ┌──────────────┐
    │ V3.1.3      │ │ V3.2.2       │
    │ Dashboard   │ │ 依赖链弹性   │
    │ SSE (3 天)  │ │ (1 周)       │
    └─────────────┘ └──────┬───────┘
                           │
              ┌────────────┼────────────┐
              ▼            ▼            ▼
    ┌─────────────┐ ┌──────────┐ ┌──────────────┐
    │ V3.3.1      │ │ V3.2.4   │ │ V3.3.2       │
    │ 动态超时    │ │ 手动干预 │ │ 模型降级     │
    │ (2 天)      │ │ (3 天)   │ │ (3 天)       │
    └─────────────┘ └──────────┘ └──────┬───────┘
                                        │
                                        ▼
                                 ┌──────────────┐
                                 │ V3.3.3       │
                                 │ 成本预警     │
                                 │ (2 天)       │
                                 └──────────────┘
```

### 推荐实施顺序

| 阶段 | 子项 | 预估工期 | 价值 | 风险 |
|------|------|---------|------|------|
| **Phase 1** | V3.1.1 `swarm logs` | 1 周 | 极高——解决执行黑盒问题 | 低 |
| **Phase 1** | V3.2.1 任务重试 | 1 周 | 极高——直接提升 task 成功率 | 中 |
| **Phase 1** | V3.2.3 部分成功 merge | 3 天 | 高——不浪费已完成的工作 | 低 |
| **Phase 2** | V3.1.2 Agent 心跳 | 3 天 | 高——精确健康检测 | 低 |
| **Phase 2** | V3.2.2 依赖链弹性 | 1 周 | 高——减少级联失败 | 中 |
| **Phase 2** | V3.3.1 动态超时 | 2 天 | 中——减少不必要的超时 | 低 |
| **Phase 3** | V3.1.3 Dashboard SSE | 3 天 | 中——Web UI 实时更新 | 低 |
| **Phase 3** | V3.2.4 手动干预 | 3 天 | 中——人机协作 | 低 |
| **Phase 3** | V3.3.2 模型降级 | 3 天 | 中——自动成本优化 | 中 |
| **Phase 3** | V3.3.3 成本预警 | 2 天 | 低——防御性功能 | 低 |

---

## 配置 Schema 扩展

```yaml
# .swarm/config.yaml V3 扩展
agents:
  maxConcurrent: 4
  defaultTimeout: 300000
  # V3 新增
  execution:
    maxRetries: 1                    # 任务最大重试次数
    retryDelayMs: 5000               # 重试间隔
    retryBackoffMultiplier: 2        # 指数退避系数
    heartbeatIntervalMs: 10000       # 心跳间隔
    heartbeatTimeoutMs: 60000        # 心跳超时（判定 Agent 死亡）
    dependencyPolicy: cascade        # 默认依赖失败策略
    dynamicTimeout: true             # 启用动态超时
    dynamicTimeoutPerFileMs: 60000   # 每文件额外超时
    modelDowngrade: false            # 启用模型降级重试
```

**Zod Schema**：

```typescript
export const ExecutionConfigSchema = z.object({
  maxRetries: z.number().int().min(0).max(5).default(1),
  retryDelayMs: z.number().int().min(1000).default(5000),
  retryBackoffMultiplier: z.number().min(1).max(10).default(2),
  heartbeatIntervalMs: z.number().int().min(5000).default(10000),
  heartbeatTimeoutMs: z.number().int().min(10000).default(60000),
  dependencyPolicy: z.enum(['cascade', 'skip', 'wait-retry', 'manual']).default('cascade'),
  dynamicTimeout: z.boolean().default(true),
  dynamicTimeoutPerFileMs: z.number().int().min(10000).default(60000),
  modelDowngrade: z.boolean().default(false),
});
```

---

## 事件系统扩展

```typescript
// V3 新增事件类型
export type DispatchEventType =
  | 'task_ready'
  | 'task_dispatched'
  | 'task_completed'
  | 'task_failed'
  | 'dispatch_complete'
  // V3 新增
  | 'task_retry'        // 任务开始重试
  | 'task_blocked'      // 任务因依赖阻塞（manual 策略）
  | 'task_skipped'      // 任务被跳过（skip 策略）
  | 'task_timeout_warn' // 任务接近超时（80% 时间已用）
  | 'budget_warn'       // 成本接近预算
  | 'budget_halt'       // 成本超出预算，暂停执行
  | 'model_downgrade';  // 模型降级

export type WatchdogEventType =
  | 'health_check'
  | 'agent_stale'
  | 'agent_zombie'
  | 'agent_nudged'
  | 'agent_killed'
  | 'agent_error'
  // V3 新增
  | 'heartbeat_timeout'  // Agent 心跳超时
  | 'heartbeat_resumed'; // Agent 心跳恢复
```

---

## Agent 状态机扩展

```typescript
// V3 扩展：新增 'retrying' 状态
export type AgentStatus =
  | 'pending'
  | 'starting'
  | 'running'
  | 'idle'
  | 'blocked'
  | 'completed'
  | 'failed'
  | 'killed'
  | 'retrying';  // V3 新增：正在重试

export const AgentStateMachine: Record<AgentStatus, AgentStatus[]> = {
  pending: ['starting', 'failed', 'killed'],
  starting: ['running', 'failed', 'killed'],
  running: ['idle', 'blocked', 'completed', 'failed', 'killed'],
  idle: ['running', 'completed', 'killed'],
  blocked: ['running', 'failed', 'killed'],
  completed: [],
  failed: ['retrying'],   // V3：failed 可以转为 retrying
  killed: [],
  retrying: ['starting', 'failed', 'killed'], // V3：retrying 重新进入 starting
};
```

---

## 与现有 Epic 的关系

| Epic | 关系 | 说明 |
|------|------|------|
| N1 Stability | ✅ 已完成 | V3 建立在稳定基础之上 |
| N2 Scout Mode | ✅ 已完成 | V3 不影响 Scout 阶段 |
| N3 Adaptive Routing | 互补 | V3.3.2 模型降级与 N3 自适应路由共享 ModelRouter |
| N4 Constraint Library | ✅ 已完成 | V3 不影响约束库 |
| N5 MCP + GitHub | 互补 | V3.1.3 SSE 可复用于 MCP 事件推送 |
| N6 Intelligence | 互补 | V3.2.1 重试 + N6 patchPlan 可组合为"失败→自动修复→重试" |

---

## 成功指标

| 指标 | 当前值 | V3 目标 |
|------|--------|---------|
| Task 执行成功率 | 40%（swarm-run-report） | ≥ 80%（通过重试 + 动态超时） |
| 执行可观测性 | 仅 4 种事件 | 实时日志流 + 心跳 + 12 种事件 |
| 失败恢复时间 | 手动（分钟级） | 自动重试（秒级） |
| 级联失败率 | 60%（3/5 task 因依赖失败） | ≤ 20%（弹性依赖策略） |
| 成本可控性 | 无预警 | 软/硬预算门禁 |

---

## 风险与缓解

| 风险 | 影响 | 缓解措施 |
|------|------|---------|
| 重试导致成本翻倍 | 中 | maxRetries 默认 1，配合成本预警 |
| 心跳写入增加 DB 负载 | 低 | 10 秒间隔，WAL 模式可承受 |
| 模型降级导致质量下降 | 中 | 只在超时场景降级，不在错误场景降级 |
| 依赖链弹性增加复杂度 | 中 | 默认 cascade 策略，高级策略需显式配置 |
| SSE 长连接资源占用 | 低 | Dashboard 非核心路径，按需启动 |

---

## 附录：Cursor SubAgent vs Swarm Agent 对照表

| 维度 | Cursor SubAgent | Swarm Agent (当前) | Swarm Agent (V3) |
|------|----------------|-------------------|------------------|
| 隔离 | 独立上下文 | Git worktree + tmux | 不变 |
| 通信 | 返回结构化结果 | Mail 消息系统 | + 心跳 + SSE |
| 监控 | 实时输出可见 | 仅状态事件 | + `swarm logs` + 心跳 |
| 失败处理 | 独立失败，可 resume | 级联失败，不可恢复 | + 重试 + 弹性依赖 + resume |
| 超时 | `block_until_ms` 可配 | `--task-timeout` 可配 | + 动态超时 |
| 模型选择 | fast / default | low / mid / high | + 运行时降级 |
| 并行 | 多 SubAgent 并行 | `Promise.all()` + limiter | 不变 |
| 成本控制 | 平台侧 | 软/硬预算配置 | + 运行时预警 |
