/**
 * 同步状态组件
 *
 * 显示 IndexedDB 与 Supabase 的同步状态
 * - 同步进度
 * - 网络状态
 * - 错误提示
 * - 手动同步按钮
 */

import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { TFunction } from 'i18next'
import { Cloud, CloudOff, RefreshCw, AlertCircle } from 'lucide-react'
import { dataService } from '@/services/data/DataService'
import { useDataServiceStats } from '@/hooks/useDataServiceStats'
import { cn } from '@/lib/utils'

function formatRelativeTime(date: Date, t: TFunction<'components'>, locale: string): string {
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffSec = Math.floor(diffMs / 1000)
  const diffMin = Math.floor(diffSec / 60)
  const diffHour = Math.floor(diffMin / 60)

  if (diffSec < 60) {
    return t('businessSync.justNow')
  }
  if (diffMin < 60) {
    return t('businessSync.minutesAgo', { count: diffMin })
  }
  if (diffHour < 24) {
    return t('businessSync.hoursAgo', { count: diffHour })
  }
  return date.toLocaleDateString(locale)
}

export function SyncStatus() {
  const { t, i18n } = useTranslation('components')
  const stats = useDataServiceStats()
  const [isVisible, setIsVisible] = useState(false)
  const [isManualSyncing, setIsManualSyncing] = useState(false)

  const dateLocale = i18n.language.startsWith('en') ? 'en-US' : 'zh-CN'

  useEffect(() => {
    // 只在有同步活动或错误时显示
    setIsVisible(
      stats.status === 'syncing' ||
        stats.status === 'error' ||
        !stats.isOnline ||
        stats.queueSize > 0
    )
  }, [stats])

  // 手动触发同步
  const handleManualSync = async () => {
    if (isManualSyncing || !stats.isOnline) return

    setIsManualSyncing(true)
    try {
      await dataService.processOfflineQueue()
    } catch (error) {
      console.error('Manual sync failed:', error)
    } finally {
      setIsManualSyncing(false)
    }
  }

  const statusTitle = !stats.isOnline
    ? t('businessSync.offlineMode')
    : stats.status === 'syncing' || isManualSyncing
      ? t('businessSync.syncingNow')
      : stats.status === 'error'
        ? t('businessSync.error')
        : stats.queueSize > 0
          ? t('businessSync.pending')
          : t('businessSync.synced')

  // 如果在 MSW 模式下，不显示同步状态
  if (import.meta.env.VITE_ENABLE_MSW === 'true') {
    return null
  }

  // 如果没有需要显示的状态，不渲染
  if (!isVisible) {
    return null
  }

  return (
    <div
      className={cn(
        'fixed bottom-4 right-4 z-50',
        'bg-card dark:bg-card rounded-lg shadow-lg',
        'border border-border dark:border-border',
        'p-3 min-w-[280px]',
        'transition-all duration-300 ease-in-out',
        isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'
      )}
    >
      <div className="flex items-start gap-3">
        {/* 状态图标 */}
        <div className="flex-shrink-0 mt-0.5">
          {!stats.isOnline ? (
            <CloudOff className="w-5 h-5 text-muted-foreground" />
          ) : stats.status === 'syncing' || isManualSyncing ? (
            <RefreshCw className="w-5 h-5 text-primary animate-spin" />
          ) : stats.status === 'error' ? (
            <AlertCircle className="w-5 h-5 text-destructive" />
          ) : (
            <Cloud className="w-5 h-5 text-success" />
          )}
        </div>

        {/* 状态信息 */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-sm font-medium text-foreground dark:text-foreground">
              {statusTitle}
            </h3>

            {/* 手动同步按钮 */}
            {stats.isOnline && stats.queueSize > 0 && !isManualSyncing && (
              <button
                onClick={handleManualSync}
                className={cn(
                  'text-xs px-2 py-1 rounded',
                  'bg-primary text-primary-foreground',
                  'hover:bg-primary/90',
                  'transition-colors duration-200',
                  'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1'
                )}
                title={t('businessSync.syncNowTitle')}
              >
                <RefreshCw className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* 详细信息 */}
          <div className="mt-1 space-y-1">
            {!stats.isOnline && (
              <p className="text-xs text-muted-foreground">{t('businessSync.offlineHint')}</p>
            )}

            {stats.isOnline && stats.queueSize > 0 && (
              <p className="text-xs text-muted-foreground">
                {t('businessSync.queuePending', { count: stats.queueSize })}
              </p>
            )}

            {stats.status === 'error' && (
              <p className="text-xs text-destructive">{t('businessSync.errorRetry')}</p>
            )}

            {stats.lastSyncAt && (
              <p className="text-xs text-muted-foreground">
                {t('businessSync.lastSync', {
                  time: formatRelativeTime(stats.lastSyncAt, t, dateLocale),
                })}
              </p>
            )}
          </div>

          {/* 统计信息（开发模式显示） */}
          {import.meta.env.DEV && (
            <div className="mt-2 pt-2 border-t border-border dark:border-border">
              <div className="flex gap-4 text-xs text-muted-foreground dark:text-muted-foreground">
                <span>✅ {stats.successCount}</span>
                <span>❌ {stats.failureCount}</span>
                <span>⚠️ {stats.conflictCount}</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
