/**
 * 同步状态指示器组件 (Epic-18: S18-5)
 * 
 * 显示数据同步状态：
 * - 在线/离线状态
 * - 同步中状态（带动画）
 * - 待同步数量徽章
 * - 冲突统计
 */

import { useState } from 'react'
import { 
  Cloud, 
  CloudOff, 
  RefreshCw, 
  AlertCircle,
  CheckCircle2,
  Loader2,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useSyncStatus } from '@/hooks/useSyncStatus'
import { Badge } from '@/components/ui/badge'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'

export interface SyncStatusIndicatorProps {
  /** 是否显示详细信息 */
  showDetails?: boolean
  /** 额外的 CSS 类名 */
  className?: string
}

export function SyncStatusIndicator({ 
  showDetails = false,
  className 
}: SyncStatusIndicatorProps) {
  const {
    isSyncing,
    hasInitialSynced,
    isOnline,
    pendingCount,
    failedCount,
    conflictStats,
    progress,
    triggerSync,
    triggerQueueProcessing,
    retryFailedSync,
  } = useSyncStatus()
  
  const [isRetrying, setIsRetrying] = useState(false)

  // 处理重试
  const handleRetry = async () => {
    if (isRetrying) return
    setIsRetrying(true)
    try {
      if (failedCount > 0) {
        await retryFailedSync()
      } else if (pendingCount > 0) {
        await triggerQueueProcessing()
      } else {
        await triggerSync()
      }
    } finally {
      setIsRetrying(false)
    }
  }

  // 获取状态图标
  const getStatusIcon = () => {
    if (!isOnline) {
      return <CloudOff className="w-4 h-4 text-muted-foreground" />
    }
    
    if (isSyncing || isRetrying) {
      return <Loader2 className="w-4 h-4 text-primary animate-spin" />
    }
    
    if (failedCount > 0) {
      return <AlertCircle className="w-4 h-4 text-destructive" />
    }
    
    if (pendingCount > 0) {
      return <RefreshCw className="w-4 h-4 text-warning" />
    }
    
    if (hasInitialSynced) {
      return <CheckCircle2 className="w-4 h-4 text-success" />
    }
    
    return <Cloud className="w-4 h-4 text-muted-foreground" />
  }

  // 获取状态文本
  const getStatusText = () => {
    if (!isOnline) return '离线'
    if (isSyncing) {
      if (progress) {
        return `同步中 ${progress.current}/${progress.total}`
      }
      return '同步中...'
    }
    if (failedCount > 0) return `${failedCount} 项同步失败`
    if (pendingCount > 0) return `${pendingCount} 项待同步`
    if (hasInitialSynced) return '已同步'
    return '未同步'
  }

  // 获取状态颜色
  const getStatusColor = () => {
    if (!isOnline) return 'bg-muted text-muted-foreground border-muted'
    if (isSyncing) return 'bg-primary/10 text-primary border-primary/20'
    if (failedCount > 0) return 'bg-destructive/10 text-destructive border-destructive/20'
    if (pendingCount > 0) return 'bg-warning/10 text-warning border-warning/20'
    if (hasInitialSynced) return 'bg-success/10 text-success border-success/20'
    return 'bg-muted text-muted-foreground border-muted'
  }

  // 简洁模式：仅图标 + 徽章
  if (!showDetails) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            onClick={handleRetry}
            disabled={isSyncing || isRetrying}
            className={cn(
              'relative p-2 rounded-lg transition-colors',
              'hover:bg-accent disabled:opacity-50 disabled:cursor-not-allowed',
              className
            )}
          >
            {getStatusIcon()}
            
            {/* 待同步/失败数量徽章 */}
            {(pendingCount > 0 || failedCount > 0) && (
              <span 
                className={cn(
                  'absolute -top-1 -right-1 min-w-[18px] h-[18px]',
                  'flex items-center justify-center',
                  'text-[10px] font-bold rounded-full',
                  failedCount > 0 
                    ? 'bg-destructive text-white' 
                    : 'bg-warning text-white'
                )}
              >
                {failedCount > 0 ? failedCount : pendingCount}
              </span>
            )}
          </button>
        </TooltipTrigger>
        <TooltipContent>
          <div className="text-sm">
            <p className="font-medium">{getStatusText()}</p>
            {conflictStats.total > 0 && (
              <p className="text-xs text-muted-foreground mt-1">
                已解决 {conflictStats.total} 个冲突
              </p>
            )}
            {(pendingCount > 0 || failedCount > 0) && isOnline && (
              <p className="text-xs text-muted-foreground mt-1">点击重试</p>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    )
  }

  // 详细模式：完整卡片
  return (
    <div
      className={cn(
        'flex items-center gap-3 px-3 py-2 rounded-lg border',
        getStatusColor(),
        className
      )}
    >
      {/* 状态图标 */}
      <div className="flex-shrink-0">
        {getStatusIcon()}
      </div>

      {/* 状态信息 */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium truncate">
            {getStatusText()}
          </span>
          
          {/* 进度条 */}
          {isSyncing && progress && (
            <div className="flex-1 h-1.5 bg-primary/20 rounded-full overflow-hidden">
              <div 
                className="h-full bg-primary transition-all duration-300"
                style={{ width: `${(progress.current / progress.total) * 100}%` }}
              />
            </div>
          )}
        </div>

        {/* 冲突统计 */}
        {conflictStats.total > 0 && (
          <div className="flex items-center gap-2 mt-1">
            <span className="text-xs text-muted-foreground">
              冲突解决: {conflictStats.merged} 合并, {conflictStats.serverWins} 服务端
            </span>
          </div>
        )}
      </div>

      {/* 操作按钮 */}
      {isOnline && (pendingCount > 0 || failedCount > 0) && (
        <button
          onClick={handleRetry}
          disabled={isSyncing || isRetrying}
          className={cn(
            'flex-shrink-0 p-1.5 rounded-md transition-colors',
            'hover:bg-black/5 disabled:opacity-50 disabled:cursor-not-allowed'
          )}
          title="重试同步"
        >
          <RefreshCw className={cn(
            'w-4 h-4',
            isRetrying && 'animate-spin'
          )} />
        </button>
      )}
    </div>
  )
}

/**
 * 同步状态徽章组件
 * 更紧凑的显示方式
 */
export function SyncStatusBadge({ className }: { className?: string }) {
  const { isOnline, isSyncing, pendingCount, failedCount, hasInitialSynced } = useSyncStatus()

  if (!isOnline) {
    return (
      <Badge variant="secondary" className={cn('gap-1', className)}>
        <CloudOff className="w-3 h-3" />
        离线
      </Badge>
    )
  }

  if (isSyncing) {
    return (
      <Badge variant="secondary" className={cn('gap-1', className)}>
        <Loader2 className="w-3 h-3 animate-spin" />
        同步中
      </Badge>
    )
  }

  if (failedCount > 0) {
    return (
      <Badge variant="destructive" className={cn('gap-1', className)}>
        <AlertCircle className="w-3 h-3" />
        {failedCount} 失败
      </Badge>
    )
  }

  if (pendingCount > 0) {
    return (
      <Badge variant="outline" className={cn('gap-1 border-amber-300 text-amber-700', className)}>
        <RefreshCw className="w-3 h-3" />
        {pendingCount} 待同步
      </Badge>
    )
  }

  if (hasInitialSynced) {
    return (
      <Badge variant="outline" className={cn('gap-1 border-success/30 text-success', className)}>
        <CheckCircle2 className="w-3 h-3" />
        已同步
      </Badge>
    )
  }

  return null
}

