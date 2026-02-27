# IHS 仓库驾驭评测报告

- 生成时间: 2026-02-26 09:09:25 UTC
- 分析分支: `develop`
- 当前提交: `749ece0`
- 评测框架: IHS (IDE Harness Score)，参考 OpenAI Harness Engineering 的“约束 + 评测 + 回归”闭环。
- 评测输出: `docs/IHS.md`

## 1) 总览结论

- **IHS 总分**: **24.2/100**
- **仓库状态**: **高风险（坏）**
- **趋势判断（对比 HEAD~1）**: **持平**
- 静态趋势分: 当前 `0.0` vs 上一提交 `0.0` (Δ `0.0`)

| 维度 | 分数 | 权重 |
| --- | ---: | ---: |
| 代码腐化度 | 0.0 | 40% |
| 测试信号 | 30.0 | 35% |
| 文档对齐 | 55.0 | 25% |

## 2) 代码腐化度（Code Entropy）

- 源码文件数: `0`
- 源码有效行: `0`
- 债务标记（TODO/FIXME/HACK/XXX）: `0`
- `any` 使用计数: `0`
- `@ts-ignore/@ts-nocheck` 计数: `0`
- `eslint-disable` 计数: `0`
- 超大文件（>400 行）: `0`

## 3) 测试信号（Harness Checks）

- 测试文件数: `0`
- 测试/源码比: `0.0`
- 覆盖率摘要: 不可用

| 检查项 | 命令 | 结果 | 耗时(s) |
| --- | --- | --- | ---: |
| Type Check | `-` | `skipped` | - |
| Unit Test | `-` | `skipped` | - |
| Coverage | `-` | `skipped` | - |

## 4) 文档对齐（Docs Alignment）

- 文档存在率: `0/6`
- 近历史窗口文档对齐率: `3/1` = `3.0`
- 文档新鲜度（<=120 天）: `0/0`

## 5) 技术债结论（变好/变坏）

- 最终判断: **坏**
- 趋势判断: **持平**
- 判定规则: 若总体分 >= 70 则状态为“好”，否则为“坏”；趋势按静态趋势分对比 HEAD~1。

## 6) 改进优先级（Next Actions）

1. 降低 `any` 与 `eslint-disable`：把高风险类型豁免收敛到网关层。
2. 提升测试/源码比到 >= 0.35，新增测试优先覆盖核心服务与 Agent Tool。
3. 每次核心代码变更同步更新 `docs/` 与 `AGENTS.md`，把文档对齐率拉高到 >= 0.8。
4. 维持 type-check + unit-test + coverage 的持续门禁，避免“先上车后补票”。

## 7) 原始数据快照

```json
{
  "scores": {
    "overall": 24.2,
    "corrosion": 0.0,
    "testing": 30.0,
    "docs": 55.0,
    "static_current": 0.0,
    "static_previous": 0.0,
    "trend_delta": 0.0,
    "trend": "持平"
  },
  "metrics": {
    "source_files": 0,
    "test_files": 0,
    "source_loc": 0,
    "debt_markers": 0,
    "any_usage": 0,
    "ts_ignore": 0,
    "eslint_disable": 0,
    "large_files": 0,
    "doc_files_present": 0
  },
  "doc_alignment": {
    "code_commits": 1,
    "docs_commits": 3,
    "ratio": 3.0
  },
  "doc_freshness": {
    "present_docs": 0,
    "fresh_docs": 0,
    "fresh_ratio": 1.0,
    "days_old": {}
  },
  "runtime": {
    "type_check": {
      "status": "skipped"
    },
    "unit_test": {
      "status": "skipped"
    },
    "coverage": {
      "status": "skipped"
    },
    "coverage_pct": null,
    "commands": []
  }
}
```
