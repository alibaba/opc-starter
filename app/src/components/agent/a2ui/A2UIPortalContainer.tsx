/**
 * A2UI Portal 容器组件
 * @description 将 A2UI 组件渲染到主内容区或全屏模态
 * @story STORY-23-012
 */

import { useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useAgentStore } from '@/stores/useAgentStore';
import { A2UIRenderer } from './A2UIRenderer';
import { Button } from '@/components/ui/button';
import { X, Minimize2 } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * A2UI Portal 容器
 * 根据 portalTarget 渲染到不同位置：
 * - main-area: 覆盖主内容区 (absolute 定位)
 * - fullscreen: 全屏模态 (Portal 到 body)
 */
export function A2UIPortalContainer() {
  const portalContent = useAgentStore((s) => s.portalContent);
  const portalTarget = useAgentStore((s) => s.portalTarget);
  const portalDataModel = useAgentStore((s) => s.portalDataModel);
  const closePortal = useAgentStore((s) => s.closePortal);
  const handleUserAction = useAgentStore((s) => s.handleUserAction);

  // ESC 键关闭 Portal
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (event.key === 'Escape' && portalContent) {
        const config = portalContent.portalConfig;
        if (config?.showClose !== false) {
          closePortal();
        }
      }
    },
    [portalContent, closePortal]
  );

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  // 无 Portal 内容或 inline 模式，不渲染
  if (!portalContent || portalTarget === 'inline') {
    return null;
  }

  const config = portalContent.portalConfig ?? {};

  // 处理用户 Action
  const handleAction = (componentId: string, actionId: string, value?: unknown) => {
    // 如果是关闭 action，关闭 Portal
    if (actionId === config.onClose) {
      closePortal();
    }
    // 调用 Store 的 handleUserAction
    handleUserAction(portalContent.id, componentId, actionId, value);
  };

  // 渲染内容
  const content = (
    <A2UIRenderer
      component={portalContent}
      dataModel={portalDataModel}
      onAction={handleAction}
    />
  );

  // main-area: 覆盖主内容区 (通过 CSS absolute 定位)
  if (portalTarget === 'main-area') {
    return (
      <div
        className="absolute inset-0 z-40 bg-background flex flex-col"
        data-testid="a2ui-portal-main-area"
      >
        {/* 顶部工具栏 */}
        <div className="flex-shrink-0 h-14 border-b flex items-center justify-between px-4 bg-background/95 backdrop-blur-sm">
          <span className="text-sm font-medium">
            {config.title || '预览'}
          </span>
          <div className="flex items-center gap-2">
            {config.showMinimize && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  // TODO: 实现最小化功能
                  console.log('[Portal] 最小化');
                }}
              >
                <Minimize2 className="w-4 h-4" />
              </Button>
            )}
            {config.showClose !== false && (
              <Button
                variant="ghost"
                size="icon"
                onClick={closePortal}
                aria-label="关闭"
              >
                <X className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>

        {/* 内容区 */}
        <div className="flex-1 overflow-auto">{content}</div>
      </div>
    );
  }

  // fullscreen: 全屏模态 (通过 Portal 渲染到 body)
  if (portalTarget === 'fullscreen') {
    return createPortal(
      <div
        className="fixed inset-0 z-[100] flex items-center justify-center"
        data-testid="a2ui-portal-fullscreen"
      >
        {/* 背景遮罩 */}
        <div
          className={cn(
            'absolute inset-0 transition-colors duration-200',
            config.backdrop === 'blur' && 'bg-black/50 backdrop-blur-md',
            config.backdrop === 'dim' && 'bg-black/80',
            (!config.backdrop || config.backdrop === 'none') && 'bg-black/90'
          )}
          onClick={config.showClose !== false ? closePortal : undefined}
          aria-hidden="true"
        />

        {/* 内容容器 */}
        <div className="relative z-10 w-full h-full max-w-[95vw] max-h-[95vh] m-4 bg-background rounded-xl overflow-hidden shadow-2xl flex flex-col">
          {/* 顶部工具栏 */}
          <div className="flex-shrink-0 h-12 border-b flex items-center justify-between px-4">
            <span className="text-sm font-medium">
              {config.title || '全屏预览'}
            </span>
            <div className="flex items-center gap-2">
              {config.showMinimize && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    console.log('[Portal] 最小化');
                  }}
                >
                  <Minimize2 className="w-4 h-4" />
                </Button>
              )}
              {config.showClose !== false && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={closePortal}
                  aria-label="关闭"
                >
                  <X className="w-5 h-5" />
                </Button>
              )}
            </div>
          </div>

          {/* 内容区 */}
          <div className="flex-1 overflow-auto">{content}</div>
        </div>
      </div>,
      document.body
    );
  }

  // split 模式暂不实现
  if (portalTarget === 'split') {
    console.warn('[Portal] split 模式暂未实现');
    return null;
  }

  return null;
}

export default A2UIPortalContainer;
