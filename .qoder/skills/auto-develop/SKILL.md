---
name: auto-develop
description: Photo Wall 项目 TDD 开发规范。当开发新功能、修复 Bug、编写测试或进行代码审查时，此 Skill 提供完整的 TDD 驱动开发工作流、技术约束和编码规范。适用于 React/TypeScript 前端开发、Supabase 数据库操作、Cypress E2E 测试和阿里云服务集成。
---

# Photo Wall TDD 开发规范

> **核心理念**: 测试即规范，代码即实现。没有测试的代码不允许合并。

## 技术栈

| 技术 | 版本 | 注意事项 |
|------|------|----------|
| React | 19.1 | |
| TypeScript | 5.9 | |
| Vite | 7.1 | |
| **Tailwind CSS** | **4.1** | ⚠️ 必须使用 v4 语法 |
| Supabase | 2.80 | |
| Zustand | 5.0 | |
| **Vitest** | **4.0** | 单元测试框架 |
| **Cypress** | **15.7** | E2E 测试框架 |

---

## 🔴🟢🔵 TDD 核心原则

### 红-绿-重构循环 (Red-Green-Refactor)

```
┌─────────────────────────────────────────────────────────────┐
│                    TDD 循环 (每个功能点)                      │
│                                                             │
│     🔴 RED          🟢 GREEN         🔵 REFACTOR           │
│   ┌─────────┐     ┌─────────┐     ┌─────────┐              │
│   │ 写失败  │────▶│ 写最小  │────▶│ 优化    │──┐           │
│   │ 的测试  │     │ 实现代码 │     │ 重构    │  │           │
│   └─────────┘     └─────────┘     └─────────┘  │           │
│        ▲                                        │           │
│        └────────────────────────────────────────┘           │
│                    (下一个功能点)                            │
└─────────────────────────────────────────────────────────────┘
```

| 阶段 | 目标 | 时间占比 | 规则 |
|------|------|----------|------|
| 🔴 RED | 编写失败的测试 | 30% | 测试必须明确表达需求意图 |
| 🟢 GREEN | 写最小代码通过测试 | 40% | 只写刚好让测试通过的代码 |
| 🔵 REFACTOR | 优化代码结构 | 30% | 测试保持通过，消除重复 |

### 测试先行原则 ⚠️ MANDATORY

```
❌ 禁止：先写代码再补测试
❌ 禁止：提交没有测试覆盖的新功能
❌ 禁止：修改代码后不运行测试就提交

✅ 必须：新功能先写测试用例
✅ 必须：Bug 修复先写复现测试
✅ 必须：每次提交前运行完整测试套件
```

---

## 📊 测试覆盖率目标

### 覆盖率门禁

| 指标 | 最低要求 | 目标值 | 说明 |
|------|----------|--------|------|
| **行覆盖率** | ≥60% | ≥80% | 核心服务必须 ≥80% |
| **分支覆盖率** | ≥50% | ≥70% | 条件判断覆盖 |
| **函数覆盖率** | ≥70% | ≥90% | 公开函数必须覆盖 |

### 测试金字塔策略

```
                    ▲
                   /│\
                  / │ \
                 /  │  \        🔺 E2E 测试 (10-20%)
                /   │   \       - 关键用户流程
               /────┼────\      - 跨页面交互
              /     │     \
             /      │      \    🔸 集成测试 (20-30%)
            /───────┼───────\   - 服务间交互
           /        │        \  - API 调用
          /         │         \
         /──────────┼──────────\  🔹 单元测试 (50-70%)
        /           │           \ - 函数逻辑
       /────────────┴────────────\ - 工具方法
```

| 层级 | 测试类型 | 覆盖目标 | 运行频率 |
|------|----------|----------|----------|
| 底层 | 单元测试 (Vitest) | 工具函数、Services、Hooks | 每次保存 |
| 中层 | 集成测试 (Vitest) | DataService、Store 交互 | 每次提交 |
| 顶层 | E2E 测试 (Cypress) | 登录、上传、创建相册等关键流程 | PR 合并前 |

---

## 开发工作流 (TDD-Driven)

```
需求/Bug → BMAD 方案讨论 → Epic/Story/Task → 🔴测试先行 → 🟢代码实现 → 🔵重构优化 → 质量验证 → 数据库同步 → 人工审查 → 上线
```

### Phase 1: 需求分析与方案设计

1. **触发 BMAD Master 思考** - 引用 `@bmad/core/agents/bmad-master` 进行方案讨论
2. **制定改进计划** - 创建或更新 `docs/Epics.yaml` 中的 Epic/Story

### Phase 2: TDD 测试先行 🔴 RED

> **原则**: 在编写实现代码之前，必须先编写失败的测试。

#### 2.1 编写测试的顺序

```
1. 单元测试 (必须) → 2. 集成测试 (推荐) → 3. E2E 测试 (关键流程)
```

#### 2.2 单元测试规范 (Vitest)

**测试文件命名**: `*.test.ts` 或 `*.spec.ts`，与源文件同目录

```typescript
// src/services/photoService.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

describe('PhotoService', () => {
  // 🔴 RED: 先写失败的测试
  describe('uploadPhoto', () => {
    it('应该成功上传照片并返回 URL', async () => {
      // Arrange - 准备测试数据
      const file = new File(['test'], 'photo.jpg', { type: 'image/jpeg' })
      
      // Act - 执行待测函数
      const result = await photoService.uploadPhoto(file)
      
      // Assert - 验证结果
      expect(result.url).toMatch(/^https:\/\//)
      expect(result.id).toBeDefined()
    })

    it('当文件类型不支持时应抛出错误', async () => {
      const file = new File(['test'], 'doc.pdf', { type: 'application/pdf' })
      
      await expect(photoService.uploadPhoto(file))
        .rejects
        .toThrow('不支持的文件类型')
    })
  })
})
```

**测试三原则 (AAA)**:
| 阶段 | 英文 | 说明 |
|------|------|------|
| 准备 | Arrange | 设置测试数据和 mock |
| 执行 | Act | 调用待测函数 |
| 断言 | Assert | 验证执行结果 |

#### 2.3 Mock 策略

```typescript
// ✅ 推荐：使用 vi.mock 隔离外部依赖
vi.mock('@/lib/supabase/client', () => ({
  supabase: {
    from: vi.fn().mockReturnThis(),
    select: vi.fn().mockResolvedValue({ data: mockData, error: null })
  }
}))

// ✅ 推荐：使用 vi.spyOn 监控方法调用
const spy = vi.spyOn(dataService, 'savePhoto')
await photoService.upload(file)
expect(spy).toHaveBeenCalledWith(expect.objectContaining({ fileName: 'photo.jpg' }))
```

#### 2.4 E2E 测试规范 (Cypress)

**关键流程必须有 E2E 覆盖**:
- 用户登录/注册
- 照片上传
- 相册创建/编辑
- 批量操作

```javascript
// cypress/e2e/albums/create.cy.js
describe('创建相册', function() {
  beforeEach(function() {
    cy.fixture('users').then((users) => {
      // 登录测试用户
      cy.login(users.testUser.email, users.testUser.password)
    })
  })

  it('应该成功创建新相册', function() {
    // 🔴 RED: 先写这个测试，然后实现功能
    cy.visit('/albums')
    cy.get('[data-testid="create-album-btn"]').click()
    cy.get('[data-testid="album-name-input"]').type('测试相册')
    cy.get('[data-testid="album-submit-btn"]').click()
    
    // 验证相册创建成功
    cy.get('[data-testid="album-list"]').should('contain', '测试相册')
  })
})
```

#### 2.5 shadcn/ui 组件测试 ⚠️ CRITICAL

- **先检查 DOM 结构再写测试**，不要假设组件实现
- Radix UI 组件使用 `<button>` 而非 `<input>`
- 状态属性用 `data-state="checked"` 而非原生 `checked`

详见 `references/tdd-workflow.md`。

#### 2.6 测试命令

```bash
npm run test               # 运行单元测试
npm run test:watch         # 监听模式（开发时使用）
npm run coverage           # 生成覆盖率报告
npm run test:e2e           # Cypress 交互模式
npm run test:e2e:headless  # Cypress 无头模式（CI 用）
```

### Phase 3: 代码实现 🟢 GREEN

> **原则**: 写最小可行代码使测试通过，不多不少。

#### 3.1 实现顺序

```
1. 让单元测试通过 → 2. 让 E2E 测试通过 → 3. 处理边界场景
```

#### 3.2 实现规则

```
✅ 只写刚好让测试通过的代码
✅ 不要过度设计
✅ 每个测试通过后立即提交

❌ 不要一次性写完所有功能
❌ 不要写测试没有覆盖的代码
❌ 不要提前优化
```

遵循技术约束完成代码实现。详见 `references/coding-constraints.md`。

### Phase 3.5: 重构优化 🔵 REFACTOR

> **原则**: 在测试保护下安全重构，消除代码重复。

```
✅ 测试全部通过后再重构
✅ 每次小步重构后运行测试
✅ 提取公共方法、消除重复
✅ 改善命名、优化结构

❌ 不要在重构时添加新功能
❌ 不要跳过测试验证
```

### Bug 修复规范 ⚠️ CRITICAL

**核心原则：先查数据，再改代码**

修复显示异常、数据不正确等问题时，**必须先验证实际数据状态**，避免基于假设的多次返工。

#### 调试流程

```
发现问题 → 浏览器调试验证 → 定位根因 → 一次性修复 → 验证通过
```

#### 1. 使用浏览器调试工具

```bash
# 打开浏览器 DevTools
# Network 面板：检查 API 请求和响应数据
# Console 面板：查看日志和错误信息
```

**必查项**：
- API 响应数据是否符合预期
- 关键字段是否为 `null` / `undefined` / 空数组
- 外键引用的记录是否存在

#### 2. 添加临时调试日志

```typescript
// 修改代码前，先添加日志定位问题
console.log('[Debug] 数据状态:', JSON.stringify(data, null, 2));
console.log('[Debug] 查询结果:', { data, error });
```

#### 3. 常见数据完整性问题

| 问题场景 | 症状 | 排查方法 |
|----------|------|----------|
| 外键引用失效 | 关联查询返回 `null` | 检查被引用记录是否存在 |
| 数组包含无效 ID | 批量查询返回部分数据 | 对比请求 ID 和响应数据 |
| 字段为空 | 功能不生效 | 检查数据库记录实际值 |

#### 4. 防御性编码

处理外键引用或 ID 数组时，考虑数据可能无效：

```typescript
// ❌ 假设 photoIds[0] 一定有效
const coverUrl = await getPhotoUrl(album.photoIds[0]);

// ✅ 遍历找到第一张有效的照片
for (const photoId of album.photoIds) {
  const url = photoUrlMap.get(photoId);
  if (url) {
    album.coverPhotoUrl = url;
    break;
  }
}
```

#### 5. 小步验证原则

- 每次修改后立即验证效果
- 不要基于多个假设一次性修改
- 假设链越长，返工风险越高

### Phase 4: 质量验证 (Quality Gate)

> **原则**: 质量门禁必须全部通过，否则禁止合并代码。

#### 4.1 质量门禁清单

| 检查项 | 命令 | 通过标准 | 阻断级别 |
|--------|------|----------|----------|
| ESLint | `npm run lint:check` | 0 错误 | 🔴 强制 |
| TypeScript | `npm run type-check` | 0 错误 | 🔴 强制 |
| Prettier | `npm run format:check` | 0 差异 | 🔴 强制 |
| 单元测试 | `npm run test` | 全部通过 | 🔴 强制 |
| 覆盖率 | `npm run coverage` | ≥60% | 🟡 警告 |
| E2E 测试 | `npm run test:e2e:headless` | 全部通过 | 🔴 强制 |
| 构建 | `npm run build` | 成功 | 🔴 强制 |
| 设计系统 | 见下方检查命令 | 无硬编码颜色 | 🟡 警告 |

#### 4.1.1 设计系统检查

UI 组件变更时执行：

```bash
# 检查新增/修改的文件是否有硬编码颜色
git diff --name-only HEAD~1 | xargs grep -l "bg-gray-\|text-gray-\|bg-white\|bg-black" 2>/dev/null

# 如有匹配，需替换为语义化颜色
```

#### 4.2 执行完整质量检查

```bash
# 推荐：使用质量验证脚本（一键执行所有检查）
./scripts/quality_check.sh

# 或手动执行
npm run lint:check        # ESLint 检查
npm run format:check      # Prettier 格式检查
npm run type-check        # TypeScript 类型检查
npm run test              # 单元测试
npm run coverage          # 覆盖率报告
npm run test:e2e:headless # E2E 回归测试
npm run build             # 构建验证
```

#### 4.3 CI/CD 自动验证

项目已配置 GitHub Actions，PR 提交时自动运行：
- `.github/workflows/pr-check.yml` - Lint + Type + Test + Build
- `.github/workflows/cypress-e2e.yml` - E2E 测试

**所有 CI 检查必须通过后才能合并 PR。**

### Phase 5: 数据库一致性检查 ⚠️ CRITICAL

当功能涉及数据库变更时，**必须**执行数据库一致性检查。

详见 `references/db-sync-checklist.md`。

**核心检查项**：
- TypeScript 类型与 SQL 表定义字段一致
- 所有枚举值在 CHECK 约束中存在
- 线上数据库已执行迁移（如需要）

### Phase 6: 本地预览与人工审查

```bash
npm run preview    # 本地预览构建结果
```

人工检查要点：UI/UX 符合预期、功能完整性、边界场景、性能表现。

---

## 技术约束速查

### Tailwind CSS v4 语法 (Mandatory)

```tsx
// ❌ 禁止：v2/v3 语法
className="bg-opacity-50 bg-gradient-to-r"

// ✅ 正确：v4 语法
className="bg-black/50 bg-linear-to-r"
```

### 设计系统与暗色模式规范 ⚠️ CRITICAL

本项目采用 **Shadcn UI 设计系统 + Tailwind CSS v4**，支持浅色/深色模式切换。

**核心原则**：使用语义化颜色，禁止硬编码颜色值。

#### 语义化颜色对照表

| 语义化颜色 | 用途 | ❌ 禁止使用 |
|------------|------|-------------|
| `bg-background` | 页面背景 | `bg-gray-50`, `bg-white` |
| `bg-card` | 卡片/容器背景 | `bg-white` |
| `bg-popover` | 弹出层背景 | `bg-white` |
| `bg-muted` | 禁用/次要背景 | `bg-gray-100`, `bg-gray-200` |
| `bg-secondary` | 次要按钮/悬停背景 | `bg-gray-100` |
| `bg-primary` | 主色按钮/激活态 | `bg-blue-600`, `bg-green-600` |
| `bg-destructive` | 危险/删除操作 | `bg-red-600`, `bg-red-500` |
| `bg-success` | 成功状态 | `bg-green-*` |
| `bg-warning` | 警告状态 | `bg-yellow-*`, `bg-orange-*` |
| `text-foreground` | 主要文字 | `text-gray-900`, `text-black` |
| `text-muted-foreground` | 次要文字 | `text-gray-500`, `text-gray-600` |
| `text-primary` | 强调文字/链接 | `text-blue-600` |
| `text-destructive` | 错误文字 | `text-red-600`, `text-red-500` |
| `border` / `border-border` | 边框 | `border-gray-200`, `border-gray-300` |

#### 示例

```tsx
// ❌ 禁止：硬编码颜色（不支持暗色模式）
<div className="bg-white text-gray-900 border-gray-200">
<button className="bg-blue-600 text-white hover:bg-blue-700">
<p className="text-gray-500">次要文字</p>
<div className="bg-red-50 text-red-600">错误提示</div>

// ✅ 正确：语义化颜色（自动适配暗色模式）
<div className="bg-card text-foreground border">
<button className="bg-primary text-primary-foreground hover:bg-primary/90">
<p className="text-muted-foreground">次要文字</p>
<div className="bg-destructive/10 text-destructive">错误提示</div>
```

#### 移动端覆盖组件规范 ⚠️ CRITICAL

**Sidebar、Modal、Dropdown、Drawer 等移动端覆盖组件必须使用显式颜色，不能依赖 CSS 变量！**

这是因为移动端浏览器对 CSS 变量在覆盖层的支持可能存在问题。

```tsx
// ❌ 错误：CSS 变量在移动端覆盖层可能失效
<aside className="bg-card text-foreground">

// ✅ 正确：显式颜色 + dark: 前缀
<aside className="bg-white dark:bg-slate-900 text-gray-900 dark:text-gray-100">
```

| CSS 变量 | 浅色显式 | 深色显式 |
|----------|----------|----------|
| `bg-card` | `bg-white` | `dark:bg-slate-900` |
| `text-foreground` | `text-gray-900` | `dark:text-gray-100` |
| `border-border` | `border-gray-200` | `dark:border-slate-700` |
| `text-muted-foreground` | `text-gray-500` | `dark:text-gray-400` |

#### 渐变文字暗色模式 ⚠️

**`bg-clip-text text-transparent` 在暗色模式下可能不可见！**

```tsx
// ❌ 危险：渐变文字在暗色模式下可能隐形
<h1 className="bg-linear-to-r from-primary to-accent bg-clip-text text-transparent">

// ✅ 安全：使用普通文字颜色
<h1 className="text-foreground font-bold">
```

#### 设计系统配色（定义在 `src/index.css`）

| Token | 浅色模式 | 深色模式 | 说明 |
|-------|----------|----------|------|
| `--primary` | 深森林绿 HSL(145, 40%, 28%) | HSL(145, 50%, 45%) | 主品牌色 |
| `--accent` | 琥珀橙 HSL(38, 92%, 50%) | HSL(38, 85%, 55%) | 强调色 |
| `--background` | 温暖米色 | 深灰色 | 页面背景 |
| `--success` | 自然绿 | 提亮绿 | 成功状态 |
| `--warning` | 琥珀橙 | 提亮橙 | 警告状态 |

#### 主题切换

项目已集成主题切换功能：

```tsx
// 使用 useTheme hook
import { useTheme } from '@/hooks/useTheme'

const { theme, setTheme, isDark } = useTheme()
// theme: 'light' | 'dark' | 'system'

// 使用 ThemeToggle 组件（已集成在 Header）
import { ThemeToggle } from '@/components/ui/theme-toggle'
<ThemeToggle variant="dropdown" />
```

#### 设计系统审计命令

开发新组件或修改现有组件时，使用以下命令检查硬编码颜色：

```bash
# 审计硬编码颜色
grep -rn "bg-gray-\|text-gray-\|border-gray-" src/
grep -rn "bg-white\|bg-black" src/
grep -rn "bg-blue-\|text-blue-\|bg-red-\|text-red-\|bg-green-" src/

# 验证 Tailwind v4 配置
grep -n "@theme inline" src/index.css
grep -n "@variant dark" src/index.css
```

#### 设计系统自验证检查点

新增或修改 UI 组件后，执行以下验证：

```javascript
// 浏览器 DevTools Console 执行 - 验证 CSS 变量已生效
const root = document.documentElement;
console.log('foreground:', getComputedStyle(root).getPropertyValue('--foreground-color'));
console.log('background:', getComputedStyle(root).getPropertyValue('--background-color'));
console.log('primary:', getComputedStyle(root).getPropertyValue('--primary-color'));
// 应返回 hsl(...) 格式的颜色值，不能为空
```

### 移动端响应式开发规范

**Mobile First 原则**：基础样式针对移动端，使用 `md:` / `lg:` 前缀扩展桌面端。

```tsx
// ✅ Mobile First
<div className="px-4 py-2 md:px-6 md:py-4 lg:px-8">
<h1 className="text-xl md:text-3xl lg:text-5xl">
```

### 数据访问规范

```typescript
// ✅ 正确：通过 DataService 访问
import { dataService } from '@/services/data/DataService'
await dataService.getAllPhotos()

// ❌ 禁止：直接访问
import { photoDB } from '@/services/db/photoDB'
import { supabase } from '@/lib/supabase/client'
```

### SQL 变更

所有数据库变更 → `photo-wall/supabase/setup.sql`（禁止创建独立 SQL 文件）

---

## 禁止清单 ❌

### TDD 相关禁止事项 ⚠️ CRITICAL

| 禁止事项 | 后果 | 正确做法 |
|----------|------|----------|
| 先写代码再补测试 | 代码设计不佳，难以测试 | 先写测试，再写实现 |
| 提交无测试覆盖的新功能 | 回归风险，无法保证质量 | 功能必须有测试覆盖 |
| 不运行测试就提交代码 | CI 失败，阻塞其他人 | 提交前运行 `npm run test` |
| 跳过 E2E 测试直接部署 | 生产环境故障 | 关键流程必须 E2E 通过 |
| 忽略测试失败继续开发 | 问题堆积，修复成本增加 | 立即修复失败的测试 |
| Mock 覆盖真实逻辑 | 测试与实际脱节 | 只 mock 外部依赖 |

### 编码相关禁止事项

| 类别 | 禁止事项 |
|------|----------|
| **Tailwind** | `*-opacity-*` 语法、`bg-gradient-to-*`（用 `bg-linear-to-*`） |
| **颜色** | 硬编码颜色如 `bg-white`、`text-gray-900`、`bg-blue-600`（应使用语义化颜色） |
| **覆盖层** | Sidebar/Modal/Dropdown 使用 CSS 变量颜色（应使用显式颜色 + `dark:` 前缀） |
| **渐变文字** | 暗色模式下使用 `bg-clip-text text-transparent`（可能不可见） |
| **数据访问** | 直接导入 `photoDB` 或 `supabase` client |
| **文件管理** | 创建独立 SQL 迁移文件、创建新文档文件 |
| **TypeScript** | 使用 `any` 类型 |
| **React Hooks** | `useCallback` 作为 `useEffect` 依赖（无 ref guard） |
| **CSS** | `animation` 简写与分写属性混用 |
| **数据库** | 前端新增枚举值但未更新数据库 CHECK 约束 |
| **测试** | 假设 shadcn/ui 组件是原生 HTML 元素 |
| **Bug 修复** | 不验证数据就修改代码；假设外键/ID引用一定有效 |
| **字体** | 使用 Inter、Roboto、Arial 等通用字体（项目使用 Plus Jakarta Sans + Nunito） |

---

## Scripts

| 脚本 | 用途 | 使用场景 |
|------|------|----------|
| `scripts/quality_check.sh` | 完整质量验证流程 | Phase 4 完成后 |
| `scripts/db_constraint_diff.py` | 前后端一致性检查 | Phase 5 数据库变更时 |

---

## 快速命令

```bash
# 🚀 开发
npm run dev           # 启动开发服务器
npm run dev:test      # 测试模式 (MSW mock)

# 🧪 TDD 测试命令
npm run test          # 运行单元测试
npm run test:watch    # 监听模式（开发时推荐）
npm run coverage      # 生成覆盖率报告

# 🔄 E2E 测试
npm run test:e2e      # Cypress 交互模式
npm run test:e2e:headless  # Cypress 无头模式 (CI)

# ✅ 质量检查
npm run lint          # ESLint 检查并修复
npm run lint:check    # ESLint 仅检查（CI 用）
npm run format        # Prettier 格式化
npm run format:check  # Prettier 检查（CI 用）
npm run type-check    # TypeScript 类型检查
npm run build         # 生产构建
npm run preview       # 预览构建结果

# 🔧 一键质量验证
./scripts/quality_check.sh  # 执行完整质量检查流程
```

### TDD 开发推荐工作流

```bash
# 1. 启动测试监听（新终端窗口）
npm run test:watch

# 2. 启动开发服务器（另一个终端窗口）
npm run dev:test

# 3. 编写测试 → 看到红色失败 → 实现代码 → 看到绿色通过 → 重构
# 4. 提交前运行完整质量检查
./scripts/quality_check.sh
```

---

## 参考文档

按需读取以下详细文档：

| 文档 | 内容 | 关键词 |
|------|------|--------|
| `references/tdd-workflow.md` | TDD 完整流程、测试编写规范、shadcn/ui 测试 | vitest, cypress, radix |
| `references/coding-constraints.md` | 编码约束、React Hooks 反模式、数据流规范 | useEffect, ltree, supabase |
| `references/project-structure.md` | 项目结构、技术栈、数据流、Edge Functions、NPM 命令 | structure, npm, edge |
| `references/db-sync-checklist.md` | 数据库一致性检查、迁移 SQL 模板 | CHECK, migration |
| `references/troubleshooting.md` | 常见问题与解决方案 | error, fix, debug |

### 相关技能

| 技能 | 用途 | 调用场景 |
|------|------|----------|
| `@.qoder/skills/design-system-ui` | 设计系统改造、Tailwind v4 配置、暗色模式适配 | 新增 UI 组件、主题定制、颜色问题修复 |

## 外部文档

- `docs/Architecture.md` - 完整系统架构
- `docs/Epics.yaml` - 项目进度追踪
- `photo-wall/supabase/SUPABASE_COOKBOOK.md` - 数据库操作手册
- `photo-wall/supabase/ALICLOUD_COOKBOOK.md` - 阿里云配置指南
