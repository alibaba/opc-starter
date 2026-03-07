# Swarm CLI — Epic Stories

> Epic Story 是 Swarm 的核心开发单元。每个 Epic 自包含上下文，解决 AI Coding IDE 的"记忆墙"问题。
>
> **生命周期**：`exec-plans/active/` (调研) → `epics/` (执行) → `archive/epics/` (归档)

---

## 活跃 Epic（执行中）

> 当前无活跃 Epic。

---

## 已完成 Epic

> 全部 Epic 已归档至 [docs/archive/epics/](docs/archive/epics/)。来源映射表已归档至 [docs/archive/epic-source-mappings.md](docs/archive/epic-source-mappings.md)。

| 系列 | 主题 | Epic 数 | 完成时间 |
|------|------|---------|---------|
| Phase 0–9, N, V3 | 核心实现 + 稳定性 + 执行监控 | 60 | 2026-02-23 |
| H1–H13 | Harness Engineering 全系列 | 13 | 2026-02-28 |
| B1–B4 | Bench 评估 + 自治迭代 + 约束发现 + 模型路由 | 4 | 2026-03-01 |
| C1–C5 | Hive 蜂巢架构 (Cell/Stream/Pheromone/Checkpoint/Wax) | 5 | 2026-03-02 |
| Q1–Q5 | Queen Bee 执行可靠性 + 编排精度 | 25 | 2026-03-03 |
| G10–G12 | 蜂群架构重构 (Backend 解耦 → Queen 独立化 → 事件驱动) | 20 | 2026-03-03 |
| G13 | Qwen Code Backend 完整集成 (yolo/model/session/parser/doctor) | 6 | 2026-03-04 |
| G14 | Backend 完全解耦：消除 SDK 层 Gemini 硬编码 | 7 | 2026-03-04 |
| G15 | Provider Adapter Architecture: 彻底消除 Gemini 强依赖 (OpenAI-Compatible/Per-Role Models/Config) | 7 | 2026-03-04 |
| G16 | Unified Provider Architecture: 简化 Backend 为单一 Provider | 8 | 2026-03-04 |
| G16+ | Queen Bee 智能蜂群调度 + Provider 架构收尾 (蜂群规模控制/Per-Role Model/Legacy 清理) | 6 | 2026-03-04 |
| G17 | Execution Pipeline Repair — Builder 启动断裂 + LLM 复杂度评估 + 只读快速路径 | 6 | 2026-03-04 |
| G18 | Runtime Cleanup — Gemini 残留依赖清除 + tmux 硬依赖降级 + Pipeline 韧性 | 6 | 2026-03-05 |
| G19 | Scout 只读模式强化 + 蜂群信息流动修复 | 6 | 2026-03-05 |
| G20 | 非 Autopilot 命令可用性保障 + Per-Role 多模型配置 | 6 | 2026-03-05 |
| G21 | Planning Intelligence Repair — Task Graph 过度生成 + Read-Only 路径断裂 + Scout 产出浪费 | 6 | 2026-03-05 |
| G22 | OpenCode Provider 完整集成 (CLI Parser/Executor/Provider/Registry/Doctor/Tests/Docs) | 7 | 2026-03-05 |
| G23 | OpenCode 执行可观测性 + 性能优化 (流式输出/心跳/冷启动/超时/Triage 快速路径/Server 模式) | 6 | 2026-03-05 |

---

## Anti-"Memory Wall" 设计原则

每个 Epic 必须满足以下原则，确保 AI Agent 在有限 Context Window 内高效执行：

| 原则 | 要求 |
|------|------|
| **自包含上下文** | Epic 文件内包含所有必要背景，无需读取其他 Epic |
| **显式文件列表** | "Files to Read First" 章节列出需要读取的源文件 |
| **有限范围** | 每个 Task 触及 ≤5 个文件，每个 Epic 总计 ≤15 个文件 |
| **增量检查点** | 每个 Task 有可验证的产出（测试通过、lint 通过） |
| **无跨 Epic 依赖** | 执行时不需要参考其他 Epic 的内容 |
| **顺序执行** | Task 按顺序编号，完成 N.1 再做 N.2 |

### 如何执行 Epic

1. 加载 Epic 文件
2. 读取 "Files to Read First" 中列出的源文件
3. 按顺序执行 Task（N.1 → N.2 → ...）
4. 每个 Task 完成后勾选验收标准
5. 完成全部 Task 后运行验证清单
6. **不要同时加载多个 Epic**

---

## 相关文档

- [docs/archive/epic-source-mappings.md](docs/archive/epic-source-mappings.md) — 已完成 Epic 来源映射表（历史参考）
- [docs/exec-plans/README.md](docs/exec-plans/README.md) — 执行计划生命周期管理
- [docs/Architecture.md](docs/Architecture.md) — 模块分层 + 依赖方向
- [./AGENTS.md](./AGENTS.md) — 项目导航入口
