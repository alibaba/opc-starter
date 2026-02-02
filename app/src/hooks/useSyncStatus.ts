/**
 * 同步状态 Hook (Epic-18: S18-2, S18-3)
 *
 * 用于在 React 组件中订阅和使用 DataService 的同步状态
 */

import { useState, useEffect, useCallback } from 'react'
import { dataService, type SyncStatus, type SyncProgress } from '@/services/data/DataService'

/**
 * 冲突统计信息 (Epic-18: S18-4)
 */
export interface ConflictStats {
  total: number
  serverWins: number
  localWins: number
  merged: number
}

export interface UseSyncStatusReturn {
  /** 当前同步状态 */
  status: SyncStatus
  /** 是否正在同步 */
  isSyncing: boolean
  /** 是否已完成首次同步 */
  hasInitialSynced: boolean
  /** 是否在线 */
  isOnline: boolean
  /** 待同步操作数量 */
  pendingCount: number
  /** 同步失败数量 (Epic-18: S18-3) */
  failedCount: number
  /** 冲突统计 (Epic-18: S18-4) */
  conflictStats: ConflictStats
  /** 同步进度 (仅在同步中有效) */
  progress: SyncProgress | null
  /** 手动触发同步 */
  triggerSync: () => Promise<void>
  /** 手动触发队列处理 (Epic-18: S18-3) */
  triggerQueueProcessing: () => Promise<{ success: number; failed: number }>
  /** 重试失败的同步 (Epic-18: S18-3) */
  retryFailedSync: () => Promise<{ success: number; failed: number }>
}

/**
 * 同步状态 Hook
 *
 * @example
 * ```tsx
 * const { status, isSyncing, progress, isOnline, pendingCount } = useSyncStatus()
 *
 * // 首次加载显示 Loading
 * if (isSyncing) {
 *   return <Loading message={progress?.message} />
 * }
 *
 * // 显示离线状态和待同步数量
 * if (!isOnline) {
 *   return <OfflineBanner pendingCount={pendingCount} />
 * }
 * ```
 */
export function useSyncStatus(): UseSyncStatusReturn {
  const [status, setStatus] = useState<SyncStatus>(dataService.getSyncStatus())
  const [progress, setProgress] = useState<SyncProgress | null>(null)
  const [isOnline, setIsOnline] = useState(navigator.onLine)
  const [pendingCount, setPendingCount] = useState(0)
  const [failedCount, setFailedCount] = useState(0)
  const [conflictStats, setConflictStats] = useState<ConflictStats>({
    total: 0,
    serverWins: 0,
    localWins: 0,
    merged: 0,
  })

  useEffect(() => {
    // 订阅同步状态变更
    const unsubscribe = dataService.onSyncStatusChange((newStatus, newProgress) => {
      setStatus(newStatus)
      setProgress(newProgress || null)
    })

    // 监听网络状态变更事件
    const handleNetworkChange = (e: CustomEvent<{ isOnline: boolean }>) => {
      setIsOnline(e.detail.isOnline)
    }

    // 监听队列清空事件
    const handleQueueEmpty = () => {
      setPendingCount(0)
      updateFailedCount()
    }

    // 监听同步失败事件
    const handleSyncFailed = () => {
      updateStats()
      updateFailedCount()
    }

    // 监听冲突事件 (Epic-18: S18-4)
    const handleConflict = (e: CustomEvent<{ stats: ConflictStats }>) => {
      setConflictStats(e.detail.stats)
    }

    window.addEventListener('dataservice:network', handleNetworkChange as EventListener)
    window.addEventListener('dataservice:queue-empty', handleQueueEmpty)
    window.addEventListener('dataservice:sync-failed', handleSyncFailed)
    window.addEventListener('dataservice:conflict', handleConflict as EventListener)

    // 兼容原生网络事件
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    // 更新队列统计
    const updateStats = () => {
      const stats = dataService.getSyncStats()
      setPendingCount(stats.queueSize)
    }

    // 更新失败数量（从队列统计中获取）
    const updateFailedCount = () => {
      try {
        // OPC-Starter 简化版：从队列统计中推断失败数量
        const stats = dataService.getSyncStats()
        setFailedCount(stats.failureCount || 0)
      } catch {
        // 忽略错误
      }
    }

    // 更新冲突统计 (Epic-18: S18-4)
    const updateConflictStats = () => {
      setConflictStats(dataService.getConflictStats())
    }

    updateStats()
    updateFailedCount()
    updateConflictStats()
    const interval = setInterval(() => {
      updateStats()
      updateFailedCount()
    }, 5000)

    return () => {
      unsubscribe()
      window.removeEventListener('dataservice:network', handleNetworkChange as EventListener)
      window.removeEventListener('dataservice:queue-empty', handleQueueEmpty)
      window.removeEventListener('dataservice:sync-failed', handleSyncFailed)
      window.removeEventListener('dataservice:conflict', handleConflict as EventListener)
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
      clearInterval(interval)
    }
  }, [])

  const triggerSync = useCallback(async () => {
    await dataService.initialSync()
  }, [])

  const triggerQueueProcessing = useCallback(async () => {
    return dataService.triggerQueueProcessing()
  }, [])

  const retryFailedSync = useCallback(async () => {
    // OPC-Starter 简化版：重新处理队列
    return dataService.triggerQueueProcessing()
  }, [])

  return {
    status,
    isSyncing: status === 'syncing',
    hasInitialSynced: dataService.hasCompletedInitialSync(),
    isOnline,
    pendingCount,
    failedCount,
    conflictStats,
    progress,
    triggerSync,
    triggerQueueProcessing,
    retryFailedSync,
  }
}

export default useSyncStatus
