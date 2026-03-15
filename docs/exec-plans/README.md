# Execution Plans

> 执行计划的生命周期管理。支持 **新需求调研 Plan → Epic Story 拆解 → 完成归档** 全流程。

## 生命周期

```
新需求/调研文档
    │
    ▼
docs/exec-plans/active/plan-*.md     ← 调研分析、改进建议
    │
    ▼ 拆解为可执行单元
docs/epics/next/epic-*.md            ← Epic Story（自包含上下文，解决记忆墙）
    │
    ▼ 全部完成
docs/exec-plans/completed/plan-*.md  ← 已完成的计划（含结果摘要）
docs/archive/epics/                  ← 已完成的 Epic（用于回溯）
```

## 目录结构

```
exec-plans/
├── README.md                    # 本文件
├── active/                      # 活跃计划（调研中/执行中）
│   └── plan-*.md
├── completed/                   # 已完成计划（含结果摘要）
│   └── plan-*.md
└── tech-debt-tracker.md         # 技术债务追踪（可选）
```

## 活跃计划

| 计划 | 主题 | 状态 | 创建时间 |
|------|------|------|---------|
| [improve-harness](./active/improve-harness.md) | 借鉴 OpenAI Harness Engineering 改进 | 🔵 拆解中 | 2026-02-24 |
| [improve-bench](./active/improve-bench.md) | 评估能力改进 | 🔵 拆解中 | 2026-02-22 |

## 已完成计划

| 计划 | 主题 | 完成时间 | Epic 数 |
|------|------|---------|---------|
| [plan-phases-0-9](./completed/plan-phases-0-9.md) | 核心实现（Phase 0–9） | 2026-02-21 | 51 |
| [plan-next](./completed/plan-next.md) | 下阶段改进（N1–N6） | 2026-02-21 | 6 |
| [plan-V3](./completed/plan-V3.md) | V3 执行监控 + 失败恢复 | 2026-02-23 | 3 |

## 计划文档规范

### 新需求调研 Plan

```markdown
# Plan: [标题]

> 创建时间：YYYY-MM-DD
> 状态：调研中 / 拆解中 / 已完成
> 来源：[触发这个计划的原因/参考]

## 背景分析
[问题是什么？为什么需要改进？]

## 改进建议
[具体的改进方案，按优先级排列]

## 实施路线图
[时间线和依赖关系]

## 拆解为 Epic Story
[完成后，记录拆解出的 Epic 列表和链接]
```

### Epic Story 设计原则（Anti-"Memory Wall"）

每个 Epic 必须满足：

| 原则 | 要求 |
|------|------|
| **自包含上下文** | Epic 文件内包含所有必要背景，无需读取其他 Epic |
| **显式文件列表** | "Files to Read First" 章节列出需要读取的源文件 |
| **有限范围** | 每个 Task 触及 ≤5 个文件，每个 Epic 总计 ≤15 个文件 |
| **增量检查点** | 每个 Task 有可验证的产出（测试通过、lint 通过） |
| **无跨 Epic 依赖** | 执行时不需要参考其他 Epic 的内容 |
| **顺序执行** | Task 按顺序编号，完成 N.1 再做 N.2 |

### 归档条件

计划满足以下条件时归档到 `completed/`：
1. 所有拆解出的 Epic Story 已完成
2. 验证测试通过
3. 在 completed 目录的文件头部添加完成摘要
