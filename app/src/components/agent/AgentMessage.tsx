/**
 * AgentMessage - 消息气泡组件
 * @description 渲染对话中的单条消息
 * @version 1.0.0
 * @see STORY-23-004
 */

import { Bot, User, AlertCircle, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { AgentMessage as AgentMessageType } from '@/types/agent'
import type { UserActionMessage } from '@/types/a2ui'
import { A2UISurface } from './a2ui/A2UISurface'

interface AgentMessageProps {
  /** 消息数据 */
  message: AgentMessageType
  /** 用于 A2UI 交互 */
  onAction?: (surfaceId: string, componentId: string, actionId: string, value?: unknown) => void
}

/**
 * 消息气泡组件
 */
export function AgentMessage({ message, onAction }: AgentMessageProps) {
  const isUser = message.role === 'user'
  const isAssistant = message.role === 'assistant'
  const isError = message.role === 'system' && message.content.includes('错误')

  return (
    <div className={cn('flex gap-3 px-4 py-3', isUser && 'flex-row-reverse')}>
      {/* 头像 */}
      <div
        className={cn(
          'flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center',
          isUser
            ? 'bg-primary text-primary-foreground'
            : isError
              ? 'bg-destructive text-destructive-foreground'
              : 'bg-secondary text-secondary-foreground'
        )}
      >
        {isUser ? (
          <User className="w-4 h-4" />
        ) : isError ? (
          <AlertCircle className="w-4 h-4" />
        ) : (
          <Bot className="w-4 h-4" />
        )}
      </div>

      {/* 消息内容 */}
      <div className={cn('flex-1 max-w-[85%] space-y-2', isUser && 'flex flex-col items-end')}>
        {/* 文本内容 */}
        {message.content && (
          <div
            className={cn(
              'rounded-2xl px-4 py-2.5 text-sm leading-relaxed',
              isUser
                ? 'bg-primary text-primary-foreground rounded-tr-sm'
                : isError
                  ? 'bg-destructive/10 text-destructive border border-destructive/20 rounded-tl-sm'
                  : 'bg-secondary text-secondary-foreground rounded-tl-sm'
            )}
          >
            {/* 流式输出时的光标效果 */}
            {message.isStreaming ? (
              <span>
                {message.content}
                <span className="inline-block w-2 h-4 ml-0.5 bg-current animate-pulse" />
              </span>
            ) : (
              <span className="whitespace-pre-wrap">{message.content}</span>
            )}
          </div>
        )}

        {/* 加载中状态（无内容时） */}
        {message.isStreaming && !message.content && (
          <div className="flex items-center gap-2 text-muted-foreground text-sm">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>思考中...</span>
          </div>
        )}

        {/* A2UI Surface 渲染 */}
        {isAssistant &&
          message.a2uiMessages?.map((a2uiMsg, index) => {
            // 只渲染 beginRendering 类型且有有效 component 的消息
            if (a2uiMsg.type !== 'beginRendering' || !a2uiMsg.component) {
              return null
            }

            return (
              <div key={`${message.id}-surface-${index}`} className="mt-3">
                <A2UISurface
                  surfaceId={a2uiMsg.surfaceId}
                  component={a2uiMsg.component}
                  dataModel={a2uiMsg.dataModel || {}}
                  onAction={
                    onAction
                      ? (message: UserActionMessage) =>
                          onAction(
                            message.surfaceId,
                            message.componentId,
                            message.actionId,
                            message.value
                          )
                      : undefined
                  }
                />
              </div>
            )
          })}

        {/* 工具调用显示 */}
        {message.toolCalls && message.toolCalls.length > 0 && (
          <div className="mt-2 space-y-1">
            {message.toolCalls.map((tool) => (
              <div
                key={tool.id}
                className="text-xs text-muted-foreground flex items-center gap-1.5 px-2 py-1 rounded bg-muted/50"
              >
                <span className="font-mono">🔧 {tool.name}</span>
                {tool.result && (
                  <span
                    className={cn(
                      'px-1.5 py-0.5 rounded text-[10px]',
                      tool.result.success
                        ? 'bg-green-500/10 text-green-600'
                        : 'bg-red-500/10 text-red-600'
                    )}
                  >
                    {tool.result.success ? '成功' : '失败'}
                  </span>
                )}
              </div>
            ))}
          </div>
        )}

        {/* 时间戳 */}
        <span className="text-[10px] text-muted-foreground/60 px-1">
          {formatTime(message.timestamp)}
        </span>
      </div>
    </div>
  )
}

/**
 * 格式化时间
 */
function formatTime(date: Date): string {
  const now = new Date()
  const messageDate = new Date(date)

  // 同一天只显示时间
  if (
    now.getFullYear() === messageDate.getFullYear() &&
    now.getMonth() === messageDate.getMonth() &&
    now.getDate() === messageDate.getDate()
  ) {
    return messageDate.toLocaleTimeString('zh-CN', {
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  // 不同天显示日期和时间
  return messageDate.toLocaleString('zh-CN', {
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}
