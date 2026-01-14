# OPC-Starter 设计系统 Token 文档

> 本文档记录 OPC-Starter 项目的设计语言规范，包括颜色、字体、间距等设计 Token。

## 设计风格

**风格**: 温暖亲和 (Warm & Friendly)  
**灵感来源**: Donezo Dashboard  
**特点**: 自然色系、圆润边角、温暖舒适

---

## 颜色系统

### 语义化颜色

| Token | 用途 | 亮色模式 | 暗色模式 |
|-------|------|----------|----------|
| `background` | 页面背景 | `hsl(50 20% 98%)` 温暖米色 | `hsl(220 20% 10%)` |
| `foreground` | 主要文字 | `hsl(220 20% 14%)` | `hsl(50 20% 95%)` |
| `card` | 卡片背景 | `hsl(0 0% 100%)` | `hsl(220 20% 13%)` |
| `popover` | 弹出层背景 | `hsl(0 0% 100%)` | `hsl(220 20% 13%)` |
| `primary` | 主色（深森林绿） | `hsl(145 40% 28%)` | `hsl(145 50% 45%)` |
| `secondary` | 次要色（柔和灰绿） | `hsl(140 15% 94%)` | `hsl(220 15% 20%)` |
| `muted` | 静音/禁用背景 | `hsl(50 10% 94%)` | `hsl(220 15% 18%)` |
| `muted-foreground` | 次要文字 | `hsl(220 10% 46%)` | `hsl(220 10% 60%)` |
| `accent` | 强调色（琥珀橙） | `hsl(38 92% 50%)` | `hsl(38 85% 55%)` |
| `destructive` | 危险/删除 | `hsl(0 72% 51%)` | `hsl(0 62% 45%)` |
| `success` | 成功状态 | `hsl(145 60% 40%)` | `hsl(145 55% 50%)` |
| `warning` | 警告状态 | `hsl(38 92% 50%)` | `hsl(38 85% 55%)` |
| `border` | 边框颜色 | `hsl(50 10% 88%)` | `hsl(220 15% 22%)` |
| `ring` | 焦点环颜色 | `hsl(145 40% 28%)` | `hsl(145 50% 45%)` |

### 使用规范

```tsx
// ✅ 正确：使用语义化颜色
<div className="bg-background text-foreground" />
<button className="bg-primary text-primary-foreground" />
<span className="text-muted-foreground" />
<div className="border border-border" />

// ❌ 禁止：硬编码颜色（除 overlay 组件外）
<div className="bg-gray-100 text-gray-900" />
<button className="bg-blue-500 text-white" />
```

### Overlay 组件例外

移动端 overlay 组件（Dropdown, Modal, Sidebar）需要使用显式颜色 + `dark:` 前缀：

```tsx
// ✅ Overlay 组件正确写法
<div className="bg-white dark:bg-slate-900 text-gray-900 dark:text-gray-100">
```

---

## 字体系统

### 字体家族

| 用途 | 字体 | CSS 变量 |
|------|------|----------|
| **显示字体** (标题) | Nunito | `--font-display` |
| **正文字体** | Plus Jakarta Sans | `--font-sans` |

### 使用规范

```css
/* 标题自动使用 display 字体 */
h1, h2, h3, h4, h5, h6 {
  font-family: var(--font-display);
}

/* 正文使用 sans 字体 */
body {
  font-family: var(--font-sans);
}
```

### 字重规范

| 用途 | 字重 |
|------|------|
| 正文 | 400 (Regular) |
| 强调 | 500 (Medium) |
| 小标题 | 600 (Semi-bold) |
| 标题 | 700 (Bold) |
| 特大标题 | 800 (Extra-bold) |

---

## 圆角系统

| Token | 值 | 用途 |
|-------|-----|------|
| `--radius-sm` | 0.5rem (8px) | 小按钮、徽章 |
| `--radius-md` | 0.625rem (10px) | 输入框、标准按钮 |
| `--radius-lg` | 0.75rem (12px) | 卡片、对话框 |

---

## 阴影系统

```css
/* 卡片阴影 */
.shadow-card {
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

/* 悬浮阴影 */
.shadow-hover {
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12);
}

/* 弹出层阴影 */
.shadow-popover {
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.16);
}
```

---

## Tailwind CSS v4 规范

### 渐变语法

```tsx
// ✅ v4 正确语法
<div className="bg-linear-to-r from-primary to-accent" />

// ❌ v3 语法（禁用）
<div className="bg-gradient-to-r from-primary to-accent" />
```

### 透明度语法

```tsx
// ✅ v4 正确语法
<div className="bg-primary/50 text-foreground/75" />

// ❌ v2/v3 语法（禁用）
<div className="bg-opacity-50 text-opacity-75" />
```

---

## 状态颜色映射

| 状态 | 背景 | 文字 | 图标 |
|------|------|------|------|
| **成功** | `bg-success/10` | `text-success` | `text-success` |
| **警告** | `bg-warning/10` | `text-warning` | `text-warning` |
| **错误** | `bg-destructive/10` | `text-destructive` | `text-destructive` |
| **信息** | `bg-primary/10` | `text-primary` | `text-primary` |
| **禁用** | `bg-muted` | `text-muted-foreground` | `text-muted-foreground` |

---

## 组件颜色规范

### 按钮

| 变体 | 背景 | 文字 | 悬浮 |
|------|------|------|------|
| Primary | `bg-primary` | `text-primary-foreground` | `hover:bg-primary/90` |
| Secondary | `bg-secondary` | `text-secondary-foreground` | `hover:bg-secondary/80` |
| Destructive | `bg-destructive` | `text-destructive-foreground` | `hover:bg-destructive/90` |
| Outline | `border-border bg-transparent` | `text-foreground` | `hover:bg-accent hover:text-accent-foreground` |
| Ghost | `bg-transparent` | `text-foreground` | `hover:bg-accent/10` |

### 徽章 (Badge)

| 状态 | 类名 |
|------|------|
| 成功 | `bg-success/10 text-success` |
| 进行中 | `bg-primary/10 text-primary` |
| 等待 | `bg-warning/10 text-warning` |
| 错误 | `bg-destructive/10 text-destructive` |
| 离线 | `bg-muted text-muted-foreground` |

---

## 文件位置

| 文件 | 内容 |
|------|------|
| `index.html` | Google Fonts 字体引入 |
| `src/index.css` | @theme 配置 + 颜色变量 |
| `docs/DESIGN_TOKENS.md` | 本文档 |

---

## 更新记录

| 日期 | 变更 |
|------|------|
| 2025-12-28 | 初始版本：颜色系统 + 字体系统 + 使用规范 |
