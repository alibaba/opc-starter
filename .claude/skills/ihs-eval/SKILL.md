---
name: ihs-eval
description: Infrastructure Health Score 评估技能。在 AI 快速开发时代，系统性评估代码仓库的健康状态——包括代码腐化程度、测试覆盖率、文档对齐度、构建健康度、Agent 驾驭能力等维度，生成量化评测报告 IHS.md。灵感源自 OpenAI Harness Engineering 理念。
---

# IHS — Infrastructure Health Score 评估技能

> **理念**: 在 AI Agent 驱动开发的时代，人类从"写代码"转变为"驾驭 Agent 写代码"（Harness Engineering）。代码仓库的健康度决定了 Agent 的生产力上限。IHS 技能提供一套系统化的量化评估框架，让团队在每次迭代后能回答一个核心问题：**这个仓库是在变"好"还是变"坏"？**

---

## 🎯 核心概念

### 什么是 IHS？

**Infrastructure Health Score (IHS)** 是一个 0-100 的综合评分体系，衡量代码仓库在 AI 驱动开发模式下的"可驾驭程度"。

```
IHS = Σ(维度权重 × 维度得分)

评分等级:
  🟢 A  (85-100)  — 优秀：Agent 高效产出，技术债最小化
  🟡 B  (70-84)   — 良好：大部分指标健康，有改进空间
  🟠 C  (55-69)   — 警告：技术债积累明显，需要重点关注
  🔴 D  (0-54)    — 危险：严重腐化，Agent 产出质量不可控
```

### 为什么需要 IHS？

参考 OpenAI [Harness Engineering](https://openai.com/index/harness-engineering/) 的核心洞察：

1. **Agent 产出质量取决于仓库的 Scaffolding 质量** — 类型系统、测试覆盖、Lint 规则等构成了 Agent 工作的"护栏"
2. **没有反馈循环的 Agent 开发是危险的** — IHS 提供持续的量化反馈
3. **人类的角色是搭建脚手架 (Scaffolding)** — IHS 评估脚手架的完善程度
4. **技术债在 AI 加速下指数增长** — 传统项目的线性退化在 AI 时代变成指数退化

---

## 📊 评估维度 (7 大维度)

### D1. 代码腐化度 (Code Rot Index) — 权重 20%

衡量代码的整体退化程度。

| 指标 | 满分条件 | 扣分规则 |
|------|----------|----------|
| TypeScript 类型检查 | 0 错误 | 每个错误 -2 分 |
| ESLint 违规 | 0 错误 | 每个错误 -1 分，每个警告 -0.5 分 |
| `any` 类型使用 | 0 处 | 每处 -2 分 |
| TODO/FIXME/HACK | 0 处 | 每处 -1 分 |
| 遗留 console.log | 0 处 (非调试用) | 每 10 处 -3 分 |
| 超长文件 (>300 行) | 0 个源文件 | 每个 -2 分 |
| 空 catch 块 | 0 处 | 每处 -5 分 |
| Tailwind v3 语法残留 | 0 处 | 每处 -3 分 |

```bash
# 自动化检测命令
npx tsc --noEmit 2>&1 | tail -5
npx eslint src/ --no-fix 2>&1 | tail -10
rg ": any\b|<any>|as any" src/ --glob "*.ts" --glob "*.tsx" --glob "!*.test.*" -c
rg "TODO|FIXME|HACK|XXX" src/ --glob "*.ts" --glob "*.tsx" -c
rg "console\.(log|warn|error|debug)" src/ --glob "*.ts" --glob "*.tsx" --glob "!*.test.*" -c
```

### D2. 测试覆盖度 (Test Coverage Index) — 权重 25%

测试是 Agent 最重要的护栏。覆盖率直接决定 Agent 产出代码的安全性。

| 指标 | 满分条件 | 扣分规则 |
|------|----------|----------|
| 行覆盖率 | ≥80% | 每低 1% 扣 1 分 |
| 分支覆盖率 | ≥80% | 每低 1% 扣 1.5 分 |
| 函数覆盖率 | ≥80% | 每低 1% 扣 1 分 |
| 测试文件/源文件比 | ≥0.3 | 每低 0.05 扣 3 分 |
| 核心模块测试覆盖 | stores/hooks/services 100% | 每个未覆盖模块 -3 分 |
| E2E 测试覆盖 | 核心用户流程全覆盖 | 每个未覆盖流程 -5 分 |
| 测试全部通过 | 0 失败 | 每个失败 -5 分 |

```bash
# 自动化检测命令
npx vitest run --coverage
npx vitest run --reporter=verbose
find cypress -name "*.cy.*" | wc -l
```

### D3. 文档对齐度 (Documentation Alignment) — 权重 15%

文档是 Agent 理解项目上下文的关键。过时的文档比没有文档更危险。

| 指标 | 满分条件 | 扣分规则 |
|------|----------|----------|
| AGENTS.md 鲜度 | 30 天内更新 | 每超 30 天 -10 分 |
| Architecture.md 鲜度 | 源码变更后 7 天内同步 | 过期 -15 分 |
| SKILL.md 鲜度 | 技术栈变更后同步 | 过期 -10 分 |
| 内容一致性 | 文档描述与代码实际一致 | 每处不一致 -5 分 |
| SQL 集中管理 | setup.sql 覆盖所有表 | 存在游离 SQL -10 分 |
| API 文档覆盖 | Edge Functions 有文档 | 每个未文档化 -5 分 |

```bash
# 文档鲜度检测
git log -1 --format="%ci" -- AGENTS.md
git log -1 --format="%ci" -- docs/Architecture.md
git log -1 --format="%ci" -- .claude/skills/auto-develop/SKILL.md
```

### D4. 构建健康度 (Build Health) — 权重 15%

构建是最基本的质量门禁。

| 指标 | 满分条件 | 扣分规则 |
|------|----------|----------|
| 构建成功 | 0 错误 | 失败直接 0 分 |
| 构建警告 | 0 警告 | 每个警告 -2 分 |
| 主包体积 | <500KB (gzip) | 每超 100KB -5 分 |
| 代码分割 | 无 >600KB 单 chunk | 每个超限 chunk -5 分 |
| 依赖安全 | 0 高危漏洞 | 每个高危 -10 分 |
| 依赖数量 | prod <40 | 每超 5 个 -3 分 |
| CI/CD 流水线 | 完整覆盖 lint/test/build | 每个缺失环节 -10 分 |

```bash
# 自动化检测命令
npm run build 2>&1 | tail -20
npm audit
ls .github/workflows/
```

### D5. Agent 驾驭能力 (Agent Harness Score) — 权重 15%

评估仓库对 AI Coding Agent 的"友好程度"。

| 指标 | 满分条件 | 扣分规则 |
|------|----------|----------|
| AGENTS.md 完整性 | 包含技术栈/规范/禁止项/命令 | 每个缺失章节 -5 分 |
| SKILL 定义 | 开发技能有明确触发规则 | 无 SKILL -20 分 |
| MSW Mock 覆盖 | 所有 API 可离线测试 | 每个未 Mock API -3 分 |
| TypeScript strict | 开启 strict 模式 | 未开启 -20 分 |
| 语义化颜色 | 使用 CSS 变量而非硬编码 | 硬编码颜色 -1/处 |
| 测试用户凭证规范 | fixture 管理而非环境变量 | 违反 -10 分 |
| 错误边界覆盖 | 核心路由有 ErrorBoundary | 缺失 -5/处 |

```bash
# Agent 友好度检测
cat AGENTS.md | wc -l  # AGENTS.md 内容量
ls .claude/skills/     # SKILL 定义
ls src/mocks/handlers/ # MSW Mock 覆盖
rg "strict" tsconfig.app.json
```

### D6. 架构可维护性 (Architecture Maintainability) — 权重 5%

| 指标 | 满分条件 | 扣分规则 |
|------|----------|----------|
| 关注点分离 | 页面/组件/服务/类型分层清晰 | 违反 -5/处 |
| 目录结构一致性 | 遵循 SKILL 定义的结构 | 违反 -3/处 |
| Barrel exports | index.ts 聚合导出 | 缺失 -2/处 |
| 可访问性 | aria-/role 属性覆盖 | 覆盖率<20% -10 分 |
| 暗色模式 | dark: modifier 覆盖 | 未覆盖 -5 分 |

### D7. 开发体验 (Developer Experience) — 权重 5%

| 指标 | 满分条件 | 扣分规则 |
|------|----------|----------|
| 热重载 | Vite HMR 正常 | 不可用 -20 分 |
| 一键质量检查 | 有 quality_check 脚本 | 无 -10 分 |
| dev:test 模式 | MSW 模式可用 | 不可用 -15 分 |
| 测试 watch 模式 | vitest watch 可用 | 不可用 -10 分 |

---

## 🔄 执行流程

### 触发条件

当用户提及以下关键词时自动触发：

- `IHS`、`健康度`、`评估`、`评测`、`代码质量`、`技术债`
- `code health`、`code quality`、`technical debt`
- `harness`、`驾驭`

### 执行步骤

```yaml
step_1_collect:
  description: "收集原始数据"
  commands:
    - npx tsc --noEmit
    - npx eslint src/ --no-fix
    - npx vitest run --coverage
    - npm run build
    - npm audit
    - "rg patterns for code smells"
    - "git log for doc freshness"

step_2_score:
  description: "按维度打分"
  method: "逐维度对照评分标准"

step_3_report:
  description: "生成 IHS.md 报告"
  output: "docs/IHS.md"
  format: "Markdown with tables and trend indicators"

step_4_recommend:
  description: "生成改进建议"
  priority: "ROI 最高的改进项排前"
```

---

## 📋 报告模板

报告应包含以下章节：

1. **总分与等级** — 醒目的综合评分
2. **维度雷达图** (文字版) — 各维度得分一览
3. **各维度详情** — 具体指标、实际值、得分
4. **趋势判断** — 与上次评估对比（如有）
5. **Top 5 改进建议** — 按 ROI 排序
6. **Agent 驾驭力总结** — 对 AI Coding 的适配程度评价

---

## 📚 参考

- [OpenAI: Harness Engineering](https://openai.com/index/harness-engineering/) — 核心理念来源
- [OpenAI: Building an AI-Native Engineering Team](https://developers.openai.com/codex/guides/build-ai-native-engineering-team/)
- AGENTS.md — 项目 AI Coding 规范
- `.claude/skills/auto-develop/SKILL.md` — 开发技能定义
