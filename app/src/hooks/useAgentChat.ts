/**
 * useAgentChat Hook - Agent 对话集成层
 * @description 整合 SSE Client、Tool Executor 和 Store，提供完整的对话能力
 * @version 2.0.0 - H2A 异步转向支持
 * @see STORY-23-004, STORY-23-006, STORY-23-009
 */

import { useCallback, useRef, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAgentSSE } from '@/lib/agent/sseClient'
import { useToolExecutor, setNavigateCallback } from '@/lib/agent/toolExecutor'
import { useAgentStore, useA2UIMessageHandler } from '@/stores/useAgentStore'
import { useAgentContext, generateContextSummary } from '@/hooks/useAgentContext'
import type { AgentMessage, AgentMessageRole, ToolCall } from '@/types/agent'
import type { A2UIServerMessage } from '@/types/a2ui'

/**
 * 生成唯一 ID
 */
function generateId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`
}

/**
 * useAgentChat Hook 返回类型
 */
export interface UseAgentChatReturn {
  /** 发送用户消息 */
  sendMessage: (content: string) => Promise<void>
  /** 是否正在流式传输 */
  isStreaming: boolean
  /** 是否已被中断 */
  isAborted: boolean
  /** 中断当前请求 (H2A 异步转向) */
  abort: () => void
  /** 错误信息 */
  error: Error | null
  /** 重试次数 */
  retryCount: number
}

/**
 * Agent 对话 Hook
 * @description 整合 SSE、工具执行和状态管理的核心 Hook
 * @version 2.0.0 - 支持 H2A 异步转向（用户中断）
 */
export function useAgentChat(): UseAgentChatReturn {
  // 导航
  const navigate = useNavigate()

  // H2A 异步转向状态
  const [isAborted, setIsAborted] = useState(false)
  const abortControllerRef = useRef<AbortController | null>(null)

  // Store 状态和方法
  // messages 通过 useAgentStore.getState().messages 直接访问以避免不必要的重渲染
  const currentThreadId = useAgentStore((s) => s.currentThreadId)
  const appendMessage = useAgentStore((s) => s.appendMessage)
  const updateMessage = useAgentStore((s) => s.updateMessage)
  const setStreaming = useAgentStore((s) => s.setStreaming)
  const setError = useAgentStore((s) => s.setError)
  const createThread = useAgentStore((s) => s.createThread)

  // 上下文
  const context = useAgentContext()

  // 注册导航回调
  useEffect(() => {
    setNavigateCallback((path: string) => {
      console.log('[AgentChat] 导航到:', path)
      navigate(path)
    })

    return () => {
      setNavigateCallback(null)
    }
  }, [navigate])

  // A2UI 消息处理
  const { handleMessage: handleA2UIMessage } = useA2UIMessageHandler()

  // 工具执行器
  const { executeToolCall } = useToolExecutor()

  // 当前助手消息 ID 引用
  const currentAssistantMsgIdRef = useRef<string | null>(null)
  // 累积的文本内容
  const accumulatedTextRef = useRef<string>('')
  // 累积的 A2UI 消息
  const accumulatedA2UIRef = useRef<A2UIServerMessage[]>([])
  // 待处理的工具调用
  const pendingToolCallsRef = useRef<ToolCall[]>([])

  /**
   * 处理文本增量
   */
  const handleTextDelta = useCallback(
    (content: string) => {
      accumulatedTextRef.current += content

      if (currentAssistantMsgIdRef.current) {
        updateMessage(currentAssistantMsgIdRef.current, {
          content: accumulatedTextRef.current,
          isStreaming: true,
        })
      }
    },
    [updateMessage]
  )

  /**
   * 处理 A2UI 消息
   */
  const handleA2UI = useCallback(
    (message: A2UIServerMessage) => {
      console.log('[AgentChat] 收到 A2UI 消息:', message.type)

      // 累积 A2UI 消息
      accumulatedA2UIRef.current.push(message)

      // 处理 A2UI 消息（更新 Surface 等）
      handleA2UIMessage(message)

      // 更新消息中的 A2UI 列表
      if (currentAssistantMsgIdRef.current) {
        updateMessage(currentAssistantMsgIdRef.current, {
          a2uiMessages: [...accumulatedA2UIRef.current],
        })
      }
    },
    [handleA2UIMessage, updateMessage]
  )

  /**
   * 处理工具调用
   */
  const handleToolCall = useCallback(
    async (call: ToolCall) => {
      console.log('[AgentChat] 收到工具调用:', call.name)

      // 添加到待处理列表
      pendingToolCallsRef.current.push(call)

      // 更新消息中的工具调用列表
      if (currentAssistantMsgIdRef.current) {
        updateMessage(currentAssistantMsgIdRef.current, {
          toolCalls: [...pendingToolCallsRef.current],
        })
      }
    },
    [updateMessage]
  )

  /**
   * 处理完成事件
   */
  const handleDone = useCallback(
    async (usage?: { prompt_tokens: number; completion_tokens: number }) => {
      console.log('[AgentChat] 对话完成', usage)

      // 标记消息完成
      if (currentAssistantMsgIdRef.current) {
        updateMessage(currentAssistantMsgIdRef.current, {
          isStreaming: false,
        })
      }

      // 执行待处理的工具调用
      if (pendingToolCallsRef.current.length > 0) {
        console.log('[AgentChat] 执行工具调用...')

        for (const toolCall of pendingToolCallsRef.current) {
          const result = await executeToolCall(toolCall)

          // 更新工具调用结果
          if (currentAssistantMsgIdRef.current) {
            const currentMsg = useAgentStore
              .getState()
              .messages.find((m) => m.id === currentAssistantMsgIdRef.current)
            if (currentMsg?.toolCalls) {
              const updatedToolCalls = currentMsg.toolCalls.map((tc) =>
                tc.id === toolCall.id ? { ...tc, result } : tc
              )
              updateMessage(currentAssistantMsgIdRef.current, {
                toolCalls: updatedToolCalls,
              })
            }

            // 如果工具返回了 A2UI 组件，添加到消息的 a2uiMessages 中
            if (result.ui) {
              const a2uiMessage: A2UIServerMessage = {
                type: 'beginRendering',
                surfaceId: `tool-result-${toolCall.id}`,
                component: result.ui,
              }

              // 累积 A2UI 消息
              accumulatedA2UIRef.current.push(a2uiMessage)

              // 更新消息中的 A2UI 列表
              updateMessage(currentAssistantMsgIdRef.current, {
                a2uiMessages: [...accumulatedA2UIRef.current],
              })

              // 同时更新 Surface（用于独立渲染区域）
              handleA2UIMessage(a2uiMessage)

              console.log('[AgentChat] 工具返回 A2UI 组件:', toolCall.name, result.ui.type)
            }
          }

          console.log('[AgentChat] 工具执行结果:', toolCall.name, result)
        }
      }

      setStreaming(false)
    },
    [executeToolCall, updateMessage, setStreaming, handleA2UIMessage]
  )

  /**
   * 处理错误
   */
  const handleError = useCallback(
    (error: Error) => {
      console.error('[AgentChat] 错误:', error)

      // 标记消息完成
      if (currentAssistantMsgIdRef.current) {
        updateMessage(currentAssistantMsgIdRef.current, {
          isStreaming: false,
          content: accumulatedTextRef.current || `⚠️ ${error.message}`,
        })
      }

      setError(error.message)
      setStreaming(false)
    },
    [updateMessage, setError, setStreaming]
  )

  /**
   * 处理中断事件 (H2A)
   */
  const handleInterrupted = useCallback(() => {
    console.log('[AgentChat] 任务已中断')
    setIsAborted(true)

    // 标记当前消息为已中断
    if (currentAssistantMsgIdRef.current) {
      updateMessage(currentAssistantMsgIdRef.current, {
        isStreaming: false,
        content: accumulatedTextRef.current + '\n\n⏸️ *任务已中断*',
      })
    }

    setStreaming(false)
  }, [updateMessage, setStreaming])

  // SSE 客户端
  const {
    sendMessage: sseConnect,
    isStreaming,
    abort: sseAbort,
    error,
    retryCount,
  } = useAgentSSE({
    onTextDelta: handleTextDelta,
    onA2UI: handleA2UI,
    onToolCall: handleToolCall,
    onDone: handleDone,
    onError: handleError,
    autoRetry: true,
  })

  /**
   * H2A 中断当前任务
   * @description 中断即终止，不保存进度，保持简洁
   */
  const abort = useCallback(() => {
    console.log('[AgentChat] 用户中断任务')

    // 中断 AbortController
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
      abortControllerRef.current = null
    }

    // 调用 SSE abort
    sseAbort()

    // 触发中断处理
    handleInterrupted()
  }, [sseAbort, handleInterrupted])

  /**
   * 发送用户消息
   */
  const sendMessage = useCallback(
    async (content: string) => {
      const trimmed = content.trim()
      if (!trimmed) return

      // 确保有会话
      let threadId = currentThreadId
      if (!threadId) {
        threadId = await createThread()
      }

      // 重置累积状态
      accumulatedTextRef.current = ''
      accumulatedA2UIRef.current = []
      pendingToolCallsRef.current = []

      // H2A: 初始化 AbortController 和重置中断状态
      abortControllerRef.current = new AbortController()
      setIsAborted(false)

      // 1. 创建用户消息
      const userMessage: AgentMessage = {
        id: generateId('msg'),
        role: 'user' as AgentMessageRole,
        content: trimmed,
        timestamp: new Date(),
      }
      appendMessage(userMessage)

      // 2. 创建助手消息占位
      const assistantMessageId = generateId('msg')
      currentAssistantMsgIdRef.current = assistantMessageId

      const assistantMessage: AgentMessage = {
        id: assistantMessageId,
        role: 'assistant' as AgentMessageRole,
        content: '',
        timestamp: new Date(),
        isStreaming: true,
      }
      appendMessage(assistantMessage)

      // 3. 设置状态
      setStreaming(true)
      setError(null)

      // 4. 构建消息历史（带上下文）
      const allMessages = useAgentStore.getState().messages
      const messageHistory: AgentMessage[] = allMessages.slice(0, -1) // 排除刚创建的空助手消息

      // 添加上下文摘要作为系统消息
      const contextSummary = generateContextSummary(context)
      const systemMessage: AgentMessage = {
        id: generateId('sys'),
        role: 'system' as AgentMessageRole,
        content: `当前上下文:\n${contextSummary}`,
        timestamp: new Date(),
      }

      // 5. 发送到 SSE
      try {
        await sseConnect([systemMessage, ...messageHistory], context)
      } catch (err) {
        // 错误已在 handleError 中处理
        console.error('[AgentChat] 发送失败:', err)
      }
    },
    [currentThreadId, createThread, appendMessage, setStreaming, setError, context, sseConnect]
  )

  return {
    sendMessage,
    isStreaming,
    isAborted,
    abort,
    error,
    retryCount,
  }
}

export default useAgentChat
