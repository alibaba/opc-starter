/**
 * AgentWindow - 悬浮窗口容器
 * @description 可拖拽、可最小化的 AI 助手对话窗口
 * @version 1.0.0
 * @see STORY-23-004
 */

import { useState, useCallback, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import Draggable, { type DraggableData, type DraggableEvent } from 'react-draggable'
import { Bot, X, Minus, Maximize2, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { useAgentStore, getLastThreadId } from '@/stores/useAgentStore'
import { AgentThread } from './AgentThread'
import { AgentInput } from './AgentInput'
import { AgentResumeDialog } from './AgentResumeDialog'

interface AgentWindowProps {
  /** 是否显示 */
  isOpen: boolean
  /** 关闭回调 */
  onClose: () => void
}

/**
 * 窗口尺寸配置
 */
const WINDOW_SIZES = {
  expanded: { width: 420, height: 600 },
  minimized: { width: 280, height: 52 },
} as const

/**
 * 悬浮窗口容器
 */
export function AgentWindow({ isOpen, onClose }: AgentWindowProps) {
  const { t } = useTranslation('components')
  // 🔧 React 19 兼容性: 使用 nodeRef 避免 findDOMNode 错误
  const nodeRef = useRef<HTMLDivElement>(null)

  // 窗口状态
  const [isMinimized, setIsMinimized] = useState(false)
  const [position, setPosition] = useState({ x: 0, y: 0 })
  const [showResumeDialog, setShowResumeDialog] = useState(false)
  const [hasCheckedResume, setHasCheckedResume] = useState(false)

  // Store 状态
  const currentThreadId = useAgentStore((state) => state.currentThreadId)
  const createThread = useAgentStore((state) => state.createThread)
  const loadThread = useAgentStore((state) => state.loadThread)
  const clearThread = useAgentStore((state) => state.clearThread)
  const isStreaming = useAgentStore((state) => state.isStreaming)

  // 初始位置（右下角，留出边距）
  useEffect(() => {
    const updatePosition = () => {
      const windowWidth = window.innerWidth
      const windowHeight = window.innerHeight
      const { width, height } = WINDOW_SIZES.expanded

      setPosition({
        x: windowWidth - width - 24,
        y: windowHeight - height - 24,
      })
    }

    updatePosition()
    window.addEventListener('resize', updatePosition)
    return () => window.removeEventListener('resize', updatePosition)
  }, [])

  // 打开时检查是否有上次对话
  useEffect(() => {
    if (isOpen && !hasCheckedResume) {
      const lastThreadId = getLastThreadId()
      if (lastThreadId && !currentThreadId) {
        setShowResumeDialog(true)
      } else if (!currentThreadId) {
        // 没有上次对话，直接创建新对话
        createThread()
      }
      setHasCheckedResume(true)
    }
  }, [isOpen, hasCheckedResume, currentThreadId, createThread])

  // 关闭时重置检查状态
  useEffect(() => {
    if (!isOpen) {
      setHasCheckedResume(false)
    }
  }, [isOpen])

  // 拖拽处理
  const handleDrag = useCallback((_e: DraggableEvent, data: DraggableData) => {
    setPosition({ x: data.x, y: data.y })
  }, [])

  // 恢复上次对话
  const handleResume = useCallback(() => {
    const lastThreadId = getLastThreadId()
    if (lastThreadId) {
      loadThread(lastThreadId)
    }
    setShowResumeDialog(false)
  }, [loadThread])

  // 开始新对话
  const handleNewChat = useCallback(() => {
    createThread()
    setShowResumeDialog(false)
  }, [createThread])

  // 清空对话
  const handleClearChat = useCallback(() => {
    if (window.confirm(t('agent.confirmClearChat'))) {
      clearThread()
      createThread()
    }
  }, [clearThread, createThread, t])

  // 切换最小化
  const toggleMinimize = useCallback(() => {
    setIsMinimized((prev) => !prev)
  }, [])

  if (!isOpen) return null

  const currentSize = isMinimized ? WINDOW_SIZES.minimized : WINDOW_SIZES.expanded

  return (
    <>
      <Draggable
        nodeRef={nodeRef}
        handle=".agent-header"
        position={position}
        onDrag={handleDrag}
        bounds="parent"
      >
        <div
          ref={nodeRef}
          className={cn(
            'fixed z-50 flex flex-col',
            'bg-card border border-border rounded-2xl shadow-2xl',
            'transition-[width,height] duration-200 ease-out',
            'overflow-hidden'
          )}
          style={{
            width: currentSize.width,
            height: currentSize.height,
          }}
        >
          {/* 标题栏 - 可拖拽 */}
          <header
            className={cn(
              'agent-header flex-shrink-0 flex items-center justify-between',
              'px-4 h-[52px] cursor-move select-none',
              'border-b border-border bg-card',
              'rounded-t-2xl'
            )}
          >
            {/* 左侧标题 */}
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-linear-to-br from-primary to-accent flex items-center justify-center">
                <Bot className="w-4 h-4 text-white" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-foreground leading-tight">
                  {t('agent.windowTitle')}
                </h3>
                {!isMinimized && (
                  <p className="text-[10px] text-muted-foreground">
                    {isStreaming ? t('agent.thinking') : t('agent.online')}
                  </p>
                )}
              </div>
            </div>

            {/* 右侧按钮 */}
            <div className="flex items-center gap-1">
              {/* 清空对话 */}
              {!isMinimized && currentThreadId && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-muted-foreground hover:text-destructive"
                  onClick={handleClearChat}
                  title={t('agent.clearChatTitle')}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              )}

              {/* 最小化/最大化 */}
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-muted-foreground hover:text-foreground"
                onClick={toggleMinimize}
                title={isMinimized ? t('agent.expandTitle') : t('agent.minimizeTitle')}
              >
                {isMinimized ? (
                  <Maximize2 className="w-3.5 h-3.5" />
                ) : (
                  <Minus className="w-3.5 h-3.5" />
                )}
              </Button>

              {/* 关闭 */}
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-muted-foreground hover:text-destructive"
                onClick={onClose}
                title={t('agent.closeTitle')}
              >
                <X className="w-3.5 h-3.5" />
              </Button>
            </div>
          </header>

          {/* 内容区域 */}
          {!isMinimized && (
            <>
              {/* 消息列表 */}
              <AgentThread />

              {/* 输入框 */}
              <AgentInput />
            </>
          )}
        </div>
      </Draggable>

      {/* 恢复对话弹窗 */}
      <AgentResumeDialog
        open={showResumeDialog}
        onOpenChange={setShowResumeDialog}
        onNewChat={handleNewChat}
        onResume={handleResume}
      />
    </>
  )
}
