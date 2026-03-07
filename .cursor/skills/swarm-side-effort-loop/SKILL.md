---
name: swarm-side-effort-loop
description: Swarm 外循环工作流。吞吐外部需求（Epic Story、Bug、重构、新技术栈），调研代码库现状，拆解为 Anti-Memory-Wall 的可执行任务，标注复杂度以支持混合 LLM SubAgent 并行开发，降低团队研发成本。与 swarm-ai-loop 内循环配合使用。
---

# Swarm Side-Effort Loop — 外循环需求吞吐工作流

> **定位**: 研发链路的"外循环推进器"。负责将外部业务需求（Epic Story、缺陷 Bug、重构改造、新技术引入）转化为 AI Agent 可高效执行的结构化任务流。
>
> **核心理念**: **跑得更快** — 快速吞吐外部复杂度，精准拆解，混合调度，让业务以最低成本最快速度落地。
>
> **互补关系**: 本技能（外循环）引入新的业务复杂度，swarm-ai-loop（内循环）定期消除隐患、对齐文档、保持健康。一快一慢，动态平衡。

---

## 双循环协作模型

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        Swarm 双循环架构                                  │
│                                                                         │
│  ┌─────────────────────────────────┐  ┌──────────────────────────────┐  │
│  │   外循环 (Side-Effort Loop)      │  │   内循环 (AI Loop)            │  │
│  │   🏃 跑得更快                    │  │   🛡️ 慢下来做对               │  │
│  │                                 │  │                              │  │
│  │   • 吞吐外部需求                 │  │   • 消除技术债                │  │
│  │   • 调研现有实现                 │  │   • 对齐文档                  │  │
│  │   • 拆解任务                    │  │   • 回归检测                  │  │
│  │   • 标注复杂度                  │  │   • Git Tag 锚点              │  │
│  │   • 混合 LLM 并行开发           │  │   • IHS 健康评估              │  │
│  │                                 │  │                              │  │
│  │   产出: Epic → Tasks            │  │   产出: 质量报告 + 修复       │  │
│  └────────────┬────────────────────┘  └──────────────┬───────────────┘  │
│               │                                      │                  │
│               └──────────── 交接点 ──────────────────┘                  │
│                 外循环完成 → 触发内循环巡检                                │
│                 内循环发现问题 → 反馈给外循环规划                          │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 1) 何时触发

当满足以下任一条件时触发本技能：

| 触发场景 | 典型关键词 |
|----------|-----------|
| 接入新的产品需求 | `新需求`, `Epic`, `Story`, `feature request` |
| 处理缺陷报告 | `Bug`, `缺陷`, `线上问题`, `hotfix` |
| 重构改造升级 | `重构`, `升级`, `迁移`, `refactor`, `upgrade` |
| 引入新技术栈 | `引入`, `集成`, `新框架`, `new dependency` |
| 批量任务拆解 | `拆解任务`, `任务规划`, `sprint planning` |

---

## 2) 外循环阶段

```
┌──────────────────────────────────────────────────────────────────────────┐
│                     Swarm Side-Effort Outer Loop                         │
│                                                                          │
│  ① INTAKE      ② INVESTIGATE    ③ DECOMPOSE     ④ PLAN      ⑤ DISPATCH │
│ ┌──────────┐  ┌────────────┐  ┌────────────┐  ┌─────────┐  ┌─────────┐ │
│ │ 需求接入  │─▶│ 代码库调研  │─▶│ 任务拆解   │─▶│ 执行计划 │─▶│ 分发执行 │ │
│ │ 分类定级  │  │ 影响分析   │  │ 复杂度标注  │  │ 依赖排序 │  │ LLM 路由│ │
│ └──────────┘  └────────────┘  └────────────┘  └─────────┘  └─────────┘ │
│       │                                                          │      │
│       └──────── 内循环反馈 (质量问题/技术债) ◀────────────────────┘      │
└──────────────────────────────────────────────────────────────────────────┘
```

### Phase ① INTAKE — 需求接入与分类

接收外部需求，进行标准化分类和优先级评定。

**需求类型分类**:

| 类型 | 代号 | 特征 | 典型复杂度 |
|------|------|------|-----------|
| 新功能 (Feature) | `F` | 新增业务能力，用户可感知 | M–XL |
| 缺陷修复 (Bug) | `B` | 现有功能异常，需要修复 | S–L |
| 重构改造 (Refactor) | `R` | 改善代码质量，不改变外部行为 | M–XL |
| 技术升级 (Upgrade) | `U` | 依赖升级、新技术引入 | L–XL |
| 文档补全 (Docs) | `D` | 文档缺失或过期 | S–M |

**需求接入模板**:

```yaml
intake:
  id: "SEL-001"                    # Side-Effort Loop 编号
  type: "F"                        # F/B/R/U/D
  title: "多 LLM Provider 支持"
  source: "Epic-26"                # 来源 (Epics.yaml / Issue / PR)
  priority: "P1"                   # P0(紧急) / P1(高) / P2(中) / P3(低)
  description: |
    支持 OpenAI、Claude、Gemini 等多 LLM 后端，
    用户可在设置中切换 Provider。
  acceptance_criteria:
    - "用户可在设置页面选择 LLM Provider"
    - "Agent Studio 使用选定的 Provider 进行对话"
    - "至少支持 3 种 Provider"
  constraints:
    - "不破坏现有 Qwen-Plus 功能"
    - "遵循 OpenAI SDK 兼容模式"
```

### Phase ② INVESTIGATE — 代码库调研

**目标**: 在动手之前，深入调研现有代码库的相关实现，理解当前架构的能力边界和约束。

**调研维度**:

| 维度 | 调研方法 | 输出 |
|------|---------|------|
| 架构影响面 | 从 `docs/Architecture.md` 出发，定位受影响的模块 | 模块影响清单 |
| 现有实现 | 在 `src/` 中搜索相关代码、类型、接口 | 代码位置 + 当前逻辑 |
| 数据模型 | 检查 `setup.sql` 和 `src/types/` 中的相关表和类型 | Schema 变更需求 |
| 依赖关系 | 检查 `package.json` 和 import 链 | 新增/升级依赖列表 |
| 测试现状 | 检查相关模块的测试覆盖 | 测试基线 + 补充计划 |
| 约束冲突 | 比对 `AGENTS.md` 和 coding constraints | 需要规避的禁区 |

**调研执行步骤**:

```bash
# 1. 定位架构影响面
cat docs/Architecture.md | grep -i "相关模块关键词"

# 2. 搜索现有实现
rg "相关接口/类型/函数名" app/src/ --type ts

# 3. 检查数据模型
rg "相关表名" app/supabase/setup.sql

# 4. 分析依赖
cat app/package.json | jq '.dependencies, .devDependencies'

# 5. 盘点测试现状
find app/src -name "*.test.ts" -o -name "*.test.tsx" | grep "相关模块"

# 6. 检查约束
cat AGENTS.md | grep -A 5 "禁止事项"
```

**调研产出模板**:

```markdown
## 🔍 调研报告: [需求标题]

### 影响面分析
| 模块 | 影响程度 | 说明 |
|------|---------|------|
| Agent Studio | 🔴 高 | 需要重构 SSE Client 支持多 Provider |
| 设置页面 | 🟡 中 | 新增 Provider 选择 UI |
| 数据库 | 🟢 低 | 新增 user_settings 字段 |

### 现有实现关键发现
- `sseClient.ts` 当前硬编码百炼 API endpoint
- `ai-assistant/index.ts` 的 TOOLS 定义与 Provider 无关，可复用
- 缺少 Provider 抽象层

### 约束与风险
- ⚠️ 不能破坏现有 Qwen-Plus 流程
- ⚠️ Edge Function 环境变量管理需要考虑多 Provider Secret
- ✅ A2UI 渲染层与 LLM Provider 解耦，无需改动

### 需要新增/变更的文件
| 文件 | 操作 | 说明 |
|------|------|------|
| `src/lib/agent/providers/` | 新增 | Provider 抽象层 |
| `src/lib/agent/sseClient.ts` | 修改 | 支持动态 endpoint |
| `supabase/functions/ai-assistant/index.ts` | 修改 | 多 Provider 路由 |
```

### Phase ③ DECOMPOSE — 任务拆解

**核心原则: Anti-Memory-Wall 设计**

每个 Task 必须满足以下约束，确保 AI Agent 在有限 Context Window 内高效执行：

| 约束 | 要求 | 原因 |
|------|------|------|
| **自包含上下文** | Task 描述内包含所有必要背景 | Agent 不需要回看其他 Task |
| **显式文件列表** | 列出 "Files to Read First" | 精确控制 Context 加载量 |
| **有限范围** | 每个 Task 触及 ≤ 5 个文件 | 避免 Context 溢出 |
| **可验证产出** | 每个 Task 有明确验收标准 | lint 通过 / 测试通过 / 构建通过 |
| **无跨 Task 依赖** | 执行时不需要参考其他 Task 的中间产物 | 支持并行执行 |
| **顺序可选** | 标注依赖关系但尽量解耦 | 最大化并行度 |

**复杂度标注体系**:

| 等级 | 代号 | 特征 | 预估 Token | 推荐 LLM |
|------|------|------|-----------|----------|
| **Simple** | `S` | 改 ≤2 文件，逻辑直白，无副作用 | < 4K | 🟢 快速模型 (开源/轻量) |
| **Medium** | `M` | 改 3-5 文件，标准 CRUD / 组件创建 | 4K–16K | 🟡 标准模型 |
| **Large** | `L` | 跨模块，需要理解架构上下文 | 16K–64K | 🟠 高能力模型 |
| **XL** | `XL` | 架构级变更，涉及核心抽象 | > 64K | 🔴 顶级模型 + 人工审查 |

**复杂度评判标准**:

```yaml
complexity_scoring:
  S_indicators:
    - "仅修改配置文件或常量"
    - "字符串/文案替换"
    - "简单 Bug 修复（根因明确）"
    - "新增独立的工具函数（无外部依赖）"
    - "CSS/样式调整"

  M_indicators:
    - "新增独立组件 / 页面"
    - "标准 CRUD 接口实现"
    - "现有组件添加新 Props"
    - "数据库新增表/字段 + 对应 TypeScript 类型"
    - "新增单元测试"

  L_indicators:
    - "修改核心服务层（DataService / Store）"
    - "跨组件状态流变更"
    - "新增 Agent Tool（前端 + 后端）"
    - "重构现有抽象（保持接口兼容）"
    - "E2E 测试覆盖复杂用户流"

  XL_indicators:
    - "引入新的架构层（Provider 抽象 / 中间件）"
    - "核心数据流重构"
    - "跨 Edge Function + 前端的联动变更"
    - "安全模型变更（RLS / Auth 策略）"
    - "破坏性 API 变更（需要迁移计划）"
```

**任务拆解模板**:

```markdown
### Task [Epic]-[序号]: [任务标题]

**复杂度**: S / M / L / XL
**推荐 LLM**: 🟢快速 / 🟡标准 / 🟠高能力 / 🔴顶级
**预计影响文件数**: N
**前置依赖**: 无 / Task [Epic]-[X]

#### 背景上下文
(在此提供完成该 Task 所需的全部业务和技术背景，无需读取其他 Task)

#### Files to Read First
1. `path/to/file1.ts` — 需要理解的模块
2. `path/to/file2.ts` — 需要修改的文件

#### 执行步骤
1. 步骤描述
2. 步骤描述

#### 验收标准
- [ ] `npm run type-check` 通过
- [ ] `npm run lint:check` 无新增 error
- [ ] 相关单元测试通过
- [ ] (如有 UI) 手动验证视觉效果
```

### Phase ④ PLAN — 执行计划编排

将拆解后的 Task 编排为可执行的计划，考虑依赖关系和并行机会。

**依赖图构建**:

```
Task 依赖图示例:

  T1 (S) ─┐
           ├─▶ T4 (M) ─┐
  T2 (M) ─┘             ├─▶ T6 (L) ── T7 (M) ── ✅ Done
  T3 (S) ───▶ T5 (S) ──┘

并行组:
  Wave 1: [T1, T2, T3]      ← 可并行，3 个 SubAgent
  Wave 2: [T4, T5]          ← 可并行，2 个 SubAgent
  Wave 3: [T6]              ← 串行，1 个 SubAgent
  Wave 4: [T7]              ← 串行，1 个 SubAgent
```

**执行计划模板 (Epic Story)**:

```markdown
# Epic [ID]: [标题]

> 来源: [需求来源]
> 优先级: P[0-3]
> 总任务数: N
> 预计并行波次: M
> 预计总成本: $X (基于 LLM 路由)

## 成本预估

| 复杂度 | 任务数 | 单价系数 | 小计 |
|--------|--------|---------|------|
| S (🟢快速) | 3 | ×1 | 3 |
| M (🟡标准) | 2 | ×3 | 6 |
| L (🟠高能力) | 1 | ×8 | 8 |
| XL (🔴顶级) | 0 | ×20 | 0 |
| **合计** | **6** | | **17 单位** |

## 执行波次

### Wave 1 (并行)
| Task | 标题 | 复杂度 | LLM | 依赖 |
|------|------|--------|-----|------|
| T1 | ... | S | 🟢 | 无 |
| T2 | ... | M | 🟡 | 无 |
| T3 | ... | S | 🟢 | 无 |

### Wave 2 (并行)
| Task | 标题 | 复杂度 | LLM | 依赖 |
|------|------|--------|-----|------|
| T4 | ... | M | 🟡 | T1, T2 |
| T5 | ... | S | 🟢 | T3 |

### Wave 3 (串行)
| Task | 标题 | 复杂度 | LLM | 依赖 |
|------|------|--------|-----|------|
| T6 | ... | L | 🟠 | T4, T5 |

## 完成后动作
- [ ] 触发 swarm-ai-loop 内循环巡检
- [ ] 更新 docs/Epics.yaml
- [ ] 更新 AGENTS.md (如有新模块/工具)
```

### Phase ⑤ DISPATCH — 分发执行

根据计划将 Task 分发给 SubAgent 执行，实现混合 LLM 并行开发。

**LLM 路由策略**:

```yaml
llm_routing:
  # 简单任务 → 快速模型 (成本最低)
  S_tasks:
    model: "fast"
    subagent_type: "generalPurpose"
    max_parallel: 4
    instructions: |
      使用 fast 模型。Task 自包含，直接按照 Task 描述执行。
      完成后运行验收标准中的命令。

  # 中等任务 → 标准模型
  M_tasks:
    model: null  # 默认模型
    subagent_type: "generalPurpose"
    max_parallel: 3
    instructions: |
      按照 Task 描述执行。注意读取 Files to Read First。
      完成后运行完整验收标准。

  # 复杂任务 → 高能力模型
  L_tasks:
    model: null  # 使用最佳可用模型
    subagent_type: "generalPurpose"
    max_parallel: 2
    instructions: |
      复杂任务，需要深入理解架构上下文。
      先读取所有 Files to Read First，理解模块间关系。
      实现后运行全量质量检查: npm run ai:check

  # 超复杂任务 → 顶级模型 + 人工审查
  XL_tasks:
    model: null
    subagent_type: "generalPurpose"
    max_parallel: 1
    instructions: |
      架构级变更，必须谨慎执行。
      先阅读 docs/Architecture.md 全文。
      实现后运行 ./scripts/quality_check.sh
      标记需要人工审查的关键决策点。
```

**并行执行策略**:

```
Wave 执行流程:

Wave N 开始
  ├─ SubAgent-1 (Task A, 🟢fast)  ──┐
  ├─ SubAgent-2 (Task B, 🟡默认)   ──┤─ 等待全部完成
  └─ SubAgent-3 (Task C, 🟢fast)  ──┘
                                      │
                                      ▼
                               合并 + 冲突检测
                                      │
                                      ▼
                               Wave N+1 开始
```

**SubAgent 调用示例**:

```
Task 是 S 级 (简单任务):
  → 使用 model: "fast", subagent_type: "generalPurpose"
  → prompt 中包含完整 Task 描述 + Files to Read First

Task 是 M 级 (中等任务):
  → 使用默认模型, subagent_type: "generalPurpose"
  → prompt 中包含完整 Task 描述 + Files to Read First + 调研发现

Task 是 L 级 (复杂任务):
  → 使用默认模型, subagent_type: "generalPurpose"
  → prompt 中包含完整 Task 描述 + 架构上下文 + 调研发现

Task 是 XL 级 (超复杂任务):
  → 不使用 SubAgent，由主 Agent 亲自执行
  → 或拆分为更小的 L/M 级 Task
```

---

## 3) 与内循环的交接协议

```
外循环 (Side-Effort Loop)              内循环 (AI Loop)
────────────────────────              ──────────────────
① INTAKE: 需求接入                         │
② INVESTIGATE: 代码库调研                   │
③ DECOMPOSE: 任务拆解                      │
④ PLAN: 执行计划                           │
⑤ DISPATCH: 分发执行                       │
   ↓                                      │
全部 Task 完成 ──────────────────────▶ ① SCAN: 分析变更
                                      ② ASSESS: 质量评估
                                      ③ REPAIR: 修复/建议
                                      ④ ANCHOR: Git Tag
                                         │
修复/建议 ◀─────────────────────────── 质量报告
   ↓                                      │
更新 Epics.yaml                            │
归档 Epic 文档                             │
────────────── 循环结束 ──────────────────────
```

**交接触发条件**:

| 条件 | 交接动作 |
|------|---------|
| 全部 Task 完成 | 自动触发内循环 SCAN + ASSESS |
| 单个 Wave 完成 | 可选: 增量 SCAN 检测冲突 |
| 内循环发现回归 | 回传给外循环，创建新的 Bug 类型 Task |
| IHS 分数下降 | 外循环暂停新需求，优先处理内循环建议 |

---

## 4) Anti-Memory-Wall 设计原则

> 借鉴自 sideeffect-loop.md 的 Epic Story 设计模式。

| 原则 | 要求 | 量化指标 |
|------|------|---------|
| **自包含上下文** | Task 文件内包含所有必要背景 | 无跨 Task 引用 |
| **显式文件列表** | "Files to Read First" 精确列出 | 列表长度 ≤ 8 |
| **有限范围** | 每个 Task 触及少量文件 | ≤ 5 文件/Task |
| **增量检查点** | 每个 Task 有可验证产出 | 至少 1 条验收命令 |
| **无跨 Task 依赖** | 执行时不需参考其他 Task 中间产物 | 依赖仅限"完成状态" |
| **Context 预算** | 控制单 Task 所需 Context 总量 | S<4K, M<16K, L<64K |

**如何执行 Epic**:

1. 加载 Epic 计划文件
2. 按 Wave 顺序执行（同一 Wave 内的 Task 可并行）
3. 对于每个 Task:
   a. 读取 Task 描述（自包含上下文）
   b. 读取 "Files to Read First" 中的源文件
   c. 按步骤执行
   d. 运行验收标准
4. Wave 完成后检查是否有冲突
5. 全部 Wave 完成后触发内循环
6. **不要同时加载多个 Epic**

---

## 5) 成本优化模型

混合 LLM 策略的核心目标：**用最低成本完成同等质量的开发任务**。

**成本对比 (相对值)**:

| 模型层级 | 相对成本 | 适用任务 | 占比目标 |
|---------|---------|---------|---------|
| 🟢 快速模型 | ×1 | S 级任务 | 40–50% |
| 🟡 标准模型 | ×3 | M 级任务 | 30–35% |
| 🟠 高能力模型 | ×8 | L 级任务 | 15–20% |
| 🔴 顶级模型 | ×20 | XL 级任务 | < 5% |

**成本优化策略**:

```yaml
cost_optimization:
  # 策略 1: 最大化 S 级任务占比
  maximize_simple:
    description: "将 M 级任务进一步拆解为多个 S 级任务"
    example: |
      Before: M 级 "新增 Provider 选择页面"
      After:
        - S 级 "创建 ProviderSelector 组件骨架"
        - S 级 "添加 Provider 列表数据"
        - S 级 "实现选择交互逻辑"
        - S 级 "添加样式和响应式"

  # 策略 2: 避免不必要的 XL 级任务
  avoid_xl:
    description: "通过架构预设降低单任务复杂度"
    example: |
      Before: XL 级 "实现多 Provider 架构"
      After:
        - L 级 "定义 Provider 接口抽象"
        - M 级 "实现 Qwen Provider"
        - M 级 "实现 OpenAI Provider"
        - S 级 "注册新 Provider 到 Registry"

  # 策略 3: 并行最大化
  maximize_parallelism:
    description: "同一 Wave 内的任务尽量解耦"
    target: "每个 Wave ≥ 2 个可并行 Task"
```

---

## 6) 完整执行脚本

### 标准流程 (手动触发)

```bash
# ① INTAKE: 需求接入
# 在对话中描述需求，或指向 Epics.yaml 中的 backlog 条目

# ② INVESTIGATE: 代码库调研
# Agent 自动执行调研（搜索代码、读取架构文档）

# ③ DECOMPOSE: 任务拆解
# Agent 按照 Anti-Memory-Wall 原则拆解任务

# ④ PLAN: 生成 Epic Story 执行计划
# 输出结构化的 Task 列表 + Wave 编排

# ⑤ DISPATCH: 分发执行
# 按 Wave 调度 SubAgent 并行执行

# ⑥ 完成后触发内循环
npm run ai:check
# 或完整内循环: 参考 swarm-ai-loop 技能
```

### 快速模式 (仅拆解不执行)

适用于：先规划后人工审查，再决定是否执行。

```
触发词: "拆解 [需求描述]，只规划不执行"

输出:
  - 调研报告
  - 任务拆解清单（含复杂度标注）
  - 执行计划（含成本预估）
  - 不执行 DISPATCH 阶段
```

### 急速模式 (Bug 修复快速通道)

适用于：线上紧急 Bug，跳过完整规划流程。

```
触发词: "紧急修复 [Bug 描述]"

流程:
  ① INTAKE: 快速分类为 B 类
  ② INVESTIGATE: 定位 Bug 根因
  ③ DECOMPOSE: 通常为单个 S/M 级 Task
  ④ PLAN: 跳过（直接执行）
  ⑤ DISPATCH: 直接修复 + 验证
  ⑥ 触发内循环回归检测
```

---

## 7) 输出契约

每轮外循环必须产出：

| 产出物 | 格式 | 说明 |
|--------|------|------|
| 调研报告 | Markdown (内联在对话中) | 代码库现状 + 影响面分析 |
| 任务拆解清单 | Markdown 表格 | 每个 Task 含复杂度 + LLM 推荐 |
| 执行计划 | Epic Story 文档 | Wave 编排 + 成本预估 |
| 执行结果 | Task 完成状态表 | 每个 Task 的验收结果 |
| 内循环交接 | 触发 swarm-ai-loop | 确保变更质量 |

**质量门禁 (外循环出口)**:

| 条件 | 结果 |
|------|------|
| 全部 Task 验收通过 + 内循环 PASS | ✅ Epic 完成，归档 |
| Task 验收通过但内循环 WARN | ⚠️ Epic 完成，记录技术债 |
| 任一 Task 验收失败 | ❌ 回退，重新拆解或修复 |
| 内循环 BLOCK | ❌ 外循环暂停，优先修复 |

---

## 8) 最佳实践

### 拆解心法

```
一个好的 Task 应该让 AI Agent 在读完描述后就能"闭着眼睛"执行。

✅ 好的 Task: "在 src/lib/agent/providers/ 下创建 types.ts，
   定义 LLMProvider 接口，包含 name, chat, streamChat 三个方法。
   参考 sseClient.ts 中现有的请求格式。"

❌ 坏的 Task: "实现多 Provider 支持"
```

### 复杂度校准技巧

| 如果你发现... | 那么... |
|-------------|--------|
| S 级 Task 需要读 >3 个文件 | 可能是 M 级，重新评估 |
| M 级 Task 需要修改核心抽象 | 可能是 L 级，重新评估 |
| L 级 Task 可以拆成独立子任务 | 拆分为多个 M/S 级 |
| XL 级 Task 不可避免 | 由主 Agent 执行，不委派 SubAgent |

### 与现有工具链的集成

| 工具 | 集成方式 |
|------|---------|
| `docs/Epics.yaml` | 外循环完成后更新 Epic 状态 |
| `AGENTS.md` | 新增模块/工具后更新导航表 |
| `docs/Architecture.md` | 架构级变更后更新架构图 |
| `docs/IHS.md` | 内循环交接后自动更新 |
| `npm run ai:check` | 每个 Wave 完成后执行 |

### 成本复盘

每个 Epic 完成后，复盘实际 LLM 使用：

```markdown
## 📊 成本复盘: Epic [ID]

| 指标 | 预估 | 实际 | 偏差 |
|------|------|------|------|
| S 级任务数 | 3 | 4 | +1 (M→S 拆解) |
| M 级任务数 | 2 | 2 | 0 |
| L 级任务数 | 1 | 1 | 0 |
| 总成本单位 | 17 | 16 | -1 (节省 6%) |
| 并行波次 | 4 | 3 | -1 (优化依赖) |

### 经验教训
- T2 原定 M 级，实际可以用 S 级完成
- T6 的 L 级评估准确，需要完整架构上下文
```