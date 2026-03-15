/**
 * Agent Loop - LLM 调用与多轮工具循环
 *
 * 实现 Agent Loop 模式：LLM 生成 → 工具调用 → 结果回填 → 再次调用 LLM
 */

import OpenAI from 'npm:openai@4'
import type {
  ChatCompletionMessageParam,
  ChatCompletionToolMessageParam,
} from 'npm:openai@4/resources'
import type { AgentContext, SSEWriter, StreamingToolCall, ToolCallResult } from './types.ts'
import { TOOLS, processToolCall } from './tools.ts'
import { accumulateToolCalls, buildAssistantMessage } from './sse.ts'

const openai = new OpenAI({
  apiKey: Deno.env.get('ALIYUN_BAILIAN_API_KEY') || '',
  baseURL: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
})

export async function runAgentLoop(
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
        model: 'qwen-plus',
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
