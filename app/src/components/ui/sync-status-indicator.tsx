/**
 * 同步状态指示器组件 (Epic-18: S18-5)
 */
import { useState } from 'react'
import { Cloud, CloudOff, RefreshCw, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'
import { useSyncStatus } from '@/hooks/useSyncStatus'
import { Badge } from '@/components/ui/badge'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'

export interface SyncStatusIndicatorProps {
  showDetails?: boolean
  className?: string
}

export function SyncStatusIndicator({ showDetails = false, className }: SyncStatusIndicatorProps) {
  const { t } = useTranslation('layout')
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

  const getStatusText = () => {
    if (!isOnline) return t('sync.offline')
    if (isSyncing) {
      if (progress) {
        return t('sync.syncingProgress', {
          current: progress.current,
          total: progress.total,
        })
      }
      return t('sync.syncing')
    }
    if (failedCount > 0) return t('sync.failed', { count: failedCount })
    if (pendingCount > 0) return t('sync.pending', { count: pendingCount })
    if (hasInitialSynced) return t('sync.synced')
    return t('sync.notSynced')
  }

  const getStatusColor = () => {
    if (!isOnline) return 'bg-muted text-muted-foreground border-muted'
    if (isSyncing) return 'bg-primary/10 text-primary border-primary/20'
    if (failedCount > 0) return 'bg-destructive/10 text-destructive border-destructive/20'
    if (pendingCount > 0) return 'bg-warning/10 text-warning border-warning/20'
    if (hasInitialSynced) return 'bg-success/10 text-success border-success/20'
    return 'bg-muted text-muted-foreground border-muted'
  }

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

            {(pendingCount > 0 || failedCount > 0) && (
              <span
                className={cn(
                  'absolute -top-1 -right-1 min-w-[18px] h-[18px]',
                  'flex items-center justify-center',
                  'text-[10px] font-bold rounded-full',
                  failedCount > 0 ? 'bg-destructive text-white' : 'bg-warning text-white'
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
                {t('sync.conflictsResolved', { count: conflictStats.total })}
              </p>
            )}
            {(pendingCount > 0 || failedCount > 0) && isOnline && (
              <p className="text-xs text-muted-foreground mt-1">{t('sync.clickRetry')}</p>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    )
  }

  return (
    <div
      className={cn(
        'flex items-center gap-3 px-3 py-2 rounded-lg border',
        getStatusColor(),
        className
      )}
    >
      <div className="flex-shrink-0">{getStatusIcon()}</div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium truncate">{getStatusText()}</span>

          {isSyncing && progress && (
            <div className="flex-1 h-1.5 bg-primary/20 rounded-full overflow-hidden">
              <div
                className="h-full bg-primary transition-all duration-300"
                style={{ width: `${(progress.current / progress.total) * 100}%` }}
              />
            </div>
          )}
        </div>

        {conflictStats.total > 0 && (
          <div className="flex items-center gap-2 mt-1">
            <span className="text-xs text-muted-foreground">
              {t('sync.conflictSummary', {
                merged: conflictStats.merged,
                serverWins: conflictStats.serverWins,
              })}
            </span>
          </div>
        )}
      </div>

      {isOnline && (pendingCount > 0 || failedCount > 0) && (
        <button
          onClick={handleRetry}
          disabled={isSyncing || isRetrying}
          className={cn(
            'flex-shrink-0 p-1.5 rounded-md transition-colors',
            'hover:bg-black/5 disabled:opacity-50 disabled:cursor-not-allowed'
          )}
          title={t('sync.retrySync')}
        >
          <RefreshCw className={cn('w-4 h-4', isRetrying && 'animate-spin')} />
        </button>
      )}
    </div>
  )
}

export function SyncStatusBadge({ className }: { className?: string }) {
  const { t } = useTranslation('layout')
  const { isOnline, isSyncing, pendingCount, failedCount, hasInitialSynced } = useSyncStatus()

  if (!isOnline) {
    return (
      <Badge variant="secondary" className={cn('gap-1', className)}>
        <CloudOff className="w-3 h-3" />
        {t('sync.offline')}
      </Badge>
    )
  }

  if (isSyncing) {
    return (
      <Badge variant="secondary" className={cn('gap-1', className)}>
        <Loader2 className="w-3 h-3 animate-spin" />
        {t('sync.badgeSyncing')}
      </Badge>
    )
  }

  if (failedCount > 0) {
    return (
      <Badge variant="destructive" className={cn('gap-1', className)}>
        <AlertCircle className="w-3 h-3" />
        {t('sync.badgeFailed', { count: failedCount })}
      </Badge>
    )
  }

  if (pendingCount > 0) {
    return (
      <Badge variant="outline" className={cn('gap-1 border-amber-300 text-amber-700', className)}>
        <RefreshCw className="w-3 h-3" />
        {t('sync.pending', { count: pendingCount })}
      </Badge>
    )
  }

  if (hasInitialSynced) {
    return (
      <Badge variant="outline" className={cn('gap-1 border-success/30 text-success', className)}>
        <CheckCircle2 className="w-3 h-3" />
        {t('sync.synced')}
      </Badge>
    )
  }

  return null
}
