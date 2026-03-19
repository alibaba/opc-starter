# Project Memory Index

> 项目记忆库总索引
> 更新日期: 2026-03-19

---

## 快速检索

### 按主题

| 主题 | 文档 | 关键词 |
|------|------|--------|
| 数据库迁移 | [lessons-learned/mvp-retrospective-insights.md](./lessons-learned/mvp-retrospective-insights.md) | migration, schema, MCP Server, baseline |
| 测试策略 | [best-practices/testing-strategy.md](./best-practices/testing-strategy.md) | TDD, 单元测试, 集成测试, 覆盖率 |
| Story 模板 | [best-practices/story-template-v2.md](./best-practices/story-template-v2.md) | 模板, Done 定义, 测试任务 |
| MVP 复盘 | [lessons-learned/mvp-retrospective-insights.md](./lessons-learned/mvp-retrospective-insights.md) | Epic 29-34, 交付, 改进项 |

### 按问题

| 问题 | 解决方案 | 文档 |
|------|----------|------|
| Migration 状态没被记录 | 内置 tracking 到 baseline，禁止 Node 脚本 | [mvp-retrospective-insights.md](./lessons-learned/mvp-retrospective-insights.md) |
| 测试补在开发后 | Story 模板升级，Dev 负责单元测试 | [story-template-v2.md](./best-practices/story-template-v2.md) |
| 不知道测什么 | 测试边界指南 | [testing-strategy.md](./best-practices/testing-strategy.md) |
| UI 组件风格不统一 | Design Tokens（待创建） | - |

---

## 目录结构

```
docs/project-memory/
├── lessons-learned/           # 经验教训（按主题分类）
│   └── mvp-retrospective-insights.md
├── common-pitfalls/           # 常见陷阱（防重复踩坑）
│   └── (待补充)
├── best-practices/            # 最佳实践
│   ├── story-template-v2.md
│   └── testing-strategy.md
└── memory-index.md            # 本文件
```

---

## 使用指南

### Story 开始前

1. 查阅 `lessons-learned/` 中相关主题的经验
2. 参考 `best-practices/story-template-v2.md` 确保格式正确
3. 参考 `best-practices/testing-strategy.md` 确定测试范围

### PR Review 时

1. 检查 `common-pitfalls/` 中的风险点
2. 确认测试覆盖率达标

### Retrospective 后

1. 将关键洞察归类写入 `lessons-learned/`
2. 如有新的陷阱，写入 `common-pitfalls/`
3. 如有新的最佳实践，写入 `best-practices/`
4. 更新本索引文件

---

## 待补充

- [ ] `common-pitfalls/migration-order.md` - Migration 顺序陷阱
- [ ] `common-pitfalls/test-environment-pollution.md` - 测试环境污染
- [ ] `best-practices/design-tokens.md` - UI 规范
- [ ] `best-practices/edge-function-security.md` - Edge Function 安全模式

---

## 变更历史

| 日期 | 变更 |
|------|------|
| 2026-03-19 | 初始创建，包含 MVP 复盘洞察、Story 模板 v2、测试策略 |
