/**
 * Agent Gateway Edge Function
 *
 * 处理对话请求、调用 LLM、返回 SSE 流
 * 使用 OpenAI SDK 兼容模式调用 GLM-4.7
 *
 * @see docs/epic-23-a2ui/stories/STORY-23-005.md
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import OpenAI from 'npm:openai@4'
import type {
  ChatCompletionMessageParam,
  ChatCompletionToolMessageParam,
} from 'npm:openai@4/resources'
import { TOOLS } from './tools.ts'
import { buildSystemPromptWithContext } from './prompts/system.ts'

// ============ 类型定义 ============

interface AgentContext {
  currentPage?: 'timeline' | 'album' | 'editor' | 'ai-studio'
  selectedPhotos?: Array<{
    id: string
    url: string
    thumbnail?: string
  }>
  editingState?: {
    photoId: string
    hasUnsavedChanges: boolean
  }
  currentAlbum?: {
    id: string
    name: string
  }
}

interface RequestMessage {
  role: 'user' | 'assistant' | 'tool'
  content: string
  toolCallId?: string
  name?: string
}

interface AgentGatewayRequest {
  messages: RequestMessage[]
  context?: AgentContext
  threadId?: string
}

// ============ 常量配置 ============

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
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
      content: buildSystemPromptWithContext({
        currentPage: context?.currentPage,
        selectedPhotoCount: context?.selectedPhotos?.length,
        editingPhotoId: context?.editingState?.photoId,
        albumName: context?.currentAlbum?.name,
      }),
    },
  ]

  // 如果有上下文，注入为一条 system 消息
  if (context?.selectedPhotos && context.selectedPhotos.length > 0) {
    result.push({
      role: 'system',
      content: `[Context] 用户选中的照片:\n${context.selectedPhotos.map((p) => `- ID: ${p.id}`).join('\n')}`,
    })
  }

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

// ============ 工具调用处理 (丰富反馈) ============

interface ToolCallResult {
  toolCallId: string
  name: string
  result: string
}

/**
 * 丰富工具结果接口
 * @description 遵循 Gemini 文档的工具链准则，返回上下文和建议
 */
interface RichToolResult {
  success: boolean
  message: string
  /** 上下文信息：帮助模型理解当前状态 */
  context?: Record<string, unknown>
  /** 下一步建议：引导模型自主决策 */
  suggestedNextStep?: string
  /** 错误时的恢复建议 */
  recoveryHint?: string
  /** 原有字段保持兼容 */
  executed?: boolean
  surfaceId?: string
}

function processRenderUI(
  _args: Record<string, unknown>,
  sse: SSEWriter
): RichToolResult {
  // 验证 component 参数
  const component = _args.component as { id?: string; type?: string; props?: unknown } | undefined
  if (!component || !component.type) {
    console.warn('[renderUI] 缺少 component 或 component.type:', _args)
    return {
      success: false,
      message: '无效的 renderUI 调用：缺少 component 参数',
      recoveryHint: 'renderUI 需要提供 component 对象，包含 id 和 type 字段',
    }
  }

  // 生成 surfaceId
  const surfaceId =
    (_args.surfaceId as string) || `surface_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`

  // 确保 component 有 id
  if (!component.id) {
    component.id = `component_${Date.now()}`
  }

  // 发送 A2UI beginRendering 事件
  sse.write('a2ui', {
    type: 'beginRendering',
    surfaceId,
    component,
    dataModel: _args.dataModel || {},
  })

  return {
    success: true,
    message: 'UI 已渲染，等待用户交互',
    surfaceId,
    context: {
      componentType: component.type,
      hasDataModel: !!_args.dataModel,
    },
    suggestedNextStep: '等待用户与界面交互，用户操作后会返回 action 事件',
  }
}

/**
 * 构建丰富的工具结果
 * @description 让模型能根据工具结果自我修正
 * @param toolName - 工具名称
 * @param args - 工具参数
 * @param agentContext - Agent 上下文（包含选中照片等信息）
 */
function buildRichToolResult(
  toolName: string,
  args: Record<string, unknown>,
  agentContext?: AgentContext
): RichToolResult {
  switch (toolName) {
    case 'getSelectedPhotos': {
      // ⚠️ 关键：直接从 context 读取选中照片信息，返回真实结果
      const selectedPhotos = agentContext?.selectedPhotos || []
      const count = selectedPhotos.length

      if (count === 0) {
        // 没有选中照片时，明确告诉 LLM 必须使用 renderUI 显示 selection-guide
        return {
          success: true,
          message: '当前没有选中任何照片。',
          context: {
            selectedPhotoCount: 0,
            photos: [],
          },
          suggestedNextStep:
            '⚠️ 必须调用 renderUI 显示 selection-guide 组件引导用户选择照片。示例：renderUI({ component: { type: "selection-guide", id: "guide-1", props: { targetAction: "编辑", minPhotos: 1 } } })',
          executed: true,
        }
      }

      // 有选中照片时，返回照片信息
      return {
        success: true,
        message: `获取到 ${count} 张选中的照片`,
        context: {
          selectedPhotoCount: count,
          photoIds: selectedPhotos.map((p) => p.id),
        },
        suggestedNextStep:
          count >= 2
            ? '可以进行融合（fusePhotos）或视频生成（generateVideo）操作'
            : '可以使用 loadPhotoForEdit 加载照片进行编辑',
        executed: true,
      }
    }

    case 'getCurrentPhoto':
      return {
        success: true,
        message: '前端正在获取当前编辑照片信息',
        context: { awaitingFrontendResponse: true },
        suggestedNextStep: '等待前端返回照片信息，如有编辑中的照片可直接操作',
        executed: true,
      }

    case 'loadPhotoForEdit':
      return {
        success: true,
        message: `照片 ${args.photoId} 已加载到编辑状态`,
        context: {
          photoId: args.photoId,
          navigatedToEditor: args.navigateToEditor || false,
        },
        suggestedNextStep: '照片已就绪，现在可以执行编辑操作（rotatePhoto、cropPhoto、applyFilter、adjustImage）',
        executed: true,
      }

    case 'rotatePhoto':
      return {
        success: true,
        message: `旋转工具调用已发送到前端执行。目标角度: ${args.degrees || 90}°`,
        context: { degrees: args.degrees, photoId: args.photoId },
        suggestedNextStep: '⚠️ 重要：旋转由前端执行，无需再次调用此工具。请直接告诉用户照片已旋转，询问是否满意或需要保存。',
        executed: true,
        frontendPending: true,
      }

    case 'cropPhoto':
      return {
        success: true,
        message: `裁剪工具调用已发送到前端执行。目标比例: ${args.aspectRatio || '自由'}`,
        context: { aspectRatio: args.aspectRatio, photoId: args.photoId },
        suggestedNextStep: '⚠️ 重要：裁剪由前端执行，无需再次调用此工具。请直接告诉用户裁剪工具已激活，等待用户调整裁剪区域后确认。',
        executed: true,
        frontendPending: true,
      }

    case 'applyFilter':
      return {
        success: true,
        message: `滤镜工具调用已发送到前端执行。目标滤镜: ${args.filter || 'original'}`,
        context: { filter: args.filter, photoId: args.photoId },
        suggestedNextStep: '⚠️ 重要：滤镜由前端执行，无需再次调用此工具。请直接告诉用户滤镜已应用，询问是否满意效果或需要保存。',
        executed: true,
        frontendPending: true,
      }

    case 'adjustImage':
      return {
        success: true,
        message: '已应用图片调整',
        context: {
          brightness: args.brightness,
          contrast: args.contrast,
          saturation: args.saturation,
          photoId: args.photoId,
        },
        suggestedNextStep: '调整已应用。询问用户是否满意效果，可以继续微调或保存',
        executed: true,
      }

    case 'saveEditedAsNew':
      return {
        success: true,
        message: '已准备保存编辑后的照片',
        context: { awaitingUserConfirmation: true },
        suggestedNextStep: '保存确认界面已显示，等待用户点击保存按钮',
        executed: true,
      }

    case 'navigateToPage':
      return {
        success: true,
        message: `正在导航到 ${args.page || ''} 页面`,
        context: { targetPage: args.page, params: args.params },
        suggestedNextStep: '页面导航已发起，用户将看到新页面。可以继续引导用户操作',
        executed: true,
      }

    case 'optimizeForAI':
      return {
        success: true,
        message: '图片优化处理中',
        context: {
          photoId: args.photoId,
          targetService: args.targetService,
        },
        suggestedNextStep: '图片正在优化，完成后可以提交到 AI 服务',
        executed: true,
      }

    case 'generateVideo':
      return {
        success: true,
        message: '视频生成任务已提交',
        context: {
          type: args.type,
          photoIds: args.photoIds,
          duration: args.duration,
          isAsyncTask: true,
        },
        suggestedNextStep: '任务已提交到后台，告知用户任务已开始处理，完成后会收到通知',
        executed: true,
      }

    case 'fusePhotos':
      return {
        success: true,
        message: '照片融合任务已提交',
        context: {
          photoIds: args.photoIds,
          prompt: args.prompt,
          isAsyncTask: true,
        },
        suggestedNextStep: '融合任务已提交到后台，告知用户任务已开始处理，完成后会收到通知',
        executed: true,
      }

    default:
      return {
        success: true,
        message: `工具 ${toolName} 执行成功`,
        context: { args },
        suggestedNextStep: '操作已完成，根据用户需求决定下一步',
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

  // getSelectedPhotos 特殊处理：如果没有选中照片，直接发送 selection-guide 组件
  // 这确保用户一定能看到引导 UI，而不依赖 LLM 后续是否调用 renderUI
  if (toolName === 'getSelectedPhotos') {
    const selectedPhotos = agentContext?.selectedPhotos || []
    
    if (selectedPhotos.length === 0) {
      // 发送 tool_call 事件（前端仍需执行以保持状态一致）
      sse.write('tool_call', {
        id: toolCallId,
        name: toolName,
        arguments: args,
      })

      // ⭐ 关键：直接发送 selection-guide 组件，确保 UI 显示
      const surfaceId = `selection-guide-${toolCallId}-${Date.now()}`
      sse.write('a2ui', {
        type: 'beginRendering',
        surfaceId,
        component: {
          id: `selection-guide-${Date.now()}`,
          type: 'selection-guide',
          props: {
            title: '需要先选择照片',
            description: '请在时间线页面选择要操作的照片',
            targetAction: '操作',
            minPhotos: 1,
            showNavigateButton: true,
          },
        },
        dataModel: {},
      })

      return {
        toolCallId,
        name: toolName,
        result: JSON.stringify({
          success: true,
          message: '当前没有选中任何照片。已显示选择引导界面。',
          context: {
            selectedPhotoCount: 0,
            photos: [],
          },
          uiDisplayed: true,
          executed: true,
        }),
      }
    }
  }

  // 其他工具：发送 tool_call 事件给前端执行
  sse.write('tool_call', {
    id: toolCallId,
    name: toolName,
    arguments: args,
  })

  // 返回丰富的工具结果，帮助模型自我修正（传递 context 以获取真实的照片信息）
  const richResult = buildRichToolResult(toolName, args, agentContext)

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

/**
 * 累积流式工具调用
 * @description 处理 OpenAI 流式响应中的增量工具调用
 */
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
      // 累积参数
      if (delta.function?.arguments) {
        existing.argumentsBuffer += delta.function.arguments
      }
    } else {
      // 新工具调用
      buffers.set(delta.index, {
        index: delta.index,
        id: delta.id || '',
        name: delta.function?.name || '',
        argumentsBuffer: delta.function?.arguments || '',
      })
    }
  }
}

/**
 * 构建 assistant 消息（包含工具调用）
 */
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

// ============ LLM 调用与循环 (N0 流式执行引擎) ============

/**
 * N0 执行引擎 - 流式 Agent 循环
 * @description 实现 Token-by-Token 实时流式输出，遵循 Gemini 文档的 N0 循环理念
 * @param messages - 对话历史
 * @param sse - SSE 写入器
 * @param options - 配置选项
 */
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

  // ⭐ N0 核心循环
  while (iterations < maxIterations) {
    // 检查中断信号
    if (signal?.aborted) {
      console.log('⏸️ 任务被用户中断')
      sse.write('interrupted', { reason: 'user_abort', iterations })
      break
    }

    iterations++
    console.log(`🔄 Agent 循环 #${iterations}`)

    try {
      // ✨ 关键改造：启用流式（百炼 API 完全支持）
      const stream = await openai.chat.completions.create({
        model: 'glm-4.7',
        messages: currentMessages,
        tools: TOOLS,
        stream: true,
        stream_options: { include_usage: true },
      })

      // 流式处理
      let textContent = ''
      const toolCallBuffers = new Map<number, StreamingToolCall>()

      for await (const chunk of stream) {
        // 检查中断信号
        if (signal?.aborted) {
          console.log('⏸️ 流式响应被中断')
          break
        }

        const choice = chunk.choices[0]
        const delta = choice?.delta

        // 实时推送文本
        if (delta?.content) {
          textContent += delta.content
          sse.write('text_delta', { content: delta.content })
        }

        // 累积工具调用
        if (delta?.tool_calls) {
          accumulateToolCalls(delta.tool_calls, toolCallBuffers)
        }

        // 收集 Token 使用统计
        if (chunk.usage) {
          totalPromptTokens = chunk.usage.prompt_tokens || 0
          totalCompletionTokens = chunk.usage.completion_tokens || 0
        }
      }

      // 如果被中断，退出循环
      if (signal?.aborted) {
        sse.write('interrupted', { reason: 'user_abort', iterations })
        break
      }

      // 工具处理 + 结果回填
      if (toolCallBuffers.size > 0) {
        const toolCalls = Array.from(toolCallBuffers.values())
        console.log(`🔧 工具调用: ${toolCalls.length} 个`)

        // 添加 assistant 消息（包含工具调用）
        currentMessages.push(buildAssistantMessage(textContent, toolCalls))

        // 处理每个工具调用
        const toolResults: ToolCallResult[] = []
        for (const tc of toolCalls) {
          // 🔍 调试日志：打印原始参数字符串
          console.log(`  - ${tc.name} [id=${tc.id}] argumentsBuffer:`, JSON.stringify(tc.argumentsBuffer))
          
          let args: Record<string, unknown> = {}
          try {
            args = JSON.parse(tc.argumentsBuffer || '{}')
          } catch (parseError) {
            console.warn(`⚠️ 工具参数解析失败: ${tc.name}`, tc.argumentsBuffer, parseError)
          }
          console.log(`  - ${tc.name} parsed args:`, JSON.stringify(args))

          const result = processToolCall(tc.name, tc.id, args, sse, agentContext)
          toolResults.push(result)
        }

        // 添加工具结果消息
        for (const tr of toolResults) {
          currentMessages.push({
            role: 'tool',
            tool_call_id: tr.toolCallId,
            content: tr.result,
          } as ChatCompletionToolMessageParam)
        }

        // 继续循环，让 LLM 处理工具结果
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
    const body: AgentGatewayRequest = await req.json()
    const { messages, context, threadId } = body

    if (!messages || messages.length === 0) {
      return new Response(
        JSON.stringify({ error: 'messages 不能为空' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
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

console.log('🚀 Agent Gateway Function 已启动')