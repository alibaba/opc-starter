---
name: ai-friendly-audit
description: 代码仓库 AI 亲和度审计工具。此技能用于检查给定的代码仓库对 AI Coding 工具的友好程度，生成详细的分析报告和改进建议。当用户需要评估代码仓库是否适合 AI 辅助开发、希望提升仓库的 AI 可操作性、或准备引入 AI Coding 工具前进行仓库评估时，应使用此技能。
---

# AI Friendly Audit（AI 亲和度审计）

## 概述

此技能用于系统性地评估代码仓库对 AI Coding 工具的友好程度。通过检查多个维度（环境、架构、测试、文档等），生成量化评分和改进建议报告，帮助团队优化代码仓库以获得更好的 AI 协作体验。

## 核心理念

AI 亲和的代码仓库应具备以下特质：

1. **信任链闭环** - AI 做出的修改可被快速验证（测试、类型检查、lint）
2. **最小可运行环境** - 降低环境依赖，便于 AI 理解和复现问题
3. **规范驱动开发（SDD）** - 文档即规范，AI 可据此生成和验证代码
4. **上下文窗口友好** - 单文件可被完整读取，代码粒度适合 AI 处理
5. **代码自述性** - 文件和函数自带足够上下文，减少 AI 跳转查阅

## 审计工作流程

### Phase 1: 环境探索

首先收集仓库的基本信息：

```bash
# 运行自动化检查脚本获取基础数据
python3 scripts/repo_scan.py <repo_path>
```

脚本会检测：
- 项目类型（前端/后端/全栈/库）
- 语言和框架
- 包管理器和依赖锁定情况
- 现有配置文件

### Phase 2: 逐维度检查

参考 `references/checklist.md` 进行详细检查，涵盖以下 **12 个维度**：

| 维度 | 权重 | 关键检查点 |
|------|------|------------|
| 1. 最小可运行环境 | 12% | 一键启动、Mock 屏蔽第三方依赖、环境变量模板 |
| 2. 前后端解耦 | 8% | Mock 服务、API 契约、独立调试能力 |
| 3. 类型系统 | 12% | TypeScript/类型注解、严格模式配置 |
| 4. 单元测试 | 12% | 测试框架、覆盖率、主路径覆盖 |
| 5. 端到端测试 | 8% | E2E 框架、关键流程覆盖 |
| 6. 文档完备性 | 10% | README、架构文档、API 文档 |
| 7. 代码规范 | 8% | Linting、格式化、提交规范 |
| 8. 模块化架构 | 6% | 低耦合、单一职责、清晰边界 |
| 9. 错误处理 | 4% | 统一错误格式、可追踪性 |
| 10. 上下文窗口友好性 | 8% | 文件行数限制、函数复杂度、模块粒度 |
| 11. 代码自述性 | 6% | 文件综述、语义化命名、关键注释 |
| 12. SDD 规范支持 | 6% | OpenSpec、SpecKit、BMAD-Method 等规范工具 |

> **注意**: CI/CD 集成不在本审计范围内，因为大多数团队已有独立的 CI/CD 平台统一管理（如 Jenkins、GitLab CI、GitHub Actions 等），无需在仓库层面重复检测。

### Phase 3: 生成报告

根据检查结果生成 Markdown 报告：

```markdown
# AI 亲和度审计报告

## 仓库信息
- 仓库路径: <path>
- 检查日期: <date>
- 项目类型: <type>

## 总体评分: X/100 (等级: A/B/C/D)

## 维度评分详情
[各维度得分和详细说明]

## 改进建议
[按优先级排序的具体建议]

## 快速胜利（Quick Wins）
[可快速实施的改进项]
```

## 检查执行指南

### 1. 最小可运行环境（12%）

**核心目标**: AI Coding 工具可在本地快速启动应用，验证修改效果，尽可能少依赖第三方服务。

检查是否具备快速启动和依赖屏蔽能力：

```bash
# 检查启动脚本
cat package.json | grep -A 20 '"scripts"'

# 检查 Mock 模式启动
grep -r "mock\|MSW\|ENABLE_MSW" package.json .env* vite.config.*

# 检查环境变量模板
ls -la .env.example .env.local.example env.local.example

# 检查依赖锁定
ls -la package-lock.json yarn.lock pnpm-lock.yaml
```

**关键检查点**:
1. **一键启动**: `npm run dev` 或类似命令可直接启动
2. **Mock 模式**: 支持通过 Mock 屏蔽后端/第三方 API（如 MSW、json-server）
3. **环境变量模板**: 提供 `.env.example` 说明必需配置
4. **依赖锁定**: 有 lock 文件确保依赖版本一致
5. **最小配置**: 无需复杂配置即可启动开发服务器

**评分标准：**
- 4分：一键启动 + Mock 模式完整 + 环境变量模板 + 依赖锁定
- 3分：一键启动 + 有 Mock 模式或完整启动文档
- 2分：可启动但需要手动配置环境变量或依赖
- 1分：启动依赖外部服务，无 Mock 方案
- 0分：无明确启动方式或强依赖外部服务无法本地运行

> **注意**: 对于 BaaS 架构（如 Supabase + Edge Function + 纯前端），Docker 不是必需项。核心是能否通过 Mock 屏蔽后端依赖实现本地独立开发。

### 2. 前后端解耦（8%）

检查前后端是否可独立开发调试：

```bash
# 检查 Mock 服务配置
ls -la **/mock* **/msw* **/fixtures*

# 检查 API 契约
ls -la **/openapi* **/swagger* **/*.api.ts
```

**评分标准：**
- 4分：完整的 Mock 服务 + API 契约 + 独立启动脚本
- 3分：有 Mock 服务，可独立调试
- 2分：部分接口有 Mock
- 1分：强依赖后端服务
- 0分：完全耦合，无法独立启动

### 3. 类型系统（12%）

检查静态类型检查能力：

```bash
# TypeScript 配置
cat tsconfig.json | grep -E "strict|noImplicit"

# 类型覆盖检查
npx tsc --noEmit 2>&1 | tail -20
```

**评分标准：**
- 4分：TypeScript strict 模式 + 无 any + 类型完整
- 3分：TypeScript 开启，少量 any
- 2分：TypeScript 开启但配置宽松
- 1分：仅部分文件使用 TypeScript
- 0分：纯 JavaScript 无类型

### 4. 单元测试（12%）

检查单元测试覆盖情况：

```bash
# 检查测试框架配置
ls -la jest.config.* vitest.config.* pytest.ini

# 运行覆盖率检查
npm test -- --coverage 2>/dev/null
```

**评分标准：**
- 4分：覆盖率 >80% + 核心路径 100%
- 3分：覆盖率 60-80%
- 2分：覆盖率 40-60%
- 1分：有测试但覆盖率 <40%
- 0分：无单元测试

### 5. 端到端测试（8%）

检查 E2E 测试覆盖：

```bash
# 检查 E2E 框架
ls -la cypress/ playwright/ e2e/ tests/e2e/

# 检查测试脚本数量
find . -name "*.cy.ts" -o -name "*.spec.ts" | wc -l
```

**评分标准：**
- 4分：关键用户流程 100% 覆盖
- 3分：主要流程有覆盖
- 2分：仅有 smoke test
- 1分：有框架但测试很少
- 0分：无 E2E 测试

### 6. 文档完备性（10%）

检查文档质量：

```bash
# 核心文档
ls -la README.md CONTRIBUTING.md docs/ AGENTS.md

# 架构文档
ls -la docs/*rchitecture* docs/*DESIGN*
```

**评分标准：**
- 4分：README + 架构文档 + API 文档 + AI 指南（AGENTS.md）
- 3分：README 完整 + 架构文档
- 2分：README 基本完整
- 1分：README 简单
- 0分：无文档或文档过期

### 7. 代码规范（8%）

检查代码一致性保障：

```bash
# Linting 配置
ls -la .eslintrc* eslint.config.* .prettierrc* biome.json

# Git hooks
ls -la .husky/ .git/hooks/pre-commit

# 提交规范
cat .commitlintrc* commitlint.config.*
```

**评分标准：**
- 4分：Lint + Format + Pre-commit + 提交规范
- 3分：Lint + Format + Pre-commit
- 2分：Lint + Format
- 1分：仅有 Lint 配置
- 0分：无规范约束

### 8. 模块化架构（6%）

检查代码组织和耦合度：

```bash
# 目录结构分析
tree -L 2 -d src/

# 依赖图分析（如有工具）
npx madge --circular src/
```

**评分标准：**
- 4分：清晰分层 + 无循环依赖 + 职责单一
- 3分：合理分层，少量耦合
- 2分：有分层但边界模糊
- 1分：耦合较重
- 0分：意大利面代码

### 9. 错误处理（4%）

检查错误处理规范：

```bash
# 错误处理模式
grep -r "throw new" src/ | head -10
grep -r "catch" src/ | head -10
```

**评分标准：**
- 4分：统一错误类型 + 错误边界 + 可追踪 ID
- 3分：统一错误格式
- 2分：部分统一处理
- 1分：各处自行处理
- 0分：无规范处理

### 10. 上下文窗口友好性（8%）

**核心目标**: 确保代码文件可被 AI 完整读取和理解，避免因文件过长导致上下文截断或理解困难。

> **背景**: 主流 AI Coding 工具的上下文窗口有限（8K-200K tokens），单个过长文件会占用大量上下文，影响 AI 对全局的理解。

使用脚本检查文件大小和复杂度：

```bash
# 运行文件体积检查脚本
python3 scripts/check_file_size.py <src_path> --warn 500 --error 1000

# 或使用内置的 repo_scan.py
python3 scripts/repo_scan.py <repo_path> --check-size
```

脚本输出示例：
```
📊 文件体积检查报告
=====================================
总文件数: 273
正常 (≤500行): 245 (89.7%)
警告 (500-1000行): 20 (7.3%)
严重 (>1000行): 8 (2.9%)

❌ 严重超标文件 (>1000行):
  - src/services/data/DataService.ts: 1249 行
  - src/pages/AdminDashboard.tsx: 1102 行
  ...

⚠️ 警告文件 (500-1000行):
  - src/components/PhotoGrid.tsx: 856 行
  ...
```

**关键检查点**:
1. **单文件行数**: 推荐 ≤500 行，最大不超过 1000 行
2. **单函数行数**: 推荐 ≤80 行，最大不超过 150 行
3. **函数复杂度**: 圈复杂度 ≤15
4. **类/组件大小**: 单个类/组件推荐 ≤300 行
5. **文件职责单一**: 一个文件只做一件事

**行数阈值建议**:

| 类型 | 推荐 | 警告 | 严重 |
|------|------|------|------|
| 源文件 | ≤500 行 | 500-1000 行 | >1000 行 |
| 函数/方法 | ≤80 行 | 80-150 行 | >150 行 |
| 组件 | ≤300 行 | 300-600 行 | >600 行 |
| 测试文件 | ≤800 行 | 800-1500 行 | >1500 行 |

**评分标准：**
- 4分：90% 文件 ≤500 行 + 无超过 1000 行的文件 + 函数复杂度合理
- 3分：80% 文件 ≤500 行 + 少量 500-1000 行文件
- 2分：存在多个 500-1000 行文件，少量超过 1000 行
- 1分：多个文件超过 1000 行
- 0分：大量文件超过 1000 行或存在超过 2000 行的巨型文件

### 11. 代码自述性（6%）

**核心目标**: 让 AI 无需跳转多个文件就能理解当前代码的目的和上下文。

检查文件综述和命名规范：

```bash
# 检查文件是否有头部注释/JSDoc
find src -name "*.ts" -o -name "*.tsx" | head -20 | while read f; do
  head -10 "$f" | grep -q "^\s*/\*\*\|^//\s*@" && echo "✓ $f" || echo "✗ $f"
done

# 检查函数是否有 JSDoc 注释
grep -r "^\s*/\*\*" src/ --include="*.ts" | wc -l

# 检查是否使用语义化命名（避免单字母变量）
grep -r "\b[a-z]\s*=" src/ --include="*.ts" | grep -v "for\|let i\|const [a-z] =" | head -10
```

**关键检查点**:
1. **文件综述**: 文件开头有注释说明该文件的职责和用途
2. **函数文档**: 公开函数有 JSDoc/TSDoc 注释说明参数和返回值
3. **语义化命名**: 变量、函数、文件名具有描述性，避免缩写和单字母
4. **关键逻辑注释**: 复杂算法或业务逻辑有解释性注释
5. **类型作为文档**: 复杂类型有注释说明用途

**文件综述示例**:

```typescript
/**
 * @file UserAuthService - 用户认证服务
 * @description 处理用户登录、注册、Token 刷新等认证相关逻辑
 * @dependencies supabase, jwt-decode
 * @exports UserAuthService, AuthError, TokenPayload
 */

// 或简化版本
/**
 * 用户认证服务
 * 
 * 职责：
 * - 用户登录/注册
 * - Token 管理和刷新
 * - Session 状态维护
 */
```

**评分标准：**
- 4分：90% 文件有综述 + 公开 API 有完整文档 + 语义化命名一致
- 3分：核心文件有综述 + 主要函数有文档
- 2分：部分文件有注释，命名基本规范
- 1分：注释稀少，命名不规范
- 0分：无注释，命名混乱（如大量 a, b, temp, data）

### 12. SDD 规范支持（6%）

**核心目标**: 检查项目是否采用规范驱动开发（Specification-Driven Development），让 AI 可以依据规范生成和验证代码。

> **SDD 理念**: 将需求、架构、API 等以机器可读的规范文档形式维护，AI 可据此理解项目意图并生成符合规范的代码。

检查 SDD 工具和规范文件：

```bash
# OpenSpec 检查（OpenAPI/AsyncAPI）
ls -la openapi.yaml openapi.json asyncapi.yaml spec/ specs/

# SpecKit 检查
ls -la .speckit/ speckit.config.* specs/*.spec.ts

# BMAD-Method 检查
ls -la .cursor/rules/bmad/ AGENTS.md docs/Epics.yaml

# 其他 SDD 工具
ls -la .cursor/rules/ .github/copilot-instructions.md CONVENTIONS.md

# AI 配置文件检查
ls -la .cursorrules .cursor/rules/ .aider* .continue/ cline_docs/
```

**支持的 SDD 工具/规范**:

| 工具/规范 | 用途 | 关键文件 |
|-----------|------|----------|
| **OpenSpec** | API 契约定义 | `openapi.yaml`, `asyncapi.yaml` |
| **SpecKit** | 测试规范驱动 | `.speckit/`, `*.spec.ts` |
| **BMAD-Method** | 项目全生命周期规范 | `.cursor/rules/bmad/`, `AGENTS.md`, `Epics.yaml` |
| **Cursor Rules** | AI 编码规则 | `.cursorrules`, `.cursor/rules/` |
| **GitHub Copilot** | Copilot 指令 | `.github/copilot-instructions.md` |
| **Aider Conventions** | Aider 项目约定 | `.aider.conf.yml`, `CONVENTIONS.md` |
| **Continue** | Continue 配置 | `.continue/`, `config.json` |
| **Cline** | Cline 文档 | `cline_docs/`, `.clinerules` |
| **Windsurf** | Windsurf 规则 | `.windsurfrules` |

**关键检查点**:
1. **API 规范**: 有 OpenAPI/AsyncAPI 定义后端接口
2. **架构规范**: 有 Architecture.md 或类似架构文档
3. **开发规范**: 有 CONVENTIONS.md 或 DEVELOPMENT_PATTERNS.md
4. **AI 工具配置**: 有 .cursorrules 或 AGENTS.md 指导 AI 行为
5. **Epic/Story 管理**: 有结构化的需求和任务文档

**评分标准：**
- 4分：完整 SDD 体系（API 规范 + 架构规范 + AI 配置 + 任务管理）
- 3分：有 API 规范 + 架构文档 + AI 配置文件
- 2分：有架构文档或 AI 配置文件
- 1分：仅有基本 README，无规范文件
- 0分：无任何规范驱动文档

---

## 附加检查维度（可选）

以下维度可根据项目特点选择性检查：

### A. AI 工具配置完备性

检查项目对主流 AI Coding 工具的适配程度：

```bash
# Cursor 配置
ls -la .cursorrules .cursor/rules/

# GitHub Copilot 配置
ls -la .github/copilot-instructions.md

# Aider 配置
ls -la .aider* CONVENTIONS.md

# Continue 配置
ls -la .continue/

# Cline 配置
ls -la cline_docs/ .clinerules

# Windsurf 配置
ls -la .windsurfrules
```

**评分建议：**
- 有 2+ 工具配置：优秀
- 有 1 个工具配置：良好
- 有 AGENTS.md：基本
- 无配置：需改进

### B. 依赖可审计性

检查依赖是否便于 AI 理解：

```bash
# 检查依赖数量
cat package.json | jq '.dependencies | length'
cat package.json | jq '.devDependencies | length'

# 检查是否有过时依赖
npx npm-check-updates 2>/dev/null | head -20
```

**检查点：**
- 依赖数量合理（<50 生产依赖）
- 无废弃/不维护的依赖
- 依赖版本固定

### C. 示例代码完备性

检查是否有足够的示例供 AI 学习：

```bash
# 检查示例目录
ls -la examples/ demo/ samples/

# 检查测试中的示例
grep -r "describe\|it\|test" src/**/*.test.* | wc -l
```

**检查点：**
- 关键功能有使用示例
- 测试即文档，测试用例清晰
- 有 Storybook 或组件示例

### D. 变更历史可追溯性

```bash
# 检查 CHANGELOG
ls -la CHANGELOG.md HISTORY.md

# 检查提交信息规范性
git log --oneline -20
```

**检查点：**
- 有 CHANGELOG 记录变更
- Git 提交信息语义化
- PR 描述清晰

## 报告模板

使用 `references/report_template.md` 作为报告生成模板。

**报告示例结构**:

```markdown
# AI 亲和度审计报告

## 仓库信息
- 仓库路径: <path>
- 检查日期: <date>
- 项目类型: <type>

## 总体评分: X/100 (等级: A/B/C/D/F)

| 等级 | 分数范围 | 描述 |
|------|----------|------|
| A | 90-100 | AI 亲和度优秀，可高效协作 |
| B | 75-89 | AI 亲和度良好，有小幅改进空间 |
| C | 60-74 | AI 亲和度一般，需重点改进 |
| D | 40-59 | AI 亲和度较差，需系统性改造 |
| F | <40 | AI 亲和度极低，不适合 AI 协作 |

## 维度评分详情

| 维度 | 权重 | 得分 | 加权得分 |
|------|------|------|----------|
| 1. 最小可运行环境 | 12% | X/4 | X.XX |
| 2. 前后端解耦 | 8% | X/4 | X.XX |
| 3. 类型系统 | 12% | X/4 | X.XX |
| ... | ... | ... | ... |
| 12. SDD 规范支持 | 6% | X/4 | X.XX |
| **总计** | **100%** | - | **XX.XX** |

## 关键发现

### ✅ 优势
- [列出做得好的方面]

### ⚠️ 需改进
- [列出需要改进的方面]

### ❌ 严重问题
- [列出必须立即解决的问题]

## 改进建议（按优先级排序）

### P0 - 立即修复
1. [必须修复的问题]

### P1 - 短期改进
1. [一周内应完成的改进]

### P2 - 中期优化
1. [一个月内应完成的优化]

## 快速胜利（Quick Wins）
[列出可快速实施且效果明显的改进项]

1. 添加 `.cursorrules` 文件定义编码规范
2. 为核心文件添加文件综述注释
3. 拆分超过 1000 行的大文件
```

## 资源文件

### scripts/
- `repo_scan.py` - 自动化仓库扫描脚本，收集基础信息

### references/
- `checklist.md` - 完整的检查清单和评分细则
- `report_template.md` - 报告输出模板

## 快速开始

1. 读取目标仓库的基本结构
2. 运行 `scripts/repo_scan.py` 获取基础数据
3. 参照上述 12 个维度逐一评估
4. 重点关注新增维度：
   - **上下文窗口友好性**: 检查大文件，建议拆分
   - **代码自述性**: 检查文件综述和注释质量
   - **SDD 规范支持**: 检查 OpenSpec、BMAD 等工具配置
5. 使用报告模板生成最终报告
6. 按优先级提出改进建议

## 常见改进建议

### 针对上下文窗口友好性
- 将超过 1000 行的文件拆分为多个职责单一的模块
- 提取大函数中的子逻辑为独立函数
- 使用 barrel exports (`index.ts`) 组织模块
- 运行 `python3 scripts/check_file_size.py ./src` 定期检查

### 针对代码自述性
- 为每个源文件添加头部综述注释
- 为公开 API 添加 JSDoc/TSDoc
- 统一命名规范，避免缩写

### 针对 SDD 规范支持
- 创建 `.cursorrules` 或 `AGENTS.md` 指导 AI 协作
- 将 API 定义为 OpenAPI 规范
- 维护 `Architecture.md` 架构文档
- 使用 BMAD-Method 管理项目全生命周期
