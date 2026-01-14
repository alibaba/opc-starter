# TDD 驱动开发工作流

## 完整工作流程

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         Photo Wall TDD 开发流程                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌──────────┐    ┌───────────────────┐    ┌─────────────────────┐          │
│  │ 新需求   │───▶│ BMAD Master       │───▶│ Epic/Story/Task     │          │
│  │ Bug 报告 │    │ 方案讨论          │    │ 计划制定            │          │
│  └──────────┘    └───────────────────┘    └─────────────────────┘          │
│                                                     │                       │
│                                                     ▼                       │
│  ┌──────────────────────────────────────────────────────────────┐          │
│  │                   Phase 1: 测试先行 (TDD)                     │          │
│  │  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐       │          │
│  │  │ 编写单元测试 │    │ 编写 E2E    │    │ 确认测试    │       │          │
│  │  │ (Vitest)    │───▶│ 测试        │───▶│ 失败 (Red)  │       │          │
│  │  └─────────────┘    └─────────────┘    └─────────────┘       │          │
│  └──────────────────────────────────────────────────────────────┘          │
│                                                     │                       │
│                                                     ▼                       │
│  ┌──────────────────────────────────────────────────────────────┐          │
│  │                   Phase 2: 代码实现 (Green)                   │          │
│  │  遵循 coding-constraints.md 中的技术约束                       │          │
│  │  实现最小可行代码使测试通过                                    │          │
│  └──────────────────────────────────────────────────────────────┘          │
│                                                     │                       │
│                                                     ▼                       │
│  ┌──────────────────────────────────────────────────────────────┐          │
│  │                   Phase 3: 质量验证                           │          │
│  │  npm run lint → npm run test → npm run test:e2e:headless     │          │
│  │              → npm run build                                  │          │
│  └──────────────────────────────────────────────────────────────┘          │
│                                                     │                       │
│                                                     ▼                       │
│  ┌──────────────┐    ┌───────────────────┐    ┌─────────────────┐          │
│  │ npm run      │───▶│ 人工审查          │───▶│ 更新线上        │          │
│  │ preview      │    │ UI/UX/边界场景    │    │ 部署            │          │
│  └──────────────┘    └───────────────────┘    └─────────────────┘          │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Phase 1: 需求分析与方案讨论

### 触发 BMAD Master

当收到新需求或 Bug 报告时，引用 BMAD Master 进行方案讨论：

```
@bmad/core/agents/bmad-master
```

BMAD Master 职责：
- 分析需求的业务价值和技术可行性
- 评估对现有架构的影响
- 识别潜在风险和依赖关系
- 提出解决方案建议

### 制定 Epic/Story/Task

在 `docs/Epics.yaml` 中记录计划：

```yaml
epics:
  - id: EPIC-XX
    title: "功能名称"
    status: in_progress
    stories:
      - id: STORY-XX-1
        title: "具体 Story"
        acceptance_criteria:
          - "AC1: 验收标准 1"
          - "AC2: 验收标准 2"
        tasks:
          - "Task 1: 编写单元测试"
          - "Task 2: 编写 E2E 测试"
          - "Task 3: 实现核心逻辑"
          - "Task 4: 集成测试"
```

## Phase 2: 测试先行 (TDD Red Phase)

### 单元测试 (Vitest)

测试文件位置：与源文件同目录，使用 `.test.ts` 或 `.spec.ts` 后缀

```typescript
// src/services/data/DataService.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { dataService } from './DataService'

describe('DataService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getAllPhotos', () => {
    it('应该返回所有照片列表', async () => {
      // Arrange
      const mockPhotos = [{ id: '1', title: 'Test Photo' }]
      
      // Act
      const result = await dataService.getAllPhotos()
      
      // Assert
      expect(result).toEqual(mockPhotos)
    })

    it('当无照片时应返回空数组', async () => {
      const result = await dataService.getAllPhotos()
      expect(result).toEqual([])
    })
  })
})
```

### E2E 测试 (Cypress)

测试文件位置：`cypress/e2e/` 目录

```javascript
// cypress/e2e/photos/upload.cy.js
describe('照片上传功能', function() {
  beforeEach(function() {
    cy.fixture('users').as('users')
  })

  it('应该成功上传单张照片', function() {
    // 使用 fixture 中的测试用户登录
    const { email, password } = this.users.testUser
    cy.visit('/login')
    cy.get('[data-testid="email-input"]').type(email)
    cy.get('[data-testid="password-input"]').type(password)
    cy.get('[data-testid="login-button"]').click()

    // 导航到上传页面
    cy.visit('/upload')

    // 上传照片
    cy.get('[data-testid="photo-dropzone"]').selectFile(
      'cypress/fixtures/test-photo.jpg',
      { action: 'drag-drop' }
    )

    // 验证上传成功
    cy.get('[data-testid="upload-success"]').should('be.visible')
  })

  it('应该拒绝非图片文件', function() {
    // 尝试上传非图片文件
    cy.get('[data-testid="photo-dropzone"]').selectFile(
      'cypress/fixtures/invalid.txt',
      { action: 'drag-drop' }
    )

    // 验证错误提示
    cy.get('[data-testid="upload-error"]').should('contain', '不支持的文件格式')
  })
})
```

### Cypress 测试规范

1. **测试用户凭证**：从 `cypress/fixtures/users.json` 读取，禁止使用环境变量

2. **测试数据隔离**：使用 MSW mock 数据，不依赖真实后端

3. **Data-Testid 选择器**：优先使用 `data-testid` 属性定位元素

```tsx
// 组件中添加测试标识
<Button data-testid="submit-button">提交</Button>
<Input data-testid="email-input" />
```

### shadcn/ui 组件测试 (Critical) ⚠️

本项目使用 shadcn/ui（基于 Radix UI），其 DOM 结构与原生 HTML 元素不同。

**编写测试前必须**：先检查组件实际渲染的 DOM 结构，不要假设组件实现。

#### RadioGroup / RadioGroupItem

```tsx
// 组件代码
<RadioGroupItem value="private" id="visibility-private" />
```

```javascript
// ❌ 错误：假设是原生 <input type="radio">
cy.get('input[value="private"]').should('be.checked');

// ✅ 正确：Radix UI 使用 <button> + data-state
cy.get('#visibility-private').should('have.attr', 'data-state', 'checked');
```

#### Button variant 样式

```javascript
// ❌ 错误：假设使用 Tailwind 语义 class
cy.get('button').should('have.class', 'bg-primary');

// ✅ 正确：检查实际使用的 class（可能是 bg-blue-600 等）
cy.get('button').should('have.class', 'bg-blue-600');
```

#### Checkbox

```javascript
// ❌ 错误：假设是原生 <input type="checkbox">
cy.get('input[type="checkbox"]').should('be.checked');

// ✅ 正确：Radix UI 使用 data-state
cy.get('[data-testid="my-checkbox"]').should('have.attr', 'data-state', 'checked');
```

#### Select

```javascript
// ❌ 错误：假设是原生 <select>
cy.get('select').select('option-value');

// ✅ 正确：Radix UI 需要点击触发器再点击选项
cy.get('[data-testid="select-trigger"]').click();
cy.get('[data-value="option-value"]').click();
```

#### Dialog / Modal

```javascript
// ❌ 错误：直接查找 dialog 内容
cy.get('.dialog-content').should('be.visible');

// ✅ 正确：等待 dialog 动画完成
cy.get('[role="dialog"]').should('be.visible');
cy.get('[role="dialog"]').within(() => {
  cy.contains('Dialog Title').should('exist');
});
```

#### 常见 Radix UI data 属性

| 属性 | 用途 | 值 |
|------|------|-----|
| `data-state` | 组件状态 | `checked`, `unchecked`, `open`, `closed`, `active`, `inactive` |
| `data-disabled` | 禁用状态 | `true`, `""` |
| `data-orientation` | 方向 | `horizontal`, `vertical` |
| `data-highlighted` | 高亮状态 | `true`, `""` |

#### 测试编写流程

1. **先运行 `npm run dev`** 启动开发服务器
2. **打开浏览器 DevTools**，检查目标元素的实际 DOM 结构
3. **确认元素类型**（是 `button` 还是 `input`？）
4. **确认状态属性**（使用 `checked` 还是 `data-state`？）
5. **确认 CSS class**（实际使用什么 class？）
6. **编写测试代码**

## Phase 3: 代码实现 (TDD Green Phase)

编写最小可行代码使测试通过。遵循 `references/coding-constraints.md` 中的技术约束。

### 实现顺序

1. 先让单元测试通过
2. 再让 E2E 测试通过
3. 处理边界场景
4. 添加错误处理

## Phase 4: 质量验证

### 验证检查清单

执行完整验证流程：

```bash
# Step 1: 代码质量检查
npm run lint
# 期望结果：无错误，无警告

# Step 2: 单元测试
npm run test
# 期望结果：所有测试通过

# Step 3: E2E 回归测试
npm run test:e2e:headless
# 期望结果：所有测试通过

# Step 4: 构建验证
npm run build
# 期望结果：构建成功，无类型错误
```

### 验证失败处理

| 阶段 | 常见问题 | 解决方案 |
|------|----------|----------|
| lint | ESLint 错误 | 修复代码风格问题，避免使用 `any` |
| lint | TypeScript 类型错误 | 添加正确的类型注解 |
| test | 单测失败 | 检查 mock 配置，修复逻辑错误 |
| test:e2e | 选择器失效 | 更新 data-testid，检查元素渲染 |
| build | 构建失败 | 检查导入路径，解决循环依赖 |

## Phase 5: 本地预览与人工审查

```bash
npm run preview
```

### 人工审查清单

- [ ] UI 渲染符合设计稿
- [ ] 交互体验流畅
- [ ] 功能完整性验证
- [ ] 边界场景测试（空状态、大量数据、网络错误）
- [ ] 响应式布局检查
- [ ] 性能表现（无明显卡顿）

## Phase 6: 部署上线

确认所有验证通过后，执行部署流程。

## 测试文件组织

```
photo-wall/
├── src/
│   ├── services/
│   │   ├── data/
│   │   │   ├── DataService.ts
│   │   │   └── DataService.test.ts    # 单元测试
│   │   └── ...
│   └── ...
├── cypress/
│   ├── e2e/
│   │   ├── auth/
│   │   │   └── login.cy.js
│   │   ├── photos/
│   │   │   ├── upload.cy.js
│   │   │   └── gallery.cy.js
│   │   └── albums/
│   │       └── management.cy.js
│   ├── fixtures/
│   │   ├── users.json               # 测试用户凭证
│   │   └── test-photo.jpg           # 测试资源
│   └── support/
│       ├── commands.js              # 自定义命令
│       └── e2e.js                   # E2E 配置
└── ...
```

## MSW Mock 数据

Mock 数据位置：
- 认证 API：`src/mocks/handlers/authHandlers.ts`
- REST API：`src/mocks/handlers/supabaseRestHandlers.ts`

测试用户凭证需与 `authHandlers.ts` 中的 mock 保持一致。

