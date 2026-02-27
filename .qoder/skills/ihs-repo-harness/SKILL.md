---
name: ihs-repo-harness
description: IHS（IDE Harness Score）仓库健康评估技能。用于衡量 AI Coding IDE 驾驭能力下的代码仓技术债变化趋势，输出 IHS.md 评测报告（代码腐化、测试信号、文档对齐、变好/变坏结论）。
---

# IHS Repo Harness

> 目标：借鉴 OpenAI Harness Engineering 的思路（约束 + 评测 + 回归），把 AI 快速开发带来的技术债"可视化、可量化、可追踪"。

---

## 1) 何时触发

当你需要回答以下问题时触发本技能：

- 当前仓库健康度是在变好还是变坏？
- 最近迭代是否引入了隐性技术债？
- 测试与文档是否跟上了代码变更速度？

推荐触发词：

- `运行 IHS 评估`
- `检查仓库是否变好还是变坏`
- `生成 IHS 报告`

---

## 2) 触发命令（标准）

在仓库根目录执行：

`python3 .claude/skills/ihs-repo-harness/scripts/generate_ihs_report.py --output docs/IHS.md`

可选参数：

- `--skip-runtime-checks`：跳过 `type-check / test / coverage`（仅静态分析）
- `--history-window <N>`：自定义文档对齐分析窗口（默认 40 commits）

---

## 3) 评估维度（IHS）

IHS 总分 = `代码腐化度(40%) + 测试信号(35%) + 文档对齐(25%)`

### A. 代码腐化度（Code Entropy）

关注点：

- `TODO/FIXME/HACK/XXX`
- `any`、`@ts-ignore/@ts-nocheck`
- `eslint-disable`
- 超大文件（>400 行）

### B. 测试信号（Harness Checks）

关注点：

- 测试文件/源码文件比
- `npm run type-check` 结果
- `npm run test` 结果
- `npm run coverage -- --reporter=json-summary` 结果与覆盖率摘要

### C. 文档对齐（Docs Alignment）

关注点：

- 关键文档是否存在（`AGENTS.md`、`docs/`、`README`、`SUPABASE_COOKBOOK`）
- 最近窗口内"代码提交 vs 文档提交"对齐率
- 文档新鲜度（<=120 天）

---

## 4) 输出契约

执行完成后必须产出：

1. 根目录报告：`docs/IHS.md`
2. 明确结论：
   - 仓库状态：`好 / 坏`
   - 趋势判断：`变好 / 变坏 / 持平`（对比 `HEAD~1`）
3. 可执行改进建议（按优先级排序）

---

## 5) 判定标准（默认）

- 总分 `>= 70`：状态判定为 **好**
- 总分 `< 70`：状态判定为 **坏**
- 与 `HEAD~1` 的静态趋势分对比：
  - `Δ > 1` => **变好**
  - `Δ < -1` => **变坏**
  - 其他 => **持平**

---

## 6) 推荐执行节奏

- 每次较大功能合并前执行 1 次
- 每周固定执行 1 次，持续追踪技术债趋势
- 在 CI 中可先使用 `--skip-runtime-checks` 快速出静态趋势，再按需执行全量检查
