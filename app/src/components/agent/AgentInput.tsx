/**
 * AgentInput - 输入框组件
 * @description 用户输入消息的输入框，支持快捷键发送和推荐提示词
 * @version 1.2.0
 * @see STORY-23-004, STORY-23-006
 */

import { useState, useRef, useEffect, useMemo, type KeyboardEvent } from 'react'
import { Send, Image, Paperclip, Square, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { useAgentChat } from '@/hooks/useAgentChat'
import { useAgentContext } from '@/hooks/useAgentContext'
import { useAgentStore } from '@/stores/useAgentStore'

interface AgentInputProps {
  /** 自定义类名 */
  className?: string
}

/**
 * 推荐提示词类型
 */
interface SuggestedPrompt {
  id: string
  text: string
  /** 显示条件：返回 true 时显示 */
  condition: () => boolean
}

/**
 * 输入框组件
 */
export function AgentInput({ className }: AgentInputProps) {
  const [input, setInput] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // 使用 useAgentChat Hook 获取真正的发送能力
  const { sendMessage, isStreaming, abort, error, retryCount } = useAgentChat()

  const context = useAgentContext()
  const setContext = useAgentStore((state) => state.setContext)

  // 动态推荐提示词
  const suggestedPrompts = useMemo<SuggestedPrompt[]>(() => {
    return []
  }, [])

  // 过滤出当前应该显示的提示词
  const visiblePrompts = useMemo(
    () => suggestedPrompts.filter((p) => p.condition()),
    [suggestedPrompts]
  )

  // 同步上下文
  useEffect(() => {
    setContext(context)
  }, [context, setContext])

  // 自动调整高度
  useEffect(() => {
    const textarea = textareaRef.current
    if (textarea) {
      textarea.style.height = 'auto'
      textarea.style.height = `${Math.min(textarea.scrollHeight, 120)}px`
    }
  }, [input])

  // 发送消息
  const handleSend = async () => {
    const trimmed = input.trim()
    if (!trimmed || isStreaming) return

    // 发送消息（useAgentChat 内部会处理会话创建）
    setInput('')
    await sendMessage(trimmed)

    // 重置输入框高度
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
    }
  }

  // 点击推荐提示词发送
  const handlePromptClick = async (promptText: string) => {
    if (isStreaming) return
    await sendMessage(promptText)
  }

  // 键盘事件处理
  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    // Enter 发送（不带 Shift）
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  // 选中照片数量提示
  const selectedCount = context.selectedPhotos.length

  return (
    <div className={cn('border-t border-border bg-card', className)}>
      {/* 上下文提示 */}
      {selectedCount > 0 && (
        <div className="px-4 py-2 border-b border-border bg-muted/30 flex items-center gap-2 text-xs text-muted-foreground">
          <Image className="w-3.5 h-3.5" />
          <span>
            已选择 <span className="font-medium text-foreground">{selectedCount}</span> 张照片
          </span>
        </div>
      )}

      {/* 推荐提示词 */}
      {visiblePrompts.length > 0 && (
        <div className="px-3 py-2 border-b border-border bg-muted/20 flex items-center gap-2 flex-wrap">
          <Sparkles className="w-3.5 h-3.5 text-primary flex-shrink-0" />
          {visiblePrompts.map((prompt) => (
            <button
              key={prompt.id}
              onClick={() => handlePromptClick(prompt.text)}
              disabled={isStreaming}
              className={cn(
                'px-3 py-1.5 text-xs font-medium rounded-full',
                'bg-primary/10 text-primary hover:bg-primary/20',
                'border border-primary/20 hover:border-primary/40',
                'transition-colors duration-150',
                'disabled:opacity-50 disabled:cursor-not-allowed'
              )}
            >
              {prompt.text}
            </button>
          ))}
        </div>
      )}

      {/* 输入区域 */}
      <div className="p-3">
        <div className="flex items-end gap-2">
          {/* 附件按钮 */}
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-9 w-9 flex-shrink-0 text-muted-foreground hover:text-foreground"
            title="添加附件"
            disabled
          >
            <Paperclip className="w-4 h-4" />
          </Button>

          {/* 输入框 */}
          <div className="flex-1 relative">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="输入消息... (Enter 发送, Shift+Enter 换行)"
              disabled={isStreaming}
              rows={1}
              className={cn(
                'w-full resize-none rounded-xl border border-border bg-background px-4 py-2.5',
                'text-sm placeholder:text-muted-foreground',
                'focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary',
                'disabled:opacity-50 disabled:cursor-not-allowed',
                'scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent'
              )}
            />
          </div>

          {/* 发送/中断按钮 */}
          {isStreaming ? (
            <Button
              type="button"
              size="icon"
              variant="destructive"
              className="h-9 w-9 flex-shrink-0"
              onClick={abort}
              title="停止生成"
            >
              <Square className="w-3.5 h-3.5 fill-current" />
            </Button>
          ) : (
            <Button
              type="button"
              size="icon"
              className="h-9 w-9 flex-shrink-0"
              onClick={handleSend}
              disabled={!input.trim()}
            >
              <Send className="w-4 h-4" />
            </Button>
          )}
        </div>

        {/* 状态提示 */}
        <div className="text-[10px] text-muted-foreground/60 mt-2 text-center">
          {error ? (
            <span className="text-destructive">
              {retryCount > 0 ? `正在重试 (${retryCount}/3)...` : error.message}
            </span>
          ) : (
            <span>Photo Wall 助手可能会出错，请核实重要信息</span>
          )}
        </div>
      </div>
    </div>
  )
}
