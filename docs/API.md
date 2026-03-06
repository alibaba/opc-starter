# AI Assistant API 文档

> Edge Function 接口规范 | v2.0.0

## 概述

`ai-assistant` 是 OPC-Starter 的 AI 助手后端，部署为 Supabase Edge Function。使用 SSE (Server-Sent Events) 协议流式返回响应。

## 请求

### 端点

```
POST /functions/v1/ai-assistant
```

### 请求头

| 头部 | 必填 | 说明 |
|------|------|------|
| `Authorization` | 是 | `Bearer <supabase_access_token>` |
| `Content-Type` | 是 | `application/json` |
| `apikey` | 是 | Supabase anon key |

### 请求体

```typescript
interface AIAssistantRequest {
  messages: RequestMessage[];
  context?: AgentContext;
  threadId?: string;
}

interface RequestMessage {
  role: 'user' | 'assistant' | 'tool';
  content: string;
  toolCallId?: string;
  name?: string;
}

interface AgentContext {
  currentPage?: 'dashboard' | 'persons' | 'profile' | 'settings' | 'cloud-storage' | 'other';
  viewContext?: {
    viewMode: string;
    teamId: string | null;
    teamName: string | null;
  };
}
```

### 请求示例

```json
{
  "messages": [
    { "role": "user", "content": "帮我导航到组织管理页面" }
  ],
  "context": {
    "currentPage": "dashboard",
    "viewContext": {
      "viewMode": "grid",
      "teamId": null,
      "teamName": null
    }
  }
}
```

## 响应

响应使用 SSE (Server-Sent Events) 格式，`Content-Type: text/event-stream`。

### SSE 事件类型

| 事件 | 数据格式 | 说明 |
|------|----------|------|
| `text_delta` | `{ content: string }` | 增量文本内容 |
| `tool_call` | `{ id, name, arguments }` | 工具调用（前端执行） |
| `a2ui` | `A2UIEvent` | A2UI 界面渲染事件 |
| `done` | `{ iterations, usage }` | 对话完成 |
| `error` | `{ message: string }` | 错误信息 |
| `interrupted` | `{ reason, iterations }` | 用户中断 |

### SSE 事件详情

#### text_delta

LLM 生成的增量文本。前端拼接所有 `content` 即为完整回复。

```
event: text_delta
data: {"content":"你好"}

event: text_delta
data: {"content":"，我可以帮你"}
```

#### tool_call

LLM 请求调用工具，前端需要执行对应的本地工具。

```
event: tool_call
data: {"id":"call_abc123","name":"navigateToPage","arguments":{"page":"persons"}}
```

#### a2ui

A2UI 界面渲染事件，用于动态生成 UI 组件。

```
event: a2ui
data: {
  "type": "beginRendering",
  "surfaceId": "surface_1234",
  "component": {
    "id": "comp_1",
    "type": "card",
    "props": { "title": "欢迎" },
    "children": []
  },
  "dataModel": {}
}
```

#### done

对话完成信号，包含迭代次数和 token 用量。

```
event: done
data: {"iterations":1,"usage":{"prompt_tokens":500,"completion_tokens":100}}
```

#### error

```
event: error
data: {"message":"处理超时，请重试"}
```

## 可用工具

| 工具名 | 说明 | 参数 |
|--------|------|------|
| `navigateToPage` | 导航到指定页面 | `page`: home / persons / profile / settings / storage |
| `getCurrentContext` | 获取当前应用上下文 | 无 |
| `renderUI` | 生成 A2UI 界面组件 | `component` (必填), `surfaceId`, `dataModel` |

## 错误码

| HTTP 状态码 | 说明 |
|-------------|------|
| 401 | 缺少或无效的 Authorization 头 |
| 400 | messages 为空 |
| 405 | 非 POST 请求 |
| 500 | 服务器内部错误（如未配置 API Key） |

## Agent 循环

后端实现了 Agent Loop 模式：

1. 将用户消息发送给 LLM (Qwen-Plus)
2. 如果 LLM 返回工具调用 → 执行工具 → 将结果回填 → 重新调用 LLM
3. 如果 LLM 返回纯文本 → 对话完成
4. 最大迭代次数: 5 轮

```
用户消息 → LLM → 工具调用? → 是 → 执行工具 → 回填结果 → 回到 LLM
                            → 否 → 返回文本 → done
```
