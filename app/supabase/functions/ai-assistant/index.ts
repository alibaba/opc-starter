/**
 * AI Assistant Edge Function
 *
 * OPC-Starter 通用 AI 助手，提供智能问答和页面导航能力
 * 使用 OpenAI SDK 兼容模式调用 GLM-4.7
 *
 * @version 2.0.0 - 简化版本，移除 Photo 相关功能
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import OpenAI from 'npm:openai@4'
import type {
  ChatCompletionMessageParam,
  ChatCompletionToolMessageParam,
  ChatCompletionTool,
} from 'npm:openai@4/resources'

// ============ 类型定义 ============

interface AgentContext {
  currentPage?: 'dashboard' | 'persons' | 'profile' | 'settings' | 'cloud-storage' | 'other'
  viewContext?: {
    viewMode: string
    teamId: string | null
    teamName: string | null
  }
}

interface RequestMessage {
  role: 'user' | 'assistant' | 'tool'
  content: string
  toolCallId?: string
  name?: string
}

interface AIAssistantRequest {
  messages: RequestMessage[]
  context?: AgentContext
  threadId?: string
}

// ============ 常量配置 ============

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const sseHeaders = {
  ...corsHeaders,
  'Content-Type': 'text/event-stream',
  'Cache-Control': 'no-cache',
  Connection: 'keep-alive',
}

// 初始化 OpenAI 客户端（兼容百炼 API）
const openai = new OpenAI({
  apiKey: Deno.env.get('ALIYUN_BAILIAN_API_KEY') || '',
  baseURL: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
})

// ============ System Prompt ============

function buildSystemPrompt(context?: AgentContext): string {
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

// ============ 工具定义 ============

const TOOLS: ChatCompletionTool[] = [
  {
    type: 'function',
    function: {
      name: 'navigateToPage',
      description: '导航到指定页面。当用户需要访问特定功能时使用。',
      parameters: {
        type: 'object',
        properties: {
          page: {
            type: 'string',
            enum: ['home', 'persons', 'profile', 'settings', 'storage'],
            description:
              '目标页面: home(首页), persons(组织管理), profile(个人中心), settings(设置), storage(云存储)',
          },
        },
        required: ['page'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'getCurrentContext',
      description: '获取当前应用上下文信息，包括当前页面、用户状态等',
      parameters: {
        type: 'object',
        properties: {},
        required: [],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'renderUI',
      description: '生成 A2UI 界面供用户交互。当需要用户选择、确认或展示信息时调用。',
      parameters: {
        type: 'object',
        properties: {
          surfaceId: {
            type: 'string',
            description: '界面唯一标识，如不提供将自动生成',
          },
          component: {
            type: 'object',
            description: 'A2UI 组件树',
            properties: {
              id: { type: 'string' },
              type: {
                type: 'string',
                enum: ['card', 'button', 'text', 'badge', 'progress'],
              },
              props: { type: 'object' },
              children: { type: 'array' },
            },
            required: ['id', 'type'],
          },
          dataModel: {
            type: 'object',
            description: '数据模型，用于绑定组件属性',
          },
        },
        required: ['component'],
      },
    },
  },
]

// ============ SSE 事件发送 ============

interface SSEWriter {
  write(event: string, data: unknown): void
  close(): void
}

function createSSEWriter(writable: WritableStream<Uint8Array>): SSEWriter {
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

// ============ 消息转换 ============

function convertToOpenAIMessages(
  messages: RequestMessage[],
  context: AgentContext | undefined
): ChatCompletionMessageParam[] {
  const result: ChatCompletionMessageParam[] = [
    {
      role: 'system',
      content: buildSystemPrompt(context),
    },
  ]

  // 转换历史消息
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

// ============ 工具调用处理 ============

interface ToolCallResult {
  toolCallId: string
  name: string
  result: string
}

interface RichToolResult {
  success: boolean
  message: string
  context?: Record<string, unknown>
  suggestedNextStep?: string
  executed?: boolean
  surfaceId?: string
}

function processRenderUI(args: Record<string, unknown>, sse: SSEWriter): RichToolResult {
  const component = args.component as { id?: string; type?: string; props?: unknown } | undefined
  if (!component || !component.type) {
    console.warn('[renderUI] 缺少 component 或 component.type:', args)
    return {
      success: false,
      message: '无效的 renderUI 调用：缺少 component 参数',
    }
  }

  const surfaceId =
    (args.surfaceId as string) || `surface_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`

  if (!component.id) {
    component.id = `component_${Date.now()}`
  }

  // 发送 A2UI beginRendering 事件
  sse.write('a2ui', {
    type: 'beginRendering',
    surfaceId,
    component,
    dataModel: args.dataModel || {},
  })

  return {
    success: true,
    message: 'UI 已渲染，等待用户交互',
    surfaceId,
    context: {
      componentType: component.type,
      hasDataModel: !!args.dataModel,
    },
    suggestedNextStep: '等待用户与界面交互',
  }
}

function buildToolResult(
  toolName: string,
  args: Record<string, unknown>,
  agentContext?: AgentContext
): RichToolResult {
  switch (toolName) {
    case 'navigateToPage': {
      const pageMap: Record<string, string> = {
        home: '首页',
        persons: '组织管理',
        profile: '个人中心',
        settings: '系统设置',
        storage: '云存储设置',
      }
      const pageName = pageMap[args.page as string] || args.page
      return {
        success: true,
        message: `正在导航到${pageName}页面`,
        context: { targetPage: args.page },
        suggestedNextStep: '页面导航已发起，用户将看到新页面',
        executed: true,
      }
    }

    case 'getCurrentContext': {
      return {
        success: true,
        message: '获取当前上下文成功',
        context: {
          currentPage: agentContext?.currentPage || 'unknown',
          viewContext: agentContext?.viewContext,
        },
        executed: true,
      }
    }

    default:
      return {
        success: true,
        message: `工具 ${toolName} 执行成功`,
        context: { args },
        executed: true,
      }
  }
}

function processToolCall(
  toolName: string,
  toolCallId: string,
  args: Record<string, unknown>,
  sse: SSEWriter,
  agentContext?: AgentContext
): ToolCallResult {
  // renderUI 特殊处理：转换为 A2UI 消息
  if (toolName === 'renderUI') {
    const richResult = processRenderUI(args, sse)
    return {
      toolCallId,
      name: toolName,
      result: JSON.stringify(richResult),
    }
  }

  // 其他工具：发送 tool_call 事件给前端执行
  sse.write('tool_call', {
    id: toolCallId,
    name: toolName,
    arguments: args,
  })

  const richResult = buildToolResult(toolName, args, agentContext)

  return {
    toolCallId,
    name: toolName,
    result: JSON.stringify(richResult),
  }
}

// ============ 流式工具调用累积器 ============

interface StreamingToolCall {
  index: number
  id: string
  name: string
  argumentsBuffer: string
}

function accumulateToolCalls(
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

function buildAssistantMessage(
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

// ============ LLM 调用与循环 ============

async function runAgentLoop(
  messages: ChatCompletionMessageParam[],
  sse: SSEWriter,
  options: { maxIterations?: number; signal?: AbortSignal; agentContext?: AgentContext } = {}
): Promise<void> {
  const { maxIterations = 5, signal, agentContext } = options
  const currentMessages = [...messages]
  let iterations = 0
  let totalPromptTokens = 0
  let totalCompletionTokens = 0

  while (iterations < maxIterations) {
    if (signal?.aborted) {
      console.log('⏸️ 任务被用户中断')
      sse.write('interrupted', { reason: 'user_abort', iterations })
      break
    }

    iterations++
    console.log(`🔄 Agent 循环 #${iterations}`)

    try {
      const stream = await openai.chat.completions.create({
        model: 'glm-4.7',
        messages: currentMessages,
        tools: TOOLS,
        stream: true,
        stream_options: { include_usage: true },
      })

      let textContent = ''
      const toolCallBuffers = new Map<number, StreamingToolCall>()

      for await (const chunk of stream) {
        if (signal?.aborted) {
          console.log('⏸️ 流式响应被中断')
          break
        }

        const choice = chunk.choices[0]
        const delta = choice?.delta

        if (delta?.content) {
          textContent += delta.content
          sse.write('text_delta', { content: delta.content })
        }

        if (delta?.tool_calls) {
          accumulateToolCalls(delta.tool_calls, toolCallBuffers)
        }

        if (chunk.usage) {
          totalPromptTokens = chunk.usage.prompt_tokens || 0
          totalCompletionTokens = chunk.usage.completion_tokens || 0
        }
      }

      if (signal?.aborted) {
        sse.write('interrupted', { reason: 'user_abort', iterations })
        break
      }

      // 工具处理 + 结果回填
      if (toolCallBuffers.size > 0) {
        const toolCalls = Array.from(toolCallBuffers.values())
        console.log(`🔧 工具调用: ${toolCalls.length} 个`)

        currentMessages.push(buildAssistantMessage(textContent, toolCalls))

        const toolResults: ToolCallResult[] = []
        for (const tc of toolCalls) {
          console.log(`  - ${tc.name} [id=${tc.id}]`)

          let args: Record<string, unknown> = {}
          try {
            args = JSON.parse(tc.argumentsBuffer || '{}')
          } catch (parseError) {
            console.warn(`⚠️ 工具参数解析失败: ${tc.name}`, tc.argumentsBuffer, parseError)
          }

          const result = processToolCall(tc.name, tc.id, args, sse, agentContext)
          toolResults.push(result)
        }

        for (const tr of toolResults) {
          currentMessages.push({
            role: 'tool',
            tool_call_id: tr.toolCallId,
            content: tr.result,
          } as ChatCompletionToolMessageParam)
        }

        continue
      }

      // 终止：无工具调用 = 任务完成
      console.log('✅ 对话完成')
      sse.write('done', {
        iterations,
        usage: {
          prompt_tokens: totalPromptTokens,
          completion_tokens: totalCompletionTokens,
        },
      })
      break
    } catch (error) {
      console.error('❌ LLM 调用错误:', error)
      sse.write('error', {
        message: error instanceof Error ? error.message : '未知错误',
      })
      break
    }
  }

  if (iterations >= maxIterations) {
    console.warn('⚠️ 达到最大迭代次数')
    sse.write('error', { message: '处理超时，请重试' })
  }
}

// ============ 主处理函数 ============

serve(async (req) => {
  // 处理 CORS 预检请求
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  // 只接受 POST 请求
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: '仅支持 POST 请求' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  try {
    // 验证 API Key
    const apiKey = Deno.env.get('ALIYUN_BAILIAN_API_KEY')
    if (!apiKey) {
      throw new Error('未配置 ALIYUN_BAILIAN_API_KEY')
    }

    // 验证用户身份
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: '缺少 Authorization 头' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    )

    const {
      data: { user },
    } = await supabaseClient.auth.getUser()
    if (!user) {
      return new Response(JSON.stringify({ error: '用户未授权' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    console.log('👤 用户认证成功:', user.id)

    // 解析请求
    const body: AIAssistantRequest = await req.json()
    const { messages, context, threadId } = body

    if (!messages || messages.length === 0) {
      return new Response(JSON.stringify({ error: 'messages 不能为空' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    console.log('📥 收到请求:', {
      messageCount: messages.length,
      hasContext: !!context,
      threadId,
    })

    // 创建 SSE 响应流
    const { readable, writable } = new TransformStream<Uint8Array>()
    const sse = createSSEWriter(writable)

    // 异步处理 LLM 调用
    ;(async () => {
      try {
        const openaiMessages = convertToOpenAIMessages(messages, context)
        await runAgentLoop(openaiMessages, sse, { agentContext: context })
      } catch (error) {
        console.error('❌ 处理错误:', error)
        sse.write('error', {
          message: error instanceof Error ? error.message : '处理失败',
        })
      } finally {
        sse.close()
      }
    })()

    return new Response(readable, { headers: sseHeaders })
  } catch (error) {
    console.error('❌ 请求处理失败:', error)
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : '未知错误',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }
})

console.log('🚀 AI Assistant Function 已启动')
