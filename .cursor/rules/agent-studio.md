---
description: Agent Studio 开发规范，编辑 Agent 相关文件时应用
globs: ["app/src/components/agent/**/*", "app/src/lib/agent/**/*", "app/src/hooks/useAgentChat.ts", "app/supabase/functions/ai-assistant/**/*"]
---

# Agent Studio 开发规范

## 架构

```
用户 ←→ AgentWindow (悬浮对话框)
  ↓
useAgentChat Hook
  ↓
SSE Client ←→ ai-assistant (Edge Function)
  ↓              ↓
Tool Executor  Qwen-Plus (百炼 API)
  ↓
A2UI Renderer (动态 UI)
```

## 添加新 Agent Tool

1. **后端**: 在 `ai-assistant/tools.ts` 的 TOOLS 数组添加工具定义
2. **前端**: 在 `src/lib/agent/tools/` 创建工具目录
3. **注册**: 在 `src/lib/agent/tools/registry.ts` 注册

## 添加新 A2UI 组件

1. 在 `src/components/agent/a2ui/components/` 创建组件
2. 在 `src/components/agent/a2ui/registry.ts` 注册组件
3. 在 `src/types/a2ui.ts` 添加类型定义

## A2UI Action ID 规范

| 类别 | Action ID 格式 | 示例 |
|------|---------------|------|
| 导航 | `navigation.*` | `navigation.goTo` |
| 用户 | `user.*` | `user.updateProfile` |
| 组织 | `org.*` | `org.createTeam` |

## 禁止事项

- 禁止在 A2UI 中使用未注册的组件类型
- 禁止直接调用 LLM API（通过 ai-assistant Edge Function）
