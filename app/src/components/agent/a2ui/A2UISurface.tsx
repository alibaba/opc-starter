/**
 * A2UI Surface 容器组件
 * @description 管理单个 Surface 的渲染和状态
 * @version 1.0.0
 */

import React, { useCallback } from 'react'
import type { A2UIComponent, A2UIDataModel, UserActionMessage } from '@/types/a2ui'
import { A2UIRendererSafe } from './A2UIRenderer'
import { cn } from '@/lib/utils'

export interface A2UISurfaceProps {
  /** Surface ID */
  surfaceId: string
  /** 组件树 */
  component: A2UIComponent
  /** 数据模型 */
  dataModel: A2UIDataModel
  /** 用户操作回调 */
  onAction?: (message: UserActionMessage) => void
  /** 渲染错误回调 */
  onError?: (error: Error) => void
  /** 自定义类名 */
  className?: string
}

/**
 * A2UI Surface 组件
 */
export const A2UISurface: React.FC<A2UISurfaceProps> = ({
  surfaceId,
  component,
  dataModel,
  onAction,
  onError,
  className,
}) => {
  // 处理用户操作
  // 注意：useCallback 必须在条件判断之前调用，保证 Hook 调用顺序一致
  const handleAction = useCallback(
    (componentId: string, actionId: string, value?: unknown) => {
      const message: UserActionMessage = {
        type: 'userAction',
        surfaceId,
        componentId,
        actionId,
        value,
      }

      console.log('[A2UI Surface] 用户操作:', message)
      onAction?.(message)
    },
    [surfaceId, onAction]
  )

  // 处理渲染错误
  const handleError = useCallback(
    (error: Error) => {
      console.error(`[A2UI Surface ${surfaceId}] 渲染错误:`, error)
      onError?.(error)
    },
    [surfaceId, onError]
  )

  // 防御性检查：如果 component 未定义，返回 null
  if (!component) {
    console.warn('[A2UI Surface] 收到 undefined component, surfaceId:', surfaceId)
    return null
  }

  return (
    <div className={cn('a2ui-surface', className)} data-surface-id={surfaceId}>
      <A2UIRendererSafe
        component={component}
        dataModel={dataModel}
        onAction={handleAction}
        onError={handleError}
      />
    </div>
  )
}

/**
 * 空 Surface 占位符
 */
export const A2UISurfacePlaceholder: React.FC<{ className?: string }> = ({ className }) => {
  return (
    <div
      className={cn(
        'flex min-h-[200px] items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/25 bg-muted/50',
        className
      )}
    >
      <div className="text-center text-muted-foreground">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="currentColor"
          className="mx-auto h-12 w-12 opacity-50"
        >
          <path
            fillRule="evenodd"
            d="M2.25 6a3 3 0 013-3h13.5a3 3 0 013 3v12a3 3 0 01-3 3H5.25a3 3 0 01-3-3V6zm3.97.97a.75.75 0 011.06 0l2.25 2.25a.75.75 0 010 1.06l-2.25 2.25a.75.75 0 01-1.06-1.06l1.72-1.72-1.72-1.72a.75.75 0 010-1.06zm4.28 4.28a.75.75 0 000 1.5h3a.75.75 0 000-1.5h-3z"
            clipRule="evenodd"
          />
        </svg>
        <p className="mt-2 text-sm">等待 AI 响应...</p>
      </div>
    </div>
  )
}
