import { CheckCircle2, RefreshCw, Clock, AlertCircle, WifiOff } from 'lucide-react'
import { cn } from '@/lib/utils'

/**
 * 云同步状态类型
 */
type CloudSyncStatus =
  | 'synced' // 已同步
  | 'syncing' // 同步中
  | 'pending' // 待同步
  | 'error' // 同步错误
  | 'offline' // 离线
  | 'local-only' // 仅本地

interface SyncBadgeProps {
  status?: CloudSyncStatus
  className?: string
  size?: 'sm' | 'md'
}

export function SyncBadge({ status = 'synced', className, size = 'sm' }: SyncBadgeProps) {
  const badges: Record<
    CloudSyncStatus,
    {
      icon: React.ReactNode
      label: string
      className: string
    }
  > = {
    synced: {
      icon: <CheckCircle2 className={cn(size === 'sm' ? 'w-3 h-3' : 'w-4 h-4')} />,
      label: 'Synced',
      className: 'bg-success/10 text-success dark:bg-success/20 dark:text-success',
    },
    syncing: {
      icon: <RefreshCw className={cn(size === 'sm' ? 'w-3 h-3' : 'w-4 h-4', 'animate-spin')} />,
      label: 'Syncing',
      className: 'bg-primary/10 text-primary dark:bg-primary/20 dark:text-primary',
    },
    pending: {
      icon: <Clock className={cn(size === 'sm' ? 'w-3 h-3' : 'w-4 h-4')} />,
      label: 'Pending',
      className: 'bg-warning/10 text-warning dark:bg-warning/20 dark:text-warning',
    },
    error: {
      icon: <AlertCircle className={cn(size === 'sm' ? 'w-3 h-3' : 'w-4 h-4')} />,
      label: 'Error',
      className: 'bg-destructive/10 text-destructive dark:bg-destructive/20 dark:text-destructive',
    },
    offline: {
      icon: <WifiOff className={cn(size === 'sm' ? 'w-3 h-3' : 'w-4 h-4')} />,
      label: 'Offline',
      className: 'bg-muted text-muted-foreground dark:bg-muted dark:text-muted-foreground',
    },
    'local-only': {
      icon: <WifiOff className={cn(size === 'sm' ? 'w-3 h-3' : 'w-4 h-4')} />,
      label: 'Local',
      className: 'bg-muted text-muted-foreground dark:bg-muted dark:text-muted-foreground',
    },
  }

  const badge = badges[status]

  if (!badge) {
    return null
  }

  return (
    <div
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2 py-0.5',
        'text-xs font-medium',
        'transition-all duration-200',
        badge.className,
        className
      )}
      title={badge.label}
    >
      {badge.icon}
      {size === 'md' && <span>{badge.label}</span>}
    </div>
  )
}
