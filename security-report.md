# OPC-Starter 安全审查报告

> 审查日期: 2026-01-18
> 审查范围: package.json build 脚本、环境变量配置、Vite 构建配置、敏感信息泄露风险

---

## 审查摘要

| 风险等级 | 数量 | 状态 |
|----------|------|------|
| 高风险 | 1 | 需立即修复 |
| 中风险 | 2 | 建议修复 |
| 低风险 | 1 | 可选修复 |
| 良好实践 | 5 | 已符合 |

---

## 高风险问题

### 1. 测试用户凭证被注入生产构建

**文件**: `app/vite.config.ts:42-45`

```typescript
define: {
  'import.meta.env.VITE_USE_MOCK_AUTH': JSON.stringify(env.VITE_USE_MOCK_AUTH),
  'import.meta.env.TEST_USER_EMAIL': JSON.stringify(env.TEST_USER_EMAIL),  // 危险
  'import.meta.env.TEST_USER_PWD': JSON.stringify(env.TEST_USER_PWD),      // 危险
},
```

**风险说明**:
- `TEST_USER_EMAIL` 和 `TEST_USER_PWD` 通过 Vite 的 `define` 配置被注入到构建产物中
- 这些值会被硬编码到生产 JavaScript 文件中，任何人查看源码都能获取
- 如果测试账号与生产账号共用，可能导致未授权访问

**修复建议**:

```typescript
// vite.config.ts - 仅在开发/测试模式注入
define: {
  'import.meta.env.VITE_USE_MOCK_AUTH': JSON.stringify(env.VITE_USE_MOCK_AUTH),
  // 仅在非生产模式注入测试凭证
  ...(mode !== 'production' && {
    'import.meta.env.TEST_USER_EMAIL': JSON.stringify(env.TEST_USER_EMAIL),
    'import.meta.env.TEST_USER_PWD': JSON.stringify(env.TEST_USER_PWD),
  }),
},
```

---

## 中风险问题

### 2. MSW mockServiceWorker.js 会被打包到生产环境

**文件**: `app/public/mockServiceWorker.js`

**风险说明**:
- `public/` 目录下的文件会被原样复制到构建产物
- `mockServiceWorker.js` (9KB) 会出现在生产部署中
- 虽然 main.tsx 中有 `import.meta.env.DEV` 条件判断不会激活，但增加了攻击面

**修复建议**:

方案 A - 构建时排除:
```typescript
// vite.config.ts
build: {
  rollupOptions: {
    // 排除 MSW worker 文件
    external: ['mockServiceWorker.js'],
  },
}
```

方案 B - 移动到 src/mocks/ 目录:
```bash
mv app/public/mockServiceWorker.js app/src/mocks/
# 并更新 MSW 配置
```

方案 C - 在 CI/CD 构建脚本中删除:
```bash
# build 脚本后添加
rm -f dist/mockServiceWorker.js
```

---

### 3. MSW 和 Faker 在 dependencies 而非 devDependencies

**文件**: `app/package.json:70,49`

```json
"dependencies": {
  "msw": "^2.12.0",           // 应该是 devDependency
  "@faker-js/faker": "^10.1.0" // 应该是 devDependency
}
```

**风险说明**:
- 这些包仅用于开发/测试环境
- 作为 dependencies 会增加生产包体积（tree-shaking 可能不完全移除）
- `@faker-js/faker` 特别大（约 5MB）

**修复建议**:

```bash
npm uninstall msw @faker-js/faker
npm install --save-dev msw @faker-js/faker
```

确保 `vite.config.ts` 中的 `manualChunks` 配置不再引用这些包用于生产构建。

---

## 低风险问题

### 4. Cypress fixture 包含明文测试密码

**文件**: `app/cypress/fixtures/users.json`

```json
{
  "testUser": {
    "email": "test@example.com",
    "password": "888888"
  }
}
```

**风险说明**:
- 密码 `888888` 过于简单
- 如果此仓库公开，测试账户信息会泄露
- 若测试环境与预生产环境共用数据库，可能被利用

**修复建议**:
- 使用强密码（如 `TestPassword!2026`）
- 确保测试账户仅存在于隔离的测试数据库
- 或从环境变量读取（但 AGENTS.md 中明确禁止此做法）

---

## 良好实践 (已符合)

### 1. 环境变量文件正确排除

**文件**: `.gitignore:29-38`

```gitignore
.env
.env.local
.env*.local
.env.development
.env.test
.env.production
# ... 等
```

所有敏感环境变量文件已被正确排除。

---

### 2. Supabase 前端仅使用公开密钥

**文件**: `app/src/lib/supabase/client.ts:6-7`

```typescript
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
```

- `VITE_SUPABASE_ANON_KEY` 是设计为公开的密钥（anon key）
- 安全性由 Supabase 的 Row Level Security (RLS) 策略保证
- 没有使用 `SERVICE_ROLE_KEY` 在前端

---

### 3. 后端敏感密钥正确隔离

**文件**: `app/supabase/functions/ai-assistant/index.ts:60,589,605`

```typescript
apiKey: Deno.env.get('ALIYUN_BAILIAN_API_KEY') || '',
// ...
Deno.env.get('SUPABASE_ANON_KEY') ?? ''
```

- 所有敏感密钥通过 `Deno.env.get()` 从环境变量读取
- Edge Functions 的环境变量在 Supabase Dashboard 中配置
- 不会暴露到前端代码

---

### 4. 生产构建禁用 Source Map

**文件**: `app/vite.config.ts:70`

```typescript
sourcemap: false,
```

- 生产构建不生成 source map
- 防止源码通过浏览器开发工具被完整还原

---

### 5. 无硬编码真实密钥

**扫描结果**:
- 未发现格式为 `sk-*` 的真实 API 密钥
- 未发现格式为 `eyJ*` 的真实 JWT Token
- 未发现阿里云 AccessKey ID (`AKIA*`)
- 所有示例均使用占位符 (`your_xxx`, `xxx`)

---

## 修复优先级建议

| 优先级 | 问题 | 预计工时 |
|--------|------|----------|
| P0 | 测试凭证注入生产构建 | 5 分钟 |
| P1 | MSW worker 文件打包 | 10 分钟 |
| P2 | 依赖分类调整 | 5 分钟 |
| P3 | 测试密码强化 | 2 分钟 |

---

## 快速修复命令

```bash
# 1. 修复依赖分类
cd app
npm uninstall msw @faker-js/faker
npm install --save-dev msw @faker-js/faker

# 2. 构建后清理 MSW worker
npm run build && rm -f dist/mockServiceWorker.js

# 3. 验证构建产物
grep -r "TEST_USER" dist/ || echo "Good: No test credentials found"
grep -r "888888" dist/ || echo "Good: No test password found"
ls dist/mockServiceWorker.js 2>/dev/null || echo "Good: MSW worker removed"
```

---

## 附录: 审查文件清单

| 文件 | 审查结果 |
|------|----------|
| `app/package.json` | 中风险 - 依赖分类问题 |
| `app/vite.config.ts` | 高风险 - 测试凭证注入 |
| `.gitignore` | 通过 |
| `app/env.local.example` | 通过 |
| `app/env.${locus}` | 通过 |
| `app/src/lib/supabase/client.ts` | 通过 |
| `app/src/main.tsx` | 通过（有 DEV 条件判断）|
| `app/supabase/functions/ai-assistant/index.ts` | 通过 |
| `app/cypress/fixtures/users.json` | 低风险 |
| `app/public/mockServiceWorker.js` | 中风险 |

---

*报告生成工具: Qoder auto-develop skill*
