/**
 * SSE Client Hook - Agent 流式通信客户端
 * @description 连接 ai-assistant，处理 SSE 流式响应
 * @version 2.0.0
 * @see STORY-23-006
 */

import { useState, useCallback, useRef } from 'react'
import { supabase } from '@/lib/supabase/client'
import type {
  SSEEvent,
  SSETextDeltaEvent,
  SSEA2UIEvent,
  SSEToolCallEvent,
  SSEThinkingEvent,
  SSEDoneEvent,
  SSEErrorEvent,
  AgentMessage,
  AgentContext,
  ToolCall,
} from '@/types/agent'
import type { A2UIServerMessage } from '@/types/a2ui'

// ============ 配置 ============

/**
 * 重试配置
 */
export const RETRY_CONFIG = {
  maxRetries: 3,
  baseDelay: 1000, // 1s
  maxDelay: 10000, // 10s
  backoffMultiplier: 2,
} as const

/**
 * SSE 事件头
 */
const SSE_HEADERS = {
  'Content-Type': 'application/json',
  Accept: 'text/event-stream',
}

// ============ 类型定义 ============

/**
 * SSE Hook 配置选项
 */
export interface UseAgentSSEOptions {
  /** 文本增量回调 */
  onTextDelta?: (content: string) => void
  /** A2UI 消息回调 */
  onA2UI?: (message: A2UIServerMessage) => void
  /** 工具调用回调 */
  onToolCall?: (call: ToolCall) => void
  /** 思考过程回调 */
  onThinking?: (content: string) => void
  /** 完成回调 */
  onDone?: (usage?: { prompt_tokens: number; completion_tokens: number }) => void
  /** 错误回调 */
  onError?: (error: Error) => void
  /** 自动重试 */
  autoRetry?: boolean
}

/**
 * SSE Hook 返回值
 */
export interface UseAgentSSEReturn {
  /** 发送消息到 Agent */
  sendMessage: (messages: AgentMessage[], context?: AgentContext) => Promise<void>
  /** 发送工具执行结果 */
  sendToolResult: (messages: AgentMessage[], toolCallId: string, result: unknown) => Promise<void>
  /** 是否正在流式传输 */
  isStreaming: boolean
  /** 中断当前请求 */
  abort: () => void
  /** 当前错误 */
  error: Error | null
  /** 重试次数 */
  retryCount: number
}

// ============ SSE 解析器 ============

/**
 * 解析单个 SSE 事件
 * @param eventType - 事件类型
 * @param data - 事件数据字符串
 * @returns 解析后的 SSE 事件
 */
function parseSSEEvent(eventType: string, data: string): SSEEvent | null {
  try {
    const parsed = JSON.parse(data)

    switch (eventType) {
      case 'text_delta':
        return {
          type: 'text_delta',
          content: parsed.content || '',
        } as SSETextDeltaEvent

      case 'a2ui':
        return {
          type: 'a2ui',
          message: parsed,
        } as SSEA2UIEvent

      case 'tool_call':
        return {
          type: 'tool_call',
          id: parsed.id,
          name: parsed.name,
          arguments: parsed.arguments || {},
        } as SSEToolCallEvent

      case 'thinking':
        return {
          type: 'thinking',
          content: parsed.content || '',
        } as SSEThinkingEvent

      case 'done':
        return {
          type: 'done',
          usage: parsed.usage,
        } as SSEDoneEvent

      case 'error':
        return {
          type: 'error',
          message: parsed.message || '未知错误',
          code: parsed.code,
        } as SSEErrorEvent

      default:
        console.warn('[SSE] 未知事件类型:', eventType)
        return null
    }
  } catch (e) {
    console.error('[SSE] 解析事件失败:', { eventType, data, error: e })
    return null
  }
}

/**
 * 解析 SSE 流数据
 * @param chunk - 原始数据块
 * @param buffer - 缓冲区
 * @returns 解析出的事件列表和剩余缓冲区
 */
function parseSSEChunk(
  chunk: string,
  buffer: string
): { events: SSEEvent[]; remainingBuffer: string } {
  const events: SSEEvent[] = []
  const fullData = buffer + chunk
  const lines = fullData.split('\n')

  let currentEvent: string | null = null
  let currentData: string | null = null
  let processedIndex = 0

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]

    // 空行表示事件结束
    if (line === '') {
      if (currentEvent && currentData) {
        const event = parseSSEEvent(currentEvent, currentData)
        if (event) {
          events.push(event)
        }
        currentEvent = null
        currentData = null
      }
      processedIndex = lines.slice(0, i + 1).join('\n').length + 1
      continue
    }

    // 解析事件类型
    if (line.startsWith('event: ')) {
      currentEvent = line.slice(7).trim()
      continue
    }

    // 解析数据
    if (line.startsWith('data: ')) {
      currentData = line.slice(6)
      continue
    }
  }

  // 返回未处理的缓冲区（不完整的事件）
  const remainingBuffer = fullData.slice(processedIndex)

  return { events, remainingBuffer }
}

// ============ 重试工具 ============

/**
 * 带重试的异步执行
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  config = RETRY_CONFIG,
  onRetry?: (attempt: number, error: Error) => void
): Promise<T> {
  let lastError: Error = new Error('未知错误')

  for (let i = 0; i < config.maxRetries; i++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error))

      // 如果是用户主动取消，不重试
      if (lastError.name === 'AbortError') {
        throw lastError
      }

      // 计算重试延迟
      const delay = Math.min(
        config.baseDelay * Math.pow(config.backoffMultiplier, i),
        config.maxDelay
      )

      console.warn(`[SSE] 第 ${i + 1} 次重试，${delay}ms 后...`, lastError.message)
      onRetry?.(i + 1, lastError)

      await new Promise((resolve) => setTimeout(resolve, delay))
    }
  }

  throw lastError
}

// ============ 主 Hook ============

/**
 * Agent SSE 客户端 Hook
 * @param options - 配置选项
 * @returns SSE 客户端方法
 */
export function useAgentSSE(options: UseAgentSSEOptions = {}): UseAgentSSEReturn {
  const { onTextDelta, onA2UI, onToolCall, onThinking, onDone, onError, autoRetry = true } = options

  const [isStreaming, setIsStreaming] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const [retryCount, setRetryCount] = useState(0)
  const abortRef = useRef<AbortController | null>(null)

  /**
   * 获取 Access Token
   */
  const getAccessToken = useCallback(async (): Promise<string> => {
    const { data, error: authError } = await supabase.auth.getSession()

    if (authError || !data.session?.access_token) {
      throw new Error('未登录或登录已过期')
    }

    return data.session.access_token
  }, [])

  /**
   * 处理 SSE 事件
   */
  const handleSSEEvent = useCallback(
    (event: SSEEvent) => {
      switch (event.type) {
        case 'text_delta':
          onTextDelta?.(event.content)
          break

        case 'a2ui':
          onA2UI?.(event.message)
          break

        case 'tool_call':
          onToolCall?.({
            id: event.id,
            name: event.name,
            arguments: event.arguments,
          })
          break

        case 'thinking':
          onThinking?.(event.content)
          break

        case 'done':
          onDone?.(event.usage)
          break

        case 'error': {
          const err = new Error(event.message)
          setError(err)
          onError?.(err)
          break
        }
      }
    },
    [onTextDelta, onA2UI, onToolCall, onThinking, onDone, onError]
  )

  /**
   * 执行 SSE 请求
   */
  const executeRequest = useCallback(
    async (body: {
      messages: Array<{ role: string; content: string; tool_call_id?: string }>
      context?: AgentContext
    }) => {
      const token = await getAccessToken()
      const gatewayUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-assistant`

      const response = await fetch(gatewayUrl, {
        method: 'POST',
        headers: {
          ...SSE_HEADERS,
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
        signal: abortRef.current?.signal,
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || `HTTP ${response.status}`)
      }

      // 读取 SSE 流
      const reader = response.body?.getReader()
      if (!reader) {
        throw new Error('无法读取响应流')
      }

      const decoder = new TextDecoder()
      let buffer = ''

      try {
        while (true) {
          const { done, value } = await reader.read()

          if (done) {
            break
          }

          const chunk = decoder.decode(value, { stream: true })
          const { events, remainingBuffer } = parseSSEChunk(chunk, buffer)
          buffer = remainingBuffer

          for (const event of events) {
            handleSSEEvent(event)
          }
        }
      } finally {
        reader.releaseLock()
      }
    },
    [getAccessToken, handleSSEEvent]
  )

  /**
   * 发送消息
   */
  const sendMessage = useCallback(
    async (messages: AgentMessage[], context?: AgentContext) => {
      // 取消之前的请求
      abortRef.current?.abort()
      abortRef.current = new AbortController()

      setIsStreaming(true)
      setError(null)
      setRetryCount(0)

      try {
        // 转换消息格式
        const formattedMessages = messages.map((msg) => ({
          role: msg.role,
          content: msg.content,
        }))

        const requestFn = () =>
          executeRequest({
            messages: formattedMessages,
            context,
          })

        if (autoRetry) {
          await withRetry(requestFn, RETRY_CONFIG, (attempt) => {
            setRetryCount(attempt)
          })
        } else {
          await requestFn()
        }
      } catch (err) {
        if ((err as Error).name !== 'AbortError') {
          const error = err instanceof Error ? err : new Error(String(err))
          setError(error)
          onError?.(error)
        }
      } finally {
        setIsStreaming(false)
      }
    },
    [executeRequest, autoRetry, onError]
  )

  /**
   * 发送工具执行结果
   */
  const sendToolResult = useCallback(
    async (messages: AgentMessage[], toolCallId: string, result: unknown) => {
      // 取消之前的请求
      abortRef.current?.abort()
      abortRef.current = new AbortController()

      setIsStreaming(true)
      setError(null)
      setRetryCount(0)

      try {
        // 转换消息格式，添加工具结果
        const formattedMessages = messages.map((msg) => ({
          role: msg.role,
          content: msg.content,
          ...(msg.role === 'tool' ? { tool_call_id: toolCallId } : {}),
        }))

        // 追加工具结果消息
        formattedMessages.push({
          role: 'tool',
          content: JSON.stringify(result),
          tool_call_id: toolCallId,
        })

        const requestFn = () =>
          executeRequest({
            messages: formattedMessages,
          })

        if (autoRetry) {
          await withRetry(requestFn, RETRY_CONFIG, (attempt) => {
            setRetryCount(attempt)
          })
        } else {
          await requestFn()
        }
      } catch (err) {
        if ((err as Error).name !== 'AbortError') {
          const error = err instanceof Error ? err : new Error(String(err))
          setError(error)
          onError?.(error)
        }
      } finally {
        setIsStreaming(false)
      }
    },
    [executeRequest, autoRetry, onError]
  )

  /**
   * 中断请求
   */
  const abort = useCallback(() => {
    abortRef.current?.abort()
    setIsStreaming(false)
  }, [])

  return {
    sendMessage,
    sendToolResult,
    isStreaming,
    abort,
    error,
    retryCount,
  }
}

export default useAgentSSE
