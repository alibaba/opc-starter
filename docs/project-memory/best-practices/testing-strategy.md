# 测试策略

> 版本: 1.0
> 更新日期: 2026-03-19
> 变更来源: MVP Retrospective（Epic 29-34）

---

## 核心原则

**测试驱动开发（TDD）**：测试伴随开发持续补充，而非开发完成后补测试。

---

## 责任分层

| 测试类型 | 负责人 | 时机 | 范围 | 频率 |
|----------|--------|------|------|------|
| 单元测试 | Dev | Story 开发期间 | 函数、组件、服务层逻辑 | 每个 Story |
| 集成测试 | QA | Story 完成后 | 端到端流程、跨模块交互 | 每个 Story |
| E2E 测试 | QA | Epic 完成后 | 用户完整旅程 | 每个 Epic |
| 回归测试 | QA | 版本发布前 | 核心功能稳定性 | 每次发布 |

---

## 单元测试规范

### 测试范围

**必须测试**：

1. **业务逻辑函数**
   - 计算类：`formatFileSize()`, `parseVersion()`, `generateSlug()`
   - 转换类：`mapSkillToCard()`, `normalizeTags()`
   - 校验类：`validateSkillName()`, `isValidVersion()`

2. **组件事件处理**
   - 点击事件：按钮触发正确的 action
   - 表单提交：数据正确收集和提交
   - 状态切换：toggle、modal open/close

3. **状态管理**
   - Store actions：调用后 state 正确更新
   - Selectors：返回正确的派生数据
   - 异步操作：loading/error/success 状态流转

4. **API 调用**
   - 成功分支：正确解析响应数据
   - 失败分支：正确处理错误、显示提示
   - 边界情况：空响应、超时、网络错误

5. **边界条件**
   - 空值：`null`, `undefined`, `''`
   - 极限值：最大长度、最大数量
   - 错误输入：非法格式、越界值

**不需要测试**：

1. 第三方库的内部逻辑
2. 纯展示组件的样式（由视觉测试覆盖）
3. 框架层面功能（React 渲染、路由跳转）
4. 简单的 getter/setter（无逻辑分支）

### 测试文件组织

```
app/src/
├── components/
│   └── skills/
│       ├── SkillCard.tsx
│       └── __tests__/
│           └── SkillCard.test.tsx
├── services/
│   └── skill/
│       ├── skillService.ts
│       └── __tests__/
│           └── skillService.test.ts
├── stores/
│   ├── useSkillStore.ts
│   └── __tests__/
│       └── useSkillStore.test.ts
└── utils/
    ├── format.ts
    └── __tests__/
        └── format.test.ts
```

### 测试命名规范

```typescript
// 描述块：被测单元 + 场景
describe('skillService', () => {
  describe('getBySlug', () => {
    it('should return skill when found', () => {});
    it('should return null when not found', () => {});
    it('should throw error when slug is empty', () => {});
  });
});
```

### 测试覆盖率要求

| 代码类型 | 最低覆盖率 | 目标覆盖率 |
|----------|-----------|-----------|
| 核心业务逻辑 | 80% | 100% |
| 关键路径（支付、权限、数据写入） | 100% | 100% |
| UI 组件 | 60% | 80% |
| 工具函数 | 80% | 90% |

### 运行命令

```bash
# 运行所有单元测试
npm run test

# 运行特定文件
npm run test -- skillService.test.ts

# 查看覆盖率报告
npm run coverage
```

---

## 集成测试规范

### QA 职责

1. **Story 完成后**：Dev 通知 QA，QA 安排集成测试
2. **测试范围**：
   - 跨组件交互（如发布流程：表单 → 上传 → 成功提示）
   - API 集成（真实后端或 MSW mock）
   - 数据流验证（前端 → 后端 → 数据库）

3. **测试环境**：
   - 使用 MSW mock 模式：`npm run dev:test`
   - 测试数据隔离，避免污染

### E2E 测试（Playwright）

```
app/tests/e2e/
├── skills/
│   ├── skills-home.spec.ts    # 首页加载、搜索
│   ├── skills-detail.spec.ts  # 详情页、下载
│   ├── skills-publish.spec.ts # 发布流程
│   └── skills-user.spec.ts    # 用户中心
└── demo/
    └── demo-skills-hub.spec.ts # 演示模式
```

### 运行命令

```bash
# E2E 测试（headless）
npm run test:e2e:headless

# E2E 测试（带 UI）
npm run test:e2e
```

---

## 测试数据管理

### MSW Mock 数据

- 位置：`app/src/mocks/handlers/`
- 原则：每个测试场景使用独立的数据集
- 避免全局共享状态

### 测试用户

- 位置：`app/cypress/fixtures/users.json`
- 测试账号：`test@example.com` / `888888`

---

## CI/CD 集成

### 质量门禁

```bash
npm run ai:check    # lint:check + format:check + type-check + coverage + build
npm run test        # 单元测试
npm run coverage    # 覆盖率检查（阈值: lines 25%, branches 18%）
```

### PR 检查清单

- [ ] 单元测试通过
- [ ] 覆盖率达标
- [ ] 无 lint/type 错误
- [ ] E2E 测试通过（如涉及核心流程）

---

## 常见问题

### Q: UI 组件怎么测？

测交互，不测样式：

```typescript
// ✅ 测试交互
it('should call onLike when like button clicked', () => {
  const onLike = vi.fn();
  render(<SkillCard skill={mockSkill} onLike={onLike} />);
  fireEvent.click(screen.getByRole('button', { name: /like/i }));
  expect(onLike).toHaveBeenCalledWith(mockSkill.id);
});

// ❌ 不要测试样式
it('should have correct color', () => {
  // 样式由视觉测试或 Storybook 覆盖
});
```

### Q: 异步操作怎么测？

使用 `waitFor` 和 `findBy`：

```typescript
it('should load skills on mount', async () => {
  render(<SkillsList />);
  expect(screen.getByText(/loading/i)).toBeInTheDocument();
  
  const items = await screen.findAllByRole('article');
  expect(items).toHaveLength(10);
});
```

### Q: Supabase 调用怎么测？

使用 MSW mock 或 spy：

```typescript
// 方式 1：MSW mock（推荐用于集成测试）
// 在 handlers 中定义 mock 响应

// 方式 2：spy（用于单元测试）
vi.mock('@/lib/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn().mockResolvedValue({ data: mockSkill, error: null })
        }))
      }))
    }))
  }
}));
```

---

## 参考资料

- [Vitest 文档](https://vitest.dev/)
- [Testing Library](https://testing-library.com/)
- [Playwright E2E](https://playwright.dev/)
- [MSW](https://mswjs.io/)
