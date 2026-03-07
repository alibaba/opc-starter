# 模板参考

> 本文件包含 AI Loop 工作流中使用的模板。SKILL.md 主文件会在需要时指引你来这里。

## Epic 模板

```markdown
# Epic HX: [标题]

> **Priority**: Phase N (Week X–Y)
> **Status**: 🟡 Ready
> **Source**: [来源报告 + 轮次]
> **Depends on**: [依赖的 Epic，无则写"无"]

## Objective

[1-3 句话描述目标]

## Files to Read First

- `src/path/to/file.ts` — [用途]

## Tasks

### HX.1: [任务标题]

**Scope**: `src/path/to/file.ts`, ...
**Touches**: N files

**Description**: [具体描述]

**Implementation**:
1. [步骤]

**Acceptance Criteria**:
- [ ] [可验证的标准]

## Verification

\```bash
npm run typecheck && npm run test
bash .cursor/skills/swarm-ai-loop/scripts/health-check.sh
\```
```

---

## report.md 格式参考

```markdown
# Swarm CLI 调试报告

> 生成时间：YYYY-MM-DD（第 N 轮）
> 历史归档：[docs/report-archived.md](docs/report-archived.md)

## 执行摘要
[1-2 句话描述本轮重点]

## 上轮结果（RN-1）
| 测试项 | 状态 | 说明 |
|--------|------|------|

## 当前规划（RN）
| # | 工作项 | 状态 |
|---|--------|------|

## 遗留问题与改进建议
| # | 问题 | 优先级 | age | 状态 |
|---|------|--------|-----|------|

### 长期 Epic 追踪
| Epic | 主题 | 状态 | 来源 |
|------|------|------|------|

## 迭代健康度趋势
| 轮次 | IHS | 测试稳定性 | Bug 趋势 | 回归 | 债务趋势 | 判定 |
|------|-----|-----------|----------|------|---------|------|

### 下轮建议关注点（结构化）
| # | 关注点 | 类型 | age | 来源 |
|---|--------|------|-----|------|
```
