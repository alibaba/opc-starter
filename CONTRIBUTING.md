# 贡献指南

感谢您有兴趣为 OPC-Starter 做出贡献！

## 开发流程

### 1. Fork 并克隆仓库

```bash
git clone https://github.com/your-username/opc-starter.git
cd opc-starter
```

### 2. 创建分支

```bash
git checkout -b feature/your-feature-name
# 或
git checkout -b fix/your-bug-fix
```

### 3. 安装依赖

```bash
cd app
npm install
```

### 4. 开发

```bash
npm run dev
```

### 5. 代码检查

```bash
# 类型检查
npm run type-check

# Lint
npm run lint

# 测试
npm test
```

### 6. 提交

请遵循 [Conventional Commits](https://www.conventionalcommits.org/) 规范：

```bash
git commit -m "feat: add new feature"
git commit -m "fix: resolve bug issue"
git commit -m "docs: update documentation"
git commit -m "refactor: improve code structure"
```

### 7. 提交 Pull Request

- 确保 CI 检查通过
- 填写 PR 模板
- 等待 Review

## 代码规范

### TypeScript

- 使用严格类型，避免 `any`
- 优先使用 `interface` 而非 `type`
- 导出类型时使用 `export type`

### React

- 使用函数组件 + Hooks
- 组件文件使用 PascalCase
- 单一职责原则

### Tailwind CSS

- 使用 v4 语法 (`bg-linear-to-r` 而非 `bg-gradient-to-r`)
- 透明度使用 `color/opacity` 语法

### 测试

- 为新功能添加单元测试
- 关键流程添加 E2E 测试

## Issue 报告

提交 Issue 时请包含：

1. 问题描述
2. 复现步骤
3. 期望行为
4. 实际行为
5. 环境信息 (OS, Node 版本, 浏览器)

## 功能请求

提交功能请求时请说明：

1. 使用场景
2. 预期效果
3. 可能的实现方案

## 许可证

贡献的代码将采用 MIT 许可证。
