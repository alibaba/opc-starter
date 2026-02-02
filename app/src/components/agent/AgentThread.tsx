/**
 * AgentThread - 对话消息列表组件
 * @description 渲染完整的对话消息列表，支持自动滚动和上下文感知推荐
 * @version 1.2.0
 * @see STORY-23-004, STORY-23-006
 */

import { useEffect, useRef } from 'react';
import { Bot, Sparkles, MapPin, AlertCircle } from 'lucide-react';
import { useAgentStore } from '@/stores/useAgentStore';
import { useAgentChat } from '@/hooks/useAgentChat';
import { useContextualSuggestions } from '@/hooks/useContextualSuggestions';
import { AgentMessage } from './AgentMessage';
import { cn } from '@/lib/utils';

/**
 * 对话消息列表组件
 */
export function AgentThread() {
  const messages = useAgentStore((state) => state.messages);
  const isStreaming = useAgentStore((state) => state.isStreaming);
  const handleUserAction = useAgentStore((state) => state.handleUserAction);

  const scrollRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  // 自动滚动到底部
  useEffect(() => {
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isStreaming]);

  // 空状态 - 使用上下文感知推荐
  if (messages.length === 0) {
    return <EmptyStateWithSuggestions />;
  }

  return (
    <div
      ref={scrollRef}
      className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent"
    >
      {/* 消息列表 */}
      <div className="py-2">
        {messages.map((message) => (
          <AgentMessage
            key={message.id}
            message={message}
            onAction={handleUserAction}
          />
        ))}
      </div>

      {/* 滚动锚点 */}
      <div ref={bottomRef} />
    </div>
  );
}

/**
 * 空状态组件 - 显示上下文感知的推荐
 */
function EmptyStateWithSuggestions() {
  const {
    suggestions,
    emptyStateHint,
    currentPage,
    hasSelectedPhotos,
    selectedPhotoCount,
  } = useContextualSuggestions();

  // 页面名称映射
  const pageNames: Record<string, string> = {
    timeline: '时间线',
    album: '相册',
    editor: '编辑器',
    'ai-studio': 'AI 工作室',
    search: '搜索',
    persons: '人物',
  };

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-6 text-center overflow-y-auto">
      {/* 头部 */}
      <div className="w-16 h-16 rounded-2xl bg-linear-to-br from-primary/20 to-accent/20 flex items-center justify-center mb-4">
        <Bot className="w-8 h-8 text-primary" />
      </div>
      <h3 className="text-lg font-semibold text-foreground mb-2">
        Photo Wall 助手
      </h3>
      
      {/* 上下文信息 */}
      <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
        <MapPin className="w-3 h-3" />
        <span>当前: {pageNames[currentPage] || currentPage}</span>
        {hasSelectedPhotos && (
          <span className="px-1.5 py-0.5 bg-primary/10 text-primary rounded-full">
            {selectedPhotoCount} 张照片
          </span>
        )}
      </div>

      {/* 空状态提示 */}
      {emptyStateHint && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground mt-2 px-3 py-2 bg-muted/50 rounded-lg">
          <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
          <span>{emptyStateHint}</span>
        </div>
      )}

      {/* 智能推荐按钮 */}
      <div className="mt-5 space-y-2 w-full max-w-[320px]">
        {suggestions.slice(0, 4).map((suggestion, index) => (
          <SuggestionButton
            key={`${suggestion.text}-${index}`}
            text={suggestion.text}
            icon={suggestion.icon}
            navigationHint={suggestion.navigationHint}
            canExecute={suggestion.canExecute}
          />
        ))}
      </div>
    </div>
  );
}

/**
 * 快捷建议按钮
 */
function SuggestionButton({
  text,
  icon,
  navigationHint,
  canExecute = true,
}: {
  text: string;
  icon: string;
  navigationHint?: string;
  canExecute?: boolean;
}) {
  const { sendMessage, isStreaming } = useAgentChat();

  const handleClick = async () => {
    if (isStreaming) return;
    
    // 如果有导航提示，发送时包含提示信息让 AI 处理
    if (navigationHint) {
      sendMessage(`${text}（${navigationHint}）`);
    } else {
      sendMessage(text);
    }
  };

  return (
    <button
      onClick={handleClick}
      disabled={isStreaming}
      className={cn(
        'w-full flex items-start gap-3 px-4 py-3 rounded-xl border transition-all text-left group',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        canExecute
          ? 'border-border bg-card hover:bg-secondary hover:border-primary/30'
          : 'border-border/50 bg-muted/30 hover:bg-muted/50'
      )}
    >
      <span className="text-lg flex-shrink-0">{icon}</span>
      <div className="flex-1 min-w-0">
        <span
          className={cn(
            'text-sm block transition-colors',
            canExecute
              ? 'text-foreground group-hover:text-primary'
              : 'text-muted-foreground'
          )}
        >
          {text}
        </span>
        {navigationHint && (
          <span className="text-[11px] text-muted-foreground/80 block mt-0.5">
            {navigationHint}
          </span>
        )}
      </div>
      <Sparkles
        className={cn(
          'w-3.5 h-3.5 flex-shrink-0 mt-0.5 transition-colors',
          canExecute
            ? 'text-muted-foreground/50 group-hover:text-primary/50'
            : 'text-muted-foreground/30'
        )}
      />
    </button>
  );
}
