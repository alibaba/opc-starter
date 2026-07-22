/**
 * 同步状态指示器组件
 * Epic: 11 - 照片云存储
 * Story: 11.3 - 上传 UI 集成
 *
 * 功能:
 * - 显示同步状态图标
 * - 显示上传进度
 * - 支持不同状态的视觉反馈
 */

import { CloudOff, Loader2, CheckCircle2, AlertCircle, Clock } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import type { TFunction } from 'i18next'
import { cn } from '@/lib/utils'
import { Progress } from '@/components/ui/progress'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'

/**
 * 同步状态类型
 */
export type SyncStatus = 'synced' | 'syncing' | 'pending' | 'error' | 'offline'

/**
 * 组件 Props
 */
export interface SyncStatusIndicatorProps {
  /** 同步状态 */
  status: SyncStatus
  /** 上传进度 (0-100) */
  progress?: number
  /** 错误信息 */
  error?: string
  /** 显示模式 */
  mode?: 'icon' | 'full'
  /** 大小 */
  size?: 'sm' | 'md' | 'lg'
  /** 自定义类名 */
  className?: string
  /** 点击事件 */
  onClick?: () => void
}

/**
 * 获取状态配置
 */
function getStatusConfig(status: SyncStatus, t: TFunction<'components'>) {
  const configs = {
    synced: {
      icon: CheckCircle2,
      color: 'text-success',
      bgColor: 'bg-success/10',
      label: t('businessSync.synced'),
      description: t('businessSync.syncedDesc'),
      animate: false,
    },
    syncing: {
      icon: Loader2,
      color: 'text-primary',
      bgColor: 'bg-primary/10',
      label: t('businessSync.syncing'),
      description: t('businessSync.syncingDesc'),
      animate: true,
    },
    pending: {
      icon: Clock,
      color: 'text-warning',
      bgColor: 'bg-warning/10',
      label: t('businessSync.pending'),
      description: t('businessSync.pendingDesc'),
      animate: false,
    },
    error: {
      icon: AlertCircle,
      color: 'text-destructive',
      bgColor: 'bg-destructive/10',
      label: t('businessSync.error'),
      description: t('businessSync.errorDesc'),
      animate: false,
    },
    offline: {
      icon: CloudOff,
      color: 'text-muted-foreground',
      bgColor: 'bg-muted',
      label: t('businessSync.offline'),
      description: t('businessSync.offlineDesc'),
      animate: false,
    },
  }

  return configs[status]
}

/**
 * 获取图标大小
 */
function getIconSize(size: 'sm' | 'md' | 'lg') {
  const sizes = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
    lg: 'w-5 h-5',
  }
  return sizes[size]
}

/**
 * 同步状态指示器组件
 */
export function SyncStatusIndicator({
  status,
  progress,
  error,
  mode = 'icon',
  size = 'md',
  className,
  onClick,
}: SyncStatusIndicatorProps) {
  const { t } = useTranslation('components')
  const config = getStatusConfig(status, t)
  const Icon = config.icon
  const iconSize = getIconSize(size)

  // 图标模式
  if (mode === 'icon') {
    const iconElement = (
      <div
        className={cn(
          'inline-flex items-center justify-center rounded-full p-1',
          config.bgColor,
          onClick && 'cursor-pointer hover:opacity-80 transition-opacity',
          className
        )}
        onClick={onClick}
      >
        <Icon className={cn(iconSize, config.color, config.animate && 'animate-spin')} />
      </div>
    )

    // 带 Tooltip
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>{iconElement}</TooltipTrigger>
          <TooltipContent>
            <div className="text-sm">
              <p className="font-medium">{config.label}</p>
              <p className="text-muted-foreground">{error || config.description}</p>
              {status === 'syncing' && progress !== undefined && (
                <p className="text-muted-foreground mt-1">{progress}%</p>
              )}
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    )
  }

  // 完整模式
  return (
    <div
      className={cn(
        'inline-flex items-center space-x-2 px-3 py-2 rounded-lg',
        config.bgColor,
        onClick && 'cursor-pointer hover:opacity-80 transition-opacity',
        className
      )}
      onClick={onClick}
    >
      <Icon className={cn(iconSize, config.color, config.animate && 'animate-spin')} />
      <div className="flex-1 min-w-0">
        <p className={cn('text-sm font-medium', config.color)}>{config.label}</p>
        {status === 'syncing' && progress !== undefined && (
          <div className="mt-1">
            <Progress value={progress} className="h-1" />
            <p className="text-xs text-muted-foreground mt-1">{progress}%</p>
          </div>
        )}
        {error && <p className="text-xs text-destructive mt-1">{error}</p>}
      </div>
    </div>
  )
}

/**
 * 全局同步状态指示器
 * 用于显示整体同步状态
 */
export interface GlobalSyncStatusProps {
  /** 是否正在同步 */
  isSyncing: boolean
  /** 待同步数量 */
  pendingCount: number
  /** 最后同步时间 */
  lastSyncAt?: Date
  /** 同步错误 */
  syncError?: string
  /** 点击事件 */
  onClick?: () => void
  /** 自定义类名 */
  className?: string
}

/**
 * 全局同步状态指示器组件
 */
export function GlobalSyncStatus({
  isSyncing,
  pendingCount,
  lastSyncAt,
  syncError,
  onClick,
  className,
}: GlobalSyncStatusProps) {
  const { t } = useTranslation('components')
  // 确定状态
  const status: SyncStatus = syncError
    ? 'error'
    : isSyncing
      ? 'syncing'
      : pendingCount > 0
        ? 'pending'
        : 'synced'

  const config = getStatusConfig(status, t)
  const Icon = config.icon

  // 格式化最后同步时间
  const formatLastSync = (date?: Date) => {
    if (!date) return t('businessSync.neverSynced')

    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)
    const days = Math.floor(diff / 86400000)

    if (minutes < 1) return t('businessSync.justNow')
    if (minutes < 60) return t('businessSync.minutesAgo', { count: minutes })
    if (hours < 24) return t('businessSync.hoursAgo', { count: hours })
    return t('businessSync.daysAgo', { count: days })
  }

  return (
    <div
      className={cn(
        'flex items-center space-x-3 px-4 py-3 rounded-lg border',
        config.bgColor,
        onClick && 'cursor-pointer hover:opacity-80 transition-opacity',
        className
      )}
      onClick={onClick}
    >
      <Icon className={cn('w-5 h-5', config.color, config.animate && 'animate-spin')} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between">
          <p className={cn('text-sm font-medium', config.color)}>{config.label}</p>
          {pendingCount > 0 && (
            <span className="text-xs text-muted-foreground">
              {t('businessSync.pendingCount', { count: pendingCount })}
            </span>
          )}
        </div>
        <p className="text-xs text-muted-foreground mt-0.5">
          {syncError || t('businessSync.lastSync', { time: formatLastSync(lastSyncAt) })}
        </p>
      </div>
      {status === 'error' && (
        <button className="text-xs text-primary hover:text-primary/80 font-medium">
          {t('businessSync.retry')}
        </button>
      )}
    </div>
  )
}
