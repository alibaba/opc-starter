---
name: test-driven-dev
description: "[project] OPC-Starter 测试驱动开发规范。管理和执行 Playwright E2E 测试、演示模式测试、单元测试的完整工作流。适用于新增功能时补充测试用例、运行认证/注册/演示测试、维护测试规划文档。当用户提到测试、E2E、Playwright、演示、用例、质量、补充测试时使用。"
---

# OPC-Starter 测试驱动开发规范

## 快速命令

```bash
# 单元测试
cd app && npm run test

# E2E 全量
cd app && npm run test:e2e

# 认证专项（有浏览器窗口）
cd app && npm run test:e2e:auth

# 演示模式（打字机效果）
cd app && npm run test:e2e:demo

# UI 调试模式
cd app && npm run test:e2e:ui

# 查看报告
cd app && npm run test:e2e:report
```

---

## 核心原则

1. **新功能 → 先写测试** 或功能完成后立即补充
2. **演示测试独立维护** → `tests/e2e/demo/` 目录，带打字机效果
3. **可重复执行** → 注册测试用 `Date.now()` 生成唯一邮箱，`beforeEach` 清理状态
4. **测试状态更新** → 完成用例后更新 `tests/TEST_PLAN.md`

---

## 目录结构

```
app/tests/
├── e2e/
│   ├── auth/
│   │   ├── login.spec.ts       # 登录测试 (14 个)
│   │   └── register.spec.ts    # 注册测试 (17 个)
│   ├── demo/
│   │   └── demo-auth.spec.ts   # 演示测试 (5 个)
│   ├── dashboard.spec.ts       # fixme
│   ├── profile.spec.ts         # fixme
│   ├── persons.spec.ts         # fixme
│   └── settings.spec.ts        # fixme
└── support/
    ├── fixtures/auth.fixture.ts
    └── helpers/
        ├── test-helpers.ts
        └── demo-helpers.ts     # 打字机/高亮效果
```

---

## 新增功能测试 Checklist

### 新增页面

```typescript
test('[P1] 应该能够访问页面', ...)        // 必须
test('[P1] 应该显示主要内容', ...)        // 必须
test('[P1] 核心交互测试', ...)            // 建议
test('[P2] 导航到其他页面', ...)          // 建议
```

### 新增表单

```typescript
test('[P0] 成功提交', ...)                // 必须
test('[P1] 空字段被阻止', ...)            // 必须
test('[P1] 无效格式被阻止', ...)          // 必须
test('[P1] 显示错误提示', ...)            // 建议
// 同步在 demo/ 目录添加演示用例
```

### 新增演示用例模板

```typescript
import { test, expect } from '@playwright/test';
import { fillFormWithEffect, clickWithEffect, highlightElement } from '../../support/helpers/demo-helpers';

test.use({ launchOptions: { slowMo: 50 }, video: 'on' });

test.describe('🎬 演示模式 - [功能名]', () => {
  test.beforeEach(async ({ page }) => {
    await page.context().clearCookies();
    await page.evaluate(() => { try { localStorage.clear(); } catch {} });
  });

  test('🎬 演示：[场景名]', async ({ page }) => {
    await page.goto('/path');
    await page.waitForLoadState('networkidle');
    
    await fillFormWithEffect(page, [
      { selector: '#field1', value: '值1' },
      { selector: '#field2', value: '值2' },
    ]);
    
    await highlightElement(page, 'button[type="submit"]', 500);
    await clickWithEffect(page, 'button[type="submit"]', { pause: 1000 });
  });
});
```

---

## 演示辅助函数速查

| 函数 | 用途 | 关键参数 |
|------|------|----------|
| `typeWithEffect(page, selector, text)` | 打字机效果输入 | `delay: 40` |
| `highlightElement(page, selector, duration)` | 红色边框高亮 | `duration: 500` |
| `clickWithEffect(page, selector)` | 高亮后点击 | `pause: 300` |
| `fillFormWithEffect(page, fields[])` | 表单批量填充 | fields 数组 |

演示速度配置在 `tests/support/helpers/demo-helpers.ts` → `DEMO_CONFIG`

---

## 测试用例文件结构

```typescript
// 1. 引入
import { test, expect } from '@playwright/test';

// 2. 测试数据
const TEST_USER = { email: 'test@example.com', password: '888888' };

// 3. 辅助函数
async function clearAuthState(page) { ... }

// 4. 测试套件 - 按优先级分组
test.describe('[P0] 核心流程', () => { ... });
test.describe('[P1] 验证逻辑', () => { ... });
test.describe('[P2] 用户体验', () => { ... });
test.describe('[P3] 边界情况', () => { ... });
```

---

## 运行器配置

Playwright 配置：`app/playwright.config.ts`  
演示速度参数：`tests/support/helpers/demo-helpers.ts`  
测试规划文档：`tests/TEST_PLAN.md`

详细说明见 [references/testing-patterns.md](references/testing-patterns.md)
