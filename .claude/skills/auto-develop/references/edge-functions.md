# Edge Functions

## 可用函数

| Function | 职责 | 说明 |
|----------|------|------|
| `ai-assistant` | Agent SSE 网关 | LLM 交互、工具调用代理 |

## Agent Gateway 架构

```
用户请求 → ai-assistant (Edge Function)
                ↓
        ┌───────┴───────┐
        ↓               ↓
   Qwen-Plus (百炼)  工具调用
        ↓               ↓
        └───────┬───────┘
                ↓
          SSE 流式响应 → 前端
```

### 核心文件

| 文件 | 职责 |
|------|------|
| `app/supabase/functions/ai-assistant/index.ts` | 主入口，SSE 处理 |
| `app/supabase/functions/ai-assistant/tools.ts` | 工具定义 (OpenAI 格式) |
| `app/supabase/functions/ai-assistant/prompts/` | System Prompt 模板 |

### 添加新 Agent Tool

1. 在 `tools.ts` 添加工具定义：

```typescript
{
  type: "function",
  function: {
    name: "myNewTool",
    description: "工具描述",
    parameters: {
      type: "object",
      properties: {
        param1: { type: "string", description: "参数描述" }
      },
      required: ["param1"],
    },
  },
}
```

2. 在前端 `app/src/lib/agent/tools/` 创建对应执行器
3. 在 `registry.ts` 注册工具

## 部署

```bash
# 部署 ai-assistant
cd app/supabase && supabase functions deploy ai-assistant

# 本地开发
cd app/supabase && supabase functions serve ai-assistant
```

## 位置

所有 Edge Functions 位于 `app/supabase/functions/`

## 环境变量

ai-assistant 需要以下环境变量：

| 变量 | 说明 |
|------|------|
| `ALIYUN_BAILIAN_API_KEY` | 百炼 API 密钥 |

在 Supabase Dashboard → Settings → Edge Functions → Secrets 中配置。
