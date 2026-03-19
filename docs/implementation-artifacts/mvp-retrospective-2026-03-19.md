# MVP Retrospective - Epic 29-34

> 日期: 2026-03-19
> 范围: Skills Hub MVP Phase 1
> 参与者: opc-starter (Project Lead), Alice (PO), Bob (SM), Charlie (Dev), Dana (QA), Elena (Dev)

---

## Epic 概览

| Epic | 名称 | Stories | 状态 |
|------|------|---------|------|
| Epic-29 | 数据库基础设施 | 4 | done |
| Epic-30 | Skill 发现与搜索 | 6 | done |
| Epic-31 | Skill 详情与下载 | 5 | done |
| Epic-32 | Skill 发布系统 | 6 | done |
| Epic-33 | 社交互动 | 4 | done |
| Epic-34 | 用户中心 | 4 | done |
| **合计** | | **29** | **100%** |

---

## 做得好的

### 1. MCP Server + Migration 机制

- 将 status/checksum 字段内置到 baseline
- 创建标准 migration 模板（pending → applied）
- 禁止 Node 脚本直接操作数据库
- 新环境初始化即具备完整 tracking 能力

### 2. Edge Function 权限分离

- publish: ANON_KEY + JWT（用户级，RLS 生效）
- download: SERVICE_ROLE_KEY（绕过 RLS 记录日志）

### 3. 交付完整性

- 6/6 Epic 100% 完成
- 29/29 Stories 全部 done
- 7 套 E2E 测试覆盖核心流程

---

## 需要改进的

### P0 - Post-MVP 开始前必须完成

| # | 改进项 | 负责人 | 状态 |
|---|--------|--------|------|
| 1 | Story 模板升级（含测试任务） | SM | ✅ 已写入 memory |
| 2 | 测试责任分层写入 AGENTS.md | SM | ✅ 已写入 memory |
| 3 | 测试边界指南 | Dev | ✅ 已写入 memory |

### P1 - 第一个 Sprint 内完成

| # | 改进项 | 负责人 | 状态 |
|---|--------|--------|------|
| 4 | Design Tokens 文档 | PO + Dev | 待办 |
| 5 | 上传/下载封装优化 | Dev | 待办 |
| 6 | 测试环境隔离策略 | QA | 待办 |

### P2 - 后续迭代

| # | 改进项 | 负责人 | 状态 |
|---|--------|--------|------|
| 7 | Migration 顺序自动化 | Dev | 待办 |

---

## 关键决策

| 决策 | 选择 | 理由 |
|------|------|------|
| Migration tracking 内置到 baseline | 合并到 baseline | 新环境初始化即具备完整能力 |
| 禁止 Node 脚本执行 SQL | 统一走 MCP Server | 安全可控，审计可追溯 |
| 测试分层 | Dev 单元测试 + QA 集成测试 | 责任清晰，效率更高 |

---

## 建立的机制

### 项目记忆库

```
docs/project-memory/
├── lessons-learned/
│   └── mvp-retrospective-insights.md
├── best-practices/
│   ├── story-template-v2.md
│   └── testing-strategy.md
└── memory-index.md
```

### 运作方式

1. 每次 Retrospective 后：SM 将关键洞察归类存入 memory
2. Story 开始前：Dev/SM 查阅相关主题的 lessons-learned
3. PR Review 时：Reviewer 对照 common-pitfalls 检查
4. 新成员入职：通过 memory-index 快速了解项目背景

---

## 下一步

1. 将测试责任分层同步到 `AGENTS.md`
2. 开始 Post-MVP 开发（Epic 35-37）
3. 第一个 Sprint 内完成 P1 改进项

---

## 附录：讨论记录

**opc-starter (Project Lead)**:
- "通过 MCP Server 的 schema 变更机制不错"
- "测试应该伴随开发不断补充，而不是需要我的提醒，应该是测试驱动的开发模式"
- "单元测试应该在 Dev 阶段就应该做的，集成测试应该阶段性的交给 QA 来做"
- "先基于这个 review 改进我们的机制，再继续开发，我们要打好基础"

**Charlie (Senior Dev)**:
- "Story 模板需要调整，添加测试任务"
- "测试边界需要明确，UI 组件测交互，业务组件测逻辑"

**Dana (QA Engineer)**:
- "分层测试是好思路，Dev 单元测试，QA 集成测试"
