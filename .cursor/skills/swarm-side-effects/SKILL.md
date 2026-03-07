---
name: swarm-side-effects
description: Swarm 外循环工作流。吞吐外部需求（Epic Story、Bug、重构、新技术栈），调研代码库现状，拆解为 Anti-Memory-Wall 的可执行任务，标注复杂度以支持混合 LLM SubAgent 并行开发，降低团队研发成本。与 swarm-ai-loop 内循环配合使用。当用户提到"新需求"、"Epic"、"Story"、"feature request"、"Bug"、"缺陷"、"重构"、"升级"、"迁移"、"拆解任务"、"任务规划"、"sprint planning"、"外循环"、"引入新框架"、"需求分析"时触发。
---

# Swarm Side-Effort Loop — 外循环需求吞吐工作流

> **定位**: 研发链路的"外循环推进器"。将外部业务需求转化为 AI Agent 可高效执行的结构化任务流。
>
> **核心理念**: **跑得更快** — 快速吞吐外部复杂度，精准拆解，混合调度，让业务以最低成本最快速度落地。
>
> **互补关系**: 本技能引入新业务复杂度，swarm-ai-loop（内循环）消除隐患、对齐文档、保持健康。两者独立运行，通过 Git Tag 锚点衔接。

---

## 5 Phase 工作流

```
① INTAKE ─▶ ② INVESTIGATE ─▶ ③ DECOMPOSE ─▶ ④ PLAN ─▶ ⑤ DISPATCH
  需求接入      代码库调研        任务拆解        执行计划     分发执行
  epic-status   investigate.sh   validate-plan   (LLM 编排)   (SubAgent)
```

日常外循环只需 3 个脚本 + LLM 决策：`epic-status.sh`（Phase ①）、`codebase-investigate.sh`（Phase ②）和 `validate-epic-plan.sh`（Phase ③）。

---

## Phase ① INTAKE — 需求接入

**目标**: 接收外部需求，分类定级。

### 步骤 1：查看 Epic 全景

```bash
bash .cursor/skills/swarm-side-effects/scripts/epic-status.sh
```

脚本输出：Active/Backlog/Archived 统计、活跃 Epic 详情、WIP 过载警告。

### 步骤 2：分类定级

根据需求类型分类（读取 `references/templates.md` 获取完整模板）：

| 类型 | 代号 | 典型复杂度 |
|------|------|-----------|
| 新功能 | `F` | M–XL |
| 缺陷修复 | `B` | S–L |
| 重构改造 | `R` | M–XL |
| 技术升级 | `U` | L–XL |
| 文档补全 | `D` | S–M |

### 步骤 3：决策

| 条件 | 处理 |
|------|------|
| Active Epics > 5 | 暂缓新需求，先完成 WIP |
| P0/P1 Bug | 走急速模式（跳到 Phase ②） |
| 普通需求 | 继续 Phase ② |

---

## Phase ② INVESTIGATE — 代码库调研

**目标**: 深入调研现有代码库的相关实现，理解能力边界和约束。

### 步骤 1：运行自动化调研

```bash
bash .cursor/skills/swarm-side-effects/scripts/codebase-investigate.sh "<关键词>"
```

脚本自动完成：
- 搜索相关源文件（按匹配度排序）
- 定位类型/接口定义
- 查找相关测试
- 分析依赖关系和 import 链
- 检查数据模型（SQL schema）
- 扫描文档引用
- 列出项目约束（AGENTS.md）
- 输出影响面摘要 + 复杂度预判

### 步骤 2：LLM 补充分析

脚本提供结构化数据，LLM 负责：
- 读取关键源文件（脚本列出的高优文件）
- 判断模块间耦合程度
- 识别约束冲突和风险
- 输出调研报告（模板见 `references/templates.md`）

### 步骤 3：确认影响面

```markdown
影响面摘要：
- 🔴 高影响: [模块] — [原因]
- 🟡 中影响: [模块] — [原因]
- 🟢 低影响: [模块] — [原因]
```

---

## Phase ③ DECOMPOSE — 任务拆解

**目标**: 按 Anti-Memory-Wall 原则拆解任务，让每个 Task 可被 AI Agent 独立高效执行。

### Anti-Memory-Wall 约束

每个 Task 必须满足：

| 约束 | 要求 | 量化 |
|------|------|------|
| 自包含上下文 | Task 内含所有必要背景 | 无跨 Task 引用 |
| 显式文件列表 | "Files to Read First" | ≤ 8 个文件 |
| 有限范围 | 每个 Task 触及少量文件 | ≤ 5 文件/Task |
| 可验证产出 | 有明确验收命令 | ≥ 1 条 npm/bash 命令 |
| 无跨 Task 依赖 | 仅依赖"完成状态" | 不依赖中间产物 |

### 复杂度标注

| 等级 | 特征 | Context 预算 | 推荐 LLM |
|------|------|-------------|----------|
| S | ≤2 文件，逻辑直白 | < 4K | 🟢 fast |
| M | 3-5 文件，标准 CRUD | 4K–16K | 🟡 默认 |
| L | 跨模块，需架构上下文 | 16K–64K | 🟠 默认(高优) |
| XL | 架构级变更 | > 64K | 🔴 顶级+人工审查 |

> 复杂度判定细则见 `references/templates.md` "复杂度判定速查" 章节。

### 拆解步骤

1. 根据调研报告确定任务边界
2. 按模板写每个 Task（模板见 `references/templates.md` "任务拆解模板"）
3. 标注复杂度 + 推荐 LLM
4. 运行验证脚本：

```bash
bash .cursor/skills/swarm-side-effects/scripts/validate-epic-plan.sh <epic-file>
```

脚本检查每个 Task 的 6 项合规性指标，输出评分和改进建议。

### 拆解心法

```
一个好的 Task 应该让 AI Agent 在读完描述后就能"闭着眼睛"执行。

✅ 好: "在 src/lib/agent/providers/ 下创建 types.ts，
   定义 LLMProvider 接口，包含 name, chat, streamChat 三个方法。
   参考 sseClient.ts 中现有的请求格式。"

❌ 坏: "实现多 Provider 支持"
```

### 成本优化策略

三条核心策略降低 LLM 使用成本：

1. **最大化 S 级占比** — 将 M 级进一步拆为多个 S 级
2. **避免 XL 级** — 通过架构预设降低单 Task 复杂度
3. **最大化并行** — 同一 Wave 内解耦，每 Wave ≥ 2 个并行 Task

---

## Phase ④ PLAN — 执行计划编排

**目标**: 将 Task 编排为 Wave 并行执行计划。

### 依赖图构建

```
Task 依赖图示例:

  T1 (S) ─┐
           ├─▶ T4 (M) ─┐
  T2 (M) ─┘             ├─▶ T6 (L) ── T7 (M) ── ✅ Done
  T3 (S) ───▶ T5 (S) ──┘

Wave 1: [T1, T2, T3]  ← 并行 3 SubAgent
Wave 2: [T4, T5]      ← 并行 2 SubAgent
Wave 3: [T6]          ← 串行
Wave 4: [T7]          ← 串行
```

输出执行计划文档（模板见 `references/templates.md` "执行计划模板"）。

---

## Phase ⑤ DISPATCH — 分发执行

**目标**: 按计划将 Task 分发给 SubAgent 执行。

### LLM 路由

| 复杂度 | model 参数 | max_parallel | 备注 |
|--------|-----------|-------------|------|
| S | `"fast"` | 4 | 成本最低 |
| M | 默认 | 3 | 标准路径 |
| L | 默认 | 2 | 需架构上下文 |
| XL | 默认 | 1 | 或拆分为 L/M |

> 完整 LLM 路由配置见 `references/templates.md` "LLM 路由策略"。

### Wave 执行流程

```
Wave N 开始
  ├─ SubAgent-1 (Task A)  ──┐
  ├─ SubAgent-2 (Task B)  ──┤─ 等待全部完成
  └─ SubAgent-3 (Task C)  ──┘
                              │
                              ▼
                       合并 + 冲突检测
                              │
                              ▼
                       Wave N+1 开始
```

### SubAgent Prompt 模板

每个 SubAgent 收到的 prompt 应包含：
1. 完整的 Task 描述（自包含上下文）
2. "Files to Read First" 列表
3. 验收标准中的所有命令
4. 项目的禁止事项（从 AGENTS.md 摘取）

---

## 快捷模式

### 快速模式（仅拆解不执行）

```
触发词: "拆解 [需求描述]，只规划不执行"

输出: 调研报告 + 任务清单 + 执行计划
跳过: Phase ⑤ DISPATCH
```

### 急速模式（Bug 快速通道）

```
触发词: "紧急修复 [Bug 描述]"

流程: INTAKE(快速) → INVESTIGATE → 单 Task 修复 → 验证
跳过: 完整 PLAN 阶段
```

---

## 与内循环的交接

外循环和内循环（swarm-ai-loop）独立运行，通过以下机制衔接：

| 事件 | 动作 |
|------|------|
| 全部 Task 完成 | 触发内循环巡检（`npm run ai:check`） |
| 内循环发现回归 | 回传外循环，创建 Bug 类型 Task |
| IHS < 60 | 外循环暂停新需求 |

完成后更新：
- `docs/Epics.yaml` — 更新 Epic 状态
- `AGENTS.md` — 如有新模块/工具

---

## 脚本清单

| 脚本 | 用途 | Phase |
|------|------|-------|
| `scripts/epic-status.sh` | Epic 全景 + WIP 检测 | ① |
| `scripts/codebase-investigate.sh` | 自动化代码库调研 | ② |
| `scripts/validate-epic-plan.sh` | Anti-Memory-Wall 合规验证 | ③ |

> 所有脚本路径前缀：`.cursor/skills/swarm-side-effects/`

---

## 完整迭代示例

```bash
# ── Phase ① INTAKE ──
bash .cursor/skills/swarm-side-effects/scripts/epic-status.sh
# LLM 分类定级

# ── Phase ② INVESTIGATE ──
bash .cursor/skills/swarm-side-effects/scripts/codebase-investigate.sh "provider"
# LLM 补充分析，输出调研报告

# ── Phase ③ DECOMPOSE ──
# LLM 按模板拆解任务（模板: references/templates.md）
bash .cursor/skills/swarm-side-effects/scripts/validate-epic-plan.sh docs/epics/epic-26.md
# 修正不合规项，重新验证直到 PASS

# ── Phase ④ PLAN ──
# LLM 编排 Wave 并行计划

# ── Phase ⑤ DISPATCH ──
# 按 Wave 调度 SubAgent 执行
# 每 Wave 完成后合并 + 冲突检测

# ── 完成后 ──
npm run ai:check
# 更新 docs/Epics.yaml
# (可选) 触发 swarm-ai-loop 内循环完整巡检
```

---

## 迭代结束自查

- [ ] epic-status.sh 已运行，WIP 未过载？
- [ ] codebase-investigate.sh 已运行，影响面已确认？
- [ ] 每个 Task 满足 Anti-Memory-Wall 约束？
- [ ] validate-epic-plan.sh 输出 PASS 或 ACCEPTABLE？
- [ ] Wave 编排最大化了并行度？
- [ ] XL 级 Task 已尽量拆分为 L/M 级？
- [ ] S 级 Task 占比 ≥ 40%（成本优化）？
- [ ] Epics.yaml 已更新？
- [ ] 完成后触发了内循环巡检？

---

## 文档导航

| 文件 | 何时读取 |
|------|---------|
| `references/templates.md` | 需要接入/调研/拆解/计划模板时 |
| `scripts/epic-status.sh` | Phase ① INTAKE |
| `scripts/codebase-investigate.sh` | Phase ② INVESTIGATE |
| `scripts/validate-epic-plan.sh` | Phase ③ DECOMPOSE |
| `AGENTS.md` | 首次接触项目 |
| `docs/Architecture.md` | L/XL 级任务调研时 |
| `docs/Epics.yaml` | 需求接入和归档时 |
