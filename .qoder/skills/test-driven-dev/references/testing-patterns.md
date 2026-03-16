# 测试模式参考文档

## 1. 测试用例命名规范

```
[优先级] 描述
```

| 级别 | 含义 | 示例 |
|------|------|------|
| P0 | 核心流程，必须通过 | `[P0] 使用正确凭证登录成功` |
| P1 | 重要验证，应该通过 | `[P1] 错误密码显示错误提示` |
| P2 | 用户体验，建议通过 | `[P2] 密码字段是密码类型` |
| P3 | 边界情况 | `[P3] 刚好 6 字符密码可以注册` |

---

## 2. 测试套件分组模式

```typescript
test.describe('[P0] 功能名 - 核心流程', () => {
  // P0 用例
});

test.describe('[P1] 功能名 - 表单验证', () => {
  // P1 用例
});

test.describe('[P1] 功能名 - 导航', () => {
  // 导航跳转相关
});

test.describe('[P2] 功能名 - 用户体验', () => {
  // P2 用例
});

test.describe('[P3] 功能名 - 边界情况', () => {
  // P3 用例
});
```

---

## 3. 状态清理模式

```typescript
// beforeEach 标准清理（未导航时）
test.beforeEach(async ({ page }) => {
  await page.context().clearCookies();
  await page.evaluate(() => {
    try {
      localStorage.clear();
      sessionStorage.clear();
    } catch {
      // 忽略跨域错误
    }
  });
});

// 已有页面时的清理（先导航再清理）
test.beforeEach(async ({ page }) => {
  await page.goto('/login');
  await page.context().clearCookies();
  await page.evaluate(() => { try { localStorage.clear(); } catch {} });
});
```

---

## 4. 可重复执行保证

```typescript
// 注册测试：使用唯一邮箱
const generateUniqueEmail = () => `test${Date.now()}@test.com`;

test('注册新用户', async ({ page }) => {
  const email = generateUniqueEmail(); // 每次不同
  await fillRegisterForm(page, '昵称', email, 'Password123', 'Password123');
  // ...
});
```

---

## 5. 等待策略

```typescript
// 等待页面稳定
await page.waitForLoadState('networkidle');

// 等待元素可见
await expect(page.locator('#element')).toBeVisible({ timeout: 10000 });

// 等待 URL 变化
await expect(page).toHaveURL(/.*dashboard.*/, { timeout: 15000 });

// 等待文本出现
await expect(page.locator('text=成功')).toBeVisible({ timeout: 10000 });
```

---

## 6. fixme 模式

暂时无法运行的测试（如依赖测试用户）：

```typescript
// 整组 fixme
test.describe.fixme('[P1] 需要真实用户', () => {
  // 激活条件：在 Supabase 创建 test@example.com
});

// 单个 fixme
test.fixme('[P0] 依赖真实登录', async ({ page }) => {
  // FIXME: 需要确认 test@example.com 用户存在
});
```

激活方式：移除 `.fixme` 即可启用。

---

## 7. 演示测试 vs 功能测试 区别

| 维度 | 功能测试 | 演示测试 |
|------|----------|----------|
| 目录 | `tests/e2e/` | `tests/e2e/demo/` |
| 速度 | 快 | 慢（打字机效果）|
| 断言 | 严格 | 宽松 |
| 视频 | 失败时录制 | 始终录制 |
| 目的 | 验证功能 | 展示效果 |
| 重复性 | 幂等 | 幂等（唯一邮箱）|

---

## 8. 测试规划文档维护

每次增加/完成测试后，更新 `tests/TEST_PLAN.md` 中的状态：

| 符号 | 含义 |
|------|------|
| ✅ | 已完成，正常运行 |
| ⏸ | fixme，暂时跳过 |
| 🚧 | 进行中 |
| 未创建 | 还没有文件 |
