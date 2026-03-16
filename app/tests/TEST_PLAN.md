# OPC-Starter 测试模块整体规划

> 版本: 1.1 | 更新日期: 2026-03-16

---

## 1. 测试策略概览

### 1.1 测试金字塔

```
                    ▲
                   /E\        E2E 测试 (少量，关键路径)
                  /2 E\
                 /-----\
                /       \
               /  API    \    API 集成测试 (中等数量)
              /   测试    \
             /-------------\
            /               \
           /    单元测试     \  单元测试 (大量，快速反馈)
          /___________________\
```

### 1.2 测试工具选型

| 层级 | 工具           | 用途                         |
| ---- | -------------- | ---------------------------- |
| E2E  | **Playwright** | 浏览器自动化测试，可视化验证 |
| API  | Playwright API | 接口测试                     |
| 单元 | Vitest         | 组件、函数、工具测试         |
| Mock | MSW            | API Mock                     |

---

## 2. 测试目录结构

```
app/
├── tests/
│   ├── e2e/                          # E2E 测试
│   │   ├── auth/
│   │   │   ├── login.spec.ts         # ✅ 登录测试 (14 个用例)
│   │   │   └── register.spec.ts      # ✅ 注册测试 (17 个用例)
│   │   ├── demo/
│   │   │   └── demo-auth.spec.ts     # ✅ 演示模式 (5 个场景)
│   │   ├── dashboard.spec.ts         # ⏸ fixme (需真实用户)
│   │   ├── profile.spec.ts           # ⏸ fixme (需真实用户)
│   │   ├── persons.spec.ts           # ⏸ fixme (需真实用户)
│   │   └── settings.spec.ts          # ⏸ fixme (需真实用户)
│   │
│   └── support/
│       ├── fixtures/
│       │   └── auth.fixture.ts       # ✅ 认证 Fixture
│       └── helpers/
│           ├── test-helpers.ts       # ✅ 通用辅助函数
│           └── demo-helpers.ts       # ✅ 演示模式辅助（打字机效果）
│
├── playwright.config.ts              # ✅ Playwright 配置
├── vitest.config.ts                  # ✅ Vitest 配置（排除 E2E）
└── .env.test                         # ✅ 测试环境变量
```

---

## 3. 运行命令速查

### 3.1 日常开发

```bash
# 单元测试（快速反馈）
npm run test

# 运行所有 E2E 测试
npm run test:e2e

# UI 模式（可视化调试）
npm run test:e2e:ui

# 查看测试报告
npm run test:e2e:report
```

### 3.2 认证模块专项

```bash
# 所有认证测试（有浏览器窗口）
npm run test:e2e:auth

# 仅登录测试
npm run test:e2e:login

# 仅注册测试
npm run test:e2e:register
```

### 3.3 演示模式（打字机效果）

```bash
# 运行演示（带打字机 + 高亮效果）
npm run test:e2e:demo

# 演示 UI 模式
npm run test:e2e:demo:ui
```

---

## 4. 测试场景清单

### 4.1 认证模块 (Auth) ✅ 已完成

#### 登录 (login.spec.ts) — 14 个用例

| 优先级 | 场景                   | 状态            |
| ------ | ---------------------- | --------------- |
| P0     | 显示登录页面           | ✅              |
| P0     | 正确凭证登录成功       | ✅ (需真实用户) |
| P1     | 错误密码显示错误提示   | ✅              |
| P1     | 不存在用户显示错误提示 | ✅              |
| P1     | 空邮箱被浏览器阻止     | ✅              |
| P1     | 空密码被浏览器阻止     | ✅              |
| P1     | 无效邮箱格式被阻止     | ✅              |
| P1     | 未登录重定向到登录页   | ✅              |
| P1     | 点击注册链接跳转       | ✅              |
| P2     | 登录后刷新保持状态     | ✅ (需真实用户) |
| P2     | 登录按钮加载状态       | ✅              |
| P2     | 输入框正常输入         | ✅              |
| P2     | 密码字段隐藏           | ✅              |
| P2     | Placeholder 正确       | ✅              |

#### 注册 (register.spec.ts) — 17 个用例

| 优先级 | 场景                | 状态 |
| ------ | ------------------- | ---- |
| P0     | 显示注册页面        | ✅   |
| P0     | 成功注册新用户      | ✅   |
| P1     | 已存在邮箱注册失败  | ✅   |
| P1     | 密码不匹配显示错误  | ✅   |
| P1     | 密码过短显示错误    | ✅   |
| P1     | 空昵称被浏览器阻止  | ✅   |
| P1     | 空邮箱被浏览器阻止  | ✅   |
| P1     | 无效邮箱格式被阻止  | ✅   |
| P1     | 点击登录链接跳转    | ✅   |
| P1     | 从登录页跳转注册    | ✅   |
| P2     | Placeholder 正确    | ✅   |
| P2     | 注册按钮加载状态    | ✅   |
| P2     | 所有输入框正常输入  | ✅   |
| P2     | 密码字段隐藏        | ✅   |
| P2     | 错误消息样式正确    | ✅   |
| P3     | 刚好 6 字符密码通过 | ✅   |
| P3     | 5 字符密码显示错误  | ✅   |

#### 演示模式 (demo-auth.spec.ts) — 5 个场景

| 场景               | 效果           | 状态 |
| ------------------ | -------------- | ---- |
| 演示：登录流程     | 打字机 + 高亮  | ✅   |
| 演示：注册流程     | 打字机 + 高亮  | ✅   |
| 演示：错误处理流程 | 打字机 + 高亮  | ✅   |
| 演示：导航流程     | 高亮 + 点击    | ✅   |
| 演示：完整认证流程 | 注册→登出→登录 | ✅   |

---

### 4.2 待激活模块（需真实用户）

| 模块      | 文件              | 用例数 | 激活条件                          |
| --------- | ----------------- | ------ | --------------------------------- |
| Dashboard | dashboard.spec.ts | 8      | 在 Supabase 创建 test@example.com |
| Profile   | profile.spec.ts   | 5      | 同上                              |
| Persons   | persons.spec.ts   | 4      | 同上                              |
| Settings  | settings.spec.ts  | 5      | 同上                              |

**激活方式：** 移除对应文件中的 `test.describe.fixme` 改为 `test.describe`

---

### 4.3 待开发模块

| 模块               | 文件            | 状态   |
| ------------------ | --------------- | ------ |
| API 接口测试       | tests/api/      | 未创建 |
| 个人中心信息修改   | profile.spec.ts | 待补充 |
| 组织/成员管理 CRUD | persons.spec.ts | 待补充 |
| Agent Studio 交互  | agent.spec.ts   | 未创建 |

---

## 5. 开发同步规范

> 新增功能时，同步补充测试的工作流

### 5.1 测试优先级判断

| 功能类型 | 必须补充             | 建议补充     |
| -------- | -------------------- | ------------ |
| 新增页面 | 页面可访问性测试     | 核心交互测试 |
| 新增表单 | 提交/验证测试        | 边界条件测试 |
| 新增导航 | 路由跳转测试         | —            |
| Bug 修复 | 回归测试（防止复现） | —            |
| API 变更 | API 用例更新         | E2E 用例更新 |

### 5.2 新增页面 Checklist

开发新页面时，在 `tests/e2e/` 下新建对应 spec 文件，至少包含：

```typescript
// 必须：页面可访问（需要登录）
test('[P1] 应该能够访问页面', ...)

// 必须：核心内容显示
test('[P1] 应该显示主要内容', ...)

// 建议：核心操作
test('[P1] 核心交互测试', ...)

// 建议：导航链接
test('[P2] 导航到其他页面', ...)
```

### 5.3 新增表单 Checklist

```typescript
// 必须：成功提交
test('[P0] 成功提交', ...)

// 必须：必填字段验证
test('[P1] 空字段被阻止', ...)

// 必须：格式验证
test('[P1] 无效格式被阻止', ...)

// 建议：错误消息显示
test('[P1] 显示错误提示', ...)

// 建议：加入演示测试
// 在 demo/demo-xxx.spec.ts 中添加演示场景
```

### 5.4 演示测试同步

涉及用户可见流程的新功能，在 `tests/e2e/demo/` 中同步添加演示用例：

```typescript
// 使用 demo-helpers 中的打字机效果
import { fillFormWithEffect, clickWithEffect } from '../support/helpers/demo-helpers'
```

---

## 6. 测试数据管理

### 6.1 测试用户

| 类型     | 邮箱                     | 密码     | 用途          |
| -------- | ------------------------ | -------- | ------------- |
| 标准用户 | test@example.com         | 888888   | 登录/功能测试 |
| 新用户   | demo{timestamp}@test.com | 动态生成 | 注册/演示测试 |

### 6.2 数据隔离原则

- `beforeEach` 清除 cookies 和 localStorage
- 注册测试使用 `Date.now()` 生成唯一邮箱
- 演示测试不依赖固定数据

---

## 7. 配置说明

### 7.1 Playwright 配置

**文件：** `playwright.config.ts`

| 配置项     | 值                    | 说明           |
| ---------- | --------------------- | -------------- |
| testDir    | ./tests/e2e           | 测试目录       |
| baseURL    | http://localhost:5173 | 应用地址       |
| webServer  | npm run dev:test      | 自动启动应用   |
| video      | retain-on-failure     | 失败时保留视频 |
| screenshot | only-on-failure       | 失败时截图     |

### 7.2 演示模式配置

**文件：** `tests/support/helpers/demo-helpers.ts`

| 参数          | 当前值 | 说明         |
| ------------- | ------ | ------------ |
| typeDelay     | 40ms   | 打字速度     |
| clickPause    | 300ms  | 点击后停顿   |
| pageLoadPause | 500ms  | 页面加载等待 |
| actionPause   | 150ms  | 操作间停顿   |
| slowMo        | 50ms   | 全局慢速     |

---

## 8. 质量门禁

### 提交代码前

- [ ] `npm run test` 单元测试通过
- [ ] `npm run test:e2e:auth` 认证 E2E 通过

### PR 合并前

- [ ] `npm run test:e2e` 全量 E2E 通过
- [ ] 新功能有对应测试用例

### 演示/发布前

- [ ] `npm run test:e2e:demo` 演示测试通过
