/**
 * SSE (Server-Sent Events) 工具模块
 *
 * 提供 SSE 流式写入、消息转换和工具调用累积功能
 */

import type {
  ChatCompletionMessageParam,
  ChatCompletionToolMessageParam,
} from 'npm:openai@4/resources'
import type { AgentContext, RequestMessage, SSEWriter, StreamingToolCall } from './types.ts'

export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

export const sseHeaders = {
  ...corsHeaders,
  'Content-Type': 'text/event-stream',
  'Cache-Control': 'no-cache',
  Connection: 'keep-alive',
}

export function createSSEWriter(writable: WritableStream<Uint8Array>): SSEWriter {
  const writer = writable.getWriter()
  const encoder = new TextEncoder()

  return {
    write(event: string, data: unknown) {
      const message = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`
      writer.write(encoder.encode(message)).catch(console.error)
    },
    close() {
      writer.close().catch(console.error)
    },
  }
}

export function convertToOpenAIMessages(
  messages: RequestMessage[],
  systemPrompt: string
): ChatCompletionMessageParam[] {
  const result: ChatCompletionMessageParam[] = [{ role: 'system', content: systemPrompt }]

  for (const msg of messages) {
    if (msg.role === 'user') {
      result.push({ role: 'user', content: msg.content })
    } else if (msg.role === 'assistant') {
      result.push({ role: 'assistant', content: msg.content })
    } else if (msg.role === 'tool') {
      result.push({
        role: 'tool',
        tool_call_id: msg.toolCallId || '',
        content: msg.content,
      } as ChatCompletionToolMessageParam)
    }
  }

  return result
}

export function accumulateToolCalls(
  deltaToolCalls: Array<{
    index: number
    id?: string
    function?: { name?: string; arguments?: string }
  }>,
  buffers: Map<number, StreamingToolCall>
): void {
  for (const delta of deltaToolCalls) {
    const existing = buffers.get(delta.index)

    if (existing) {
      if (delta.function?.arguments) {
        existing.argumentsBuffer += delta.function.arguments
      }
    } else {
      buffers.set(delta.index, {
        index: delta.index,
        id: delta.id || '',
        name: delta.function?.name || '',
        argumentsBuffer: delta.function?.arguments || '',
      })
    }
  }
}

export function buildAssistantMessage(
  textContent: string,
  toolCalls: StreamingToolCall[]
): ChatCompletionMessageParam {
  return {
    role: 'assistant',
    content: textContent || null,
    tool_calls: toolCalls.map((tc) => ({
      id: tc.id,
      type: 'function' as const,
      function: {
        name: tc.name,
        arguments: tc.argumentsBuffer,
      },
    })),
  }
}

export function buildSystemPrompt(context?: AgentContext): string {
  const pageNames: Record<string, string> = {
    dashboard: '首页',
    persons: '组织管理',
    profile: '个人中心',
    settings: '系统设置',
    'cloud-storage': '云存储设置',
    other: '其他页面',
  }

  const currentPageName = context?.currentPage
    ? pageNames[context.currentPage] || context.currentPage
    : '未知页面'

  return `你是 OPC-Starter 的 AI 助手，帮助用户高效使用一人公司启动器平台。

## 你的身份
- 名称：OPC 助手
- 风格：专业、友好、简洁
- 语言：中文

## 平台功能介绍
OPC-Starter 是一个面向个人创业者和小团队的管理平台，主要功能包括：

### 1. 首页 (Dashboard)
- 查看个人和团队概况
- 快速访问常用功能

### 2. 组织管理 (Persons)
- 创建和管理团队结构
- 添加、编辑团队成员
- 分配角色和权限

### 3. 个人中心 (Profile)
- 编辑个人信息（姓名、头像、简介等）
- 查看账号设置

### 4. 系统设置 (Settings)
- 调整系统偏好
- 管理云存储连接

### 5. 云存储设置 (Cloud Storage)
- 配置 Supabase Storage
- 管理文件上传和存储

## 当前上下文
- 用户当前在: ${currentPageName}
${context?.viewContext?.teamName ? `- 当前团队: ${context.viewContext.teamName}` : ''}

## 可用工具
你可以使用以下工具来帮助用户：

1. **navigateToPage**: 导航到指定页面
   - 可选页面: home(首页), persons(组织管理), profile(个人中心), settings(设置), storage(云存储)

2. **getCurrentContext**: 获取当前应用上下文信息

3. **renderUI**: 生成 A2UI 界面组件供用户交互
   - 可用组件: card, button, text, badge, progress

## 交互规则
1. 使用简洁友好的中文回复
2. 根据用户当前所在页面提供相关建议
3. 对于复杂操作，可以使用 renderUI 生成交互界面
4. 主动引导用户探索平台功能
5. 遇到不明确的请求，先澄清用户意图

## 回复示例
- 用户问"怎么创建团队" → 解释步骤并提供导航按钮
- 用户问"我的个人信息" → 引导到个人中心页面
- 用户问"这个平台是做什么的" → 简洁介绍平台功能`
}
