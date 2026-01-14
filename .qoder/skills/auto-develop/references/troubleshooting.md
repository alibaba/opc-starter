# 常见问题排查

本文档收集开发过程中常见的问题及解决方案。

## Lint / TypeScript 错误

### ESLint 错误

| 错误 | 原因 | 解决方案 |
|------|------|----------|
| `'any' type is not allowed` | 使用了 `any` 类型 | 添加具体类型注解 |
| `Missing return type` | 函数缺少返回类型 | 添加返回类型声明 |
| `Unexpected any` | 隐式 `any` | 显式声明类型 |

### TypeScript 类型错误

| 错误 | 原因 | 解决方案 |
|------|------|----------|
| `Property does not exist on type` | 类型定义不完整 | 更新 `src/types/*.ts` |
| `Type 'X' is not assignable to type 'Y'` | 类型不匹配 | 检查类型定义或使用类型断言 |
| `Cannot find module` | 导入路径错误 | 检查路径别名配置 `@/` |

---

## 测试失败

### 单元测试 (Vitest)

| 错误 | 原因 | 解决方案 |
|------|------|----------|
| `Mock not called` | Mock 配置错误 | 检查 `vi.mock()` 路径 |
| `Expected X but received Y` | 断言失败 | 检查测试数据和逻辑 |
| `Timeout` | 异步操作未完成 | 使用 `await` 或增加超时 |

### E2E 测试 (Cypress)

| 错误 | 原因 | 解决方案 |
|------|------|----------|
| `Element not found` | 选择器失效 | 检查 `data-testid` 属性 |
| `Timed out waiting for element` | 元素未渲染 | 增加等待或检查渲染逻辑 |
| `Detached from DOM` | 元素被重新渲染 | 使用 `.should()` 重新获取 |

#### shadcn/ui 组件测试问题

| 问题 | 原因 | 解决方案 |
|------|------|----------|
| `input[type="radio"]` 找不到 | Radix UI 用 `<button>` | 用 `data-state="checked"` |
| `select` 操作失败 | Radix UI 用 Portal | 点击 trigger 再点选项 |
| `checkbox` 状态检测失败 | 无原生 `checked` 属性 | 用 `data-state="checked"` |

```javascript
// ❌ 错误
cy.get('input[value="private"]').should('be.checked');

// ✅ 正确
cy.get('#visibility-private').should('have.attr', 'data-state', 'checked');
```

---

## 数据库错误

### Supabase 查询错误

| 错误 | 原因 | 解决方案 |
|------|------|----------|
| `violates check constraint` | 枚举值不在 CHECK 约束中 | 更新 `setup.sql` CHECK 约束 |
| `column does not exist` | 字段未添加到表 | 添加字段到 `setup.sql` |
| `null value in column` | NOT NULL 约束违反 | 提供默认值或允许 NULL |
| `duplicate key value` | 唯一约束冲突 | 检查数据唯一性 |

### PostgreSQL ltree 问题

```typescript
// ❌ 错误：PostgREST 不支持 ltree 操作符
.or(`id.eq.${orgId},path.like.${orgPath}.%`)

// ✅ 正确：在 JavaScript 中过滤
const { data: allOrgs } = await supabase.from('organizations').select('id, path');
const descendantOrgs = allOrgs.filter(o => 
  o.id === organizationId || 
  (o.path && o.path.startsWith(orgPath + '.'))
);
```

### Supabase PromiseLike 问题

```typescript
// ❌ 错误：PromiseLike 没有 finally
supabase.from('table').select().then(...).finally(...)

// ✅ 正确：使用 async IIFE
const promise = (async () => {
  try {
    const { data, error } = await supabase.from('table').select()
    return data
  } finally {
    // cleanup
  }
})()
```

---

## React 问题

### 重复 API 请求

| 现象 | 原因 | 解决方案 |
|------|------|----------|
| 组件挂载时请求多次 | `useCallback` 作为 `useEffect` 依赖 | 使用 `useRef` 追踪初始化 |
| 状态变化触发多次请求 | 未跳过初始渲染 | 使用 `prevRef` 对比变化 |

```typescript
// ✅ 正确：使用 ref guard
const initializedRef = useRef(false);

useEffect(() => {
  if (initializedRef.current) return;
  initializedRef.current = true;
  loadData();
}, []);
```

### CSS Animation 警告

```tsx
// ❌ 错误：混用简写和分写
style={{
  animationDelay: `${delay}ms`,
  animation: 'fadeInUp 0.6s ease-out forwards',
}}

// ✅ 正确：全部使用分写
style={{
  animationName: 'fadeInUp',
  animationDuration: '0.6s',
  animationTimingFunction: 'ease-out',
  animationFillMode: 'forwards',
  animationDelay: `${delay}ms`,
}}
```

---

## 构建错误

| 错误 | 原因 | 解决方案 |
|------|------|----------|
| `Circular dependency` | 循环导入 | 重构模块依赖 |
| `Cannot resolve module` | 路径别名配置错误 | 检查 `tsconfig.json` 和 `vite.config.ts` |
| `Out of memory` | 构建内存不足 | 增加 Node.js 内存限制 |

---

## Tailwind CSS v4 问题

### 透明度语法错误

```tsx
// ❌ 错误：v2/v3 语法
className="bg-opacity-50 text-opacity-75"

// ✅ 正确：v4 语法
className="bg-black/50 text-white/75"
```

### 渐变语法错误

```tsx
// ❌ 错误：v3 语法
className="bg-gradient-to-r from-purple-500 to-pink-500"

// ✅ 正确：v4 语法
className="bg-linear-to-r from-purple-500 to-pink-500"
```

---

## IndexedDB 缓存问题

当数据转换逻辑变更后，可能需要清除本地缓存：

1. **DevTools 清除**：Application → IndexedDB → Delete database
2. **强制刷新**：`Ctrl+Shift+R` / `Cmd+Shift+R`

---

## 快速诊断命令

```bash
# 检查 TypeScript 错误
npx tsc --noEmit

# 检查 ESLint 错误
npm run lint

# 检查数据库一致性
python .qoder/skills/auto-develop/scripts/db_constraint_diff.py

# 运行单个测试文件
npm run test -- path/to/file.test.ts

# 运行单个 E2E 测试
npx cypress run --spec "cypress/e2e/albums/visibility.cy.js"
```

