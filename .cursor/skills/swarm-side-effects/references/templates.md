# Swarm Side-Effort Loop — 模板参考

> 外循环各阶段的产出模板。按需读取，不要一次性全部加载。

---

## 需求接入模板（Phase ① INTAKE）

```yaml
intake:
  id: "SEL-001"                    # Side-Effort Loop 编号
  type: "F"                        # F/B/R/U/D (Feature/Bug/Refactor/Upgrade/Docs)
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

**需求类型速查**:

| 类型 | 代号 | 特征 | 典型复杂度 |
|------|------|------|-----------|
| 新功能 (Feature) | `F` | 新增业务能力，用户可感知 | M–XL |
| 缺陷修复 (Bug) | `B` | 现有功能异常 | S–L |
| 重构改造 (Refactor) | `R` | 改善代码质量，不改变外部行为 | M–XL |
| 技术升级 (Upgrade) | `U` | 依赖升级、新技术引入 | L–XL |
| 文档补全 (Docs) | `D` | 文档缺失或过期 | S–M |

---

## 调研报告模板（Phase ② INVESTIGATE）

> 由 `codebase-investigate.sh` 输出辅助填充

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

---

## 任务拆解模板（Phase ③ DECOMPOSE）

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

---

## 执行计划模板（Phase ④ PLAN）

```markdown
# Epic [ID]: [标题]

> 来源: [需求来源]
> 优先级: P[0-3]
> 总任务数: N
> 预计并行波次: M

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

---

## 复杂度判定速查

| 等级 | 代号 | 特征 | Context 预算 | 推荐 LLM |
|------|------|------|-------------|----------|
| Simple | `S` | ≤2 文件，逻辑直白 | < 4K tokens | 🟢 快速模型 |
| Medium | `M` | 3-5 文件，标准 CRUD | 4K–16K | 🟡 标准模型 |
| Large | `L` | 跨模块，需架构上下文 | 16K–64K | 🟠 高能力模型 |
| XL | `XL` | 架构级变更，核心抽象 | > 64K | 🔴 顶级 + 人工审查 |

**复杂度信号**:

- S 信号: 仅改配置/常量、字符串替换、简单 Bug (根因明确)、独立工具函数、CSS 调整
- M 信号: 新增独立组件/页面、标准 CRUD、新 Props、新表/字段 + TS 类型、新单元测试
- L 信号: 修改核心服务层、跨组件状态流、新 Agent Tool (前端+后端)、重构现有抽象
- XL 信号: 新架构层、核心数据流重构、跨 Edge Function + 前端联动、安全模型变更

---

## 成本复盘模板

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

---

## LLM 路由策略

```yaml
llm_routing:
  S_tasks:
    model: "fast"
    subagent_type: "generalPurpose"
    max_parallel: 4
    prompt_pattern: "Task 自包含，直接按照 Task 描述执行。完成后运行验收命令。"

  M_tasks:
    model: null  # 默认模型
    subagent_type: "generalPurpose"
    max_parallel: 3
    prompt_pattern: "按 Task 描述执行。读取 Files to Read First。完成后运行完整验收。"

  L_tasks:
    model: null
    subagent_type: "generalPurpose"
    max_parallel: 2
    prompt_pattern: "先读取所有 Files to Read First + 架构文档。实现后运行 npm run ai:check。"

  XL_tasks:
    model: null
    subagent_type: "generalPurpose"
    max_parallel: 1
    prompt_pattern: "先读 docs/Architecture.md。实现后运行 ./scripts/quality_check.sh。标记需人工审查的决策。"
    alternative: "拆分为更小的 L/M 级 Task"
```
