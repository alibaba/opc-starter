---
description: Tailwind CSS v4 语法规范，编辑样式相关文件时自动应用
globs: ["app/src/**/*.tsx", "app/src/**/*.ts", "app/src/**/*.css"]
---

# Tailwind CSS v4 规范

本项目使用 Tailwind CSS **v4.1**，必须使用 v4 语法。

## 渐变语法

| 禁止 (v3) | 使用 (v4) |
|-----------|-----------|
| `bg-gradient-to-t` | `bg-linear-to-t` |
| `bg-gradient-to-r` | `bg-linear-to-r` |
| `bg-gradient-to-b` | `bg-linear-to-b` |
| `bg-gradient-to-l` | `bg-linear-to-l` |

## 透明度语法

| 禁止 (v2/v3) | 使用 (v4) |
|-------------|-----------|
| `bg-opacity-*` | `bg-color/opacity` (如 `bg-black/50`) |
| `text-opacity-*` | `text-color/opacity` (如 `text-white/75`) |
| `border-opacity-*` | `border-color/opacity` |
| `ring-opacity-*` | `ring-color/opacity` |
| `divide-opacity-*` | `divide-color/opacity` |
| `placeholder-opacity-*` | `placeholder:text-color/opacity` |
