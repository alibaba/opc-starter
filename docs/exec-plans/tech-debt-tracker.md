# Technical Debt Tracker

> 跟踪已知技术债务。来源：AI Loop 迭代报告、代码审查、Epic 执行中发现的问题。
>
> 最后更新：2026-02-24

## 活跃技术债务

| # | 类别 | 描述 | 来源 | 优先级 |
|---|------|------|------|--------|
| 1 | 测试覆盖 | `src/mcp` 和 `src/integrations` 0% 覆盖 | R32 | P3 |
| 2 | 测试覆盖 | `core/agents` 模块覆盖率目标 70%+ | R41 | P3 |

## 长期 Epic 追踪

这些超出单轮迭代范围的大型改进项，由 `report.md` 中的 Epic 列表同步。

| # | Epic | 描述 | 来源 |
|---|------|------|------|
| 1 | 自动修复循环 | 测试失败→AI 修复→重新测试的闭环 | R44 |
| 2 | 代码生成准确性 | AI 生成代码的边界条件 bug，需 prompt 工程改进 | R44 |
| 3 | Agent 日志增强 | builder agent 日志为空，需增强 overlay prompts | R44 |
| 4 | 错误类型区分重试 | 区分 spawn 失败 vs 超时 vs 业务错误 | R44 |
| 5 | Consensus 集成 | ConsensusEngine 已实现，需在多后端环境下接入 | 长期 |

## 已解决的技术债务

→ 详见 [../report-archived.md](../report-archived.md)（R1–R46，110 项修复）
