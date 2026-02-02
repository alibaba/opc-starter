/**
 * AgentButton - 侧边栏 Agent 按钮
 * @description 触发打开 Agent 悬浮窗口的按钮
 * @version 1.0.0
 * @see STORY-23-004
 */

import { Bot, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAgentStore } from '@/stores/useAgentStore';

interface AgentButtonProps {
  /** 是否折叠模式（仅显示图标） */
  isCollapsed?: boolean;
  /** 自定义类名 */
  className?: string;
}

/**
 * 侧边栏 Agent 按钮
 */
export function AgentButton({ isCollapsed = false, className }: AgentButtonProps) {
  const togglePanel = useAgentStore((state) => state.togglePanel);
  const isPanelOpen = useAgentStore((state) => state.isPanelOpen);

  return (
    <button
      onClick={togglePanel}
      className={cn(
        'group relative flex items-center gap-3 w-full rounded-lg transition-all',
        'text-foreground hover:bg-secondary hover:text-secondary-foreground',
        isCollapsed
          ? 'justify-center px-0 py-2.5 md:justify-center'
          : 'px-3 md:px-4 py-2.5 md:py-3',
        isPanelOpen && 'bg-primary text-primary-foreground',
        className
      )}
      title="AI 助手"
    >
      {/* 图标容器 */}
      <div
        className={cn(
          'relative flex items-center justify-center w-5 h-5 flex-shrink-0',
          !isPanelOpen && 'group-hover:scale-110 transition-transform'
        )}
      >
        <Bot className="w-5 h-5" />
        
        {/* 动态光效 */}
        {!isPanelOpen && (
          <Sparkles
            className={cn(
              'absolute -top-1 -right-1 w-3 h-3',
              'text-accent animate-pulse',
              isCollapsed && 'hidden md:block'
            )}
          />
        )}
      </div>

      {/* 文字标签 */}
      <span
        className={cn(
          'font-medium text-sm md:text-base whitespace-nowrap',
          isCollapsed && 'md:hidden'
        )}
      >
        AI 助手
      </span>

      {/* 活跃指示器 */}
      {isPanelOpen && !isCollapsed && (
        <div className="ml-auto flex items-center">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary-foreground/50" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-primary-foreground" />
          </span>
        </div>
      )}
    </button>
  );
}

/**
 * 浮动 Agent 按钮（移动端或无侧边栏场景）
 */
export function FloatingAgentButton({ className }: { className?: string }) {
  const togglePanel = useAgentStore((state) => state.togglePanel);
  const isPanelOpen = useAgentStore((state) => state.isPanelOpen);

  return (
    <button
      onClick={togglePanel}
      className={cn(
        'fixed bottom-6 right-6 z-40',
        'w-14 h-14 rounded-full',
        'bg-primary text-primary-foreground shadow-lg',
        'flex items-center justify-center',
        'hover:scale-105 active:scale-95 transition-transform',
        'focus:outline-none focus:ring-2 focus:ring-primary/50 focus:ring-offset-2',
        isPanelOpen && 'opacity-0 pointer-events-none',
        className
      )}
      title="AI 助手"
    >
      <Bot className="w-6 h-6" />
      
      {/* 脉冲动画 */}
      <span className="absolute inset-0 rounded-full bg-primary animate-ping opacity-20" />
    </button>
  );
}
