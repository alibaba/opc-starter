import type { WriteOperation } from '@/services/data/DataService'

interface OfflineQueueDeps {
  storageKey: string
  isOnline: () => boolean
  executeOperation: (op: WriteOperation) => Promise<void>
  markAsSynced: (op: WriteOperation) => Promise<void>
  markAsFailed: (op: WriteOperation, error: unknown) => Promise<void>
  onQueueEmpty?: () => void
}

interface QueueStats {
  queueSize: number
  operations: WriteOperation[]
}

export function createOfflineQueueManager(deps: OfflineQueueDeps) {
  let offlineQueue: WriteOperation[] = []
  let isProcessingQueue = false

  const loadQueue = (): void => {
    try {
      const stored = localStorage.getItem(deps.storageKey)
      if (stored) {
        offlineQueue = JSON.parse(stored) as WriteOperation[]
        console.log(`[DataService] 加载了 ${offlineQueue.length} 个离线操作`)
      }
    } catch (error) {
      console.error('[DataService] 加载离线队列失败:', error)
      offlineQueue = []
    }
  }

  const saveQueue = (): void => {
    try {
      localStorage.setItem(deps.storageKey, JSON.stringify(offlineQueue))
    } catch (error) {
      console.error('[DataService] 保存离线队列失败:', error)
    }
  }

  const enqueueOperation = async (
    op: Omit<WriteOperation, 'timestamp' | 'retryCount'>
  ): Promise<void> => {
    const operation: WriteOperation = {
      ...op,
      timestamp: Date.now(),
      retryCount: 0,
    }

    offlineQueue.push(operation)
    saveQueue()

    console.log('[DataService] 操作已加入队列:', operation.type, operation.entityType, operation.id)
  }

  const processOfflineQueue = async (): Promise<{ success: number; failed: number }> => {
    const results = { success: 0, failed: 0 }

    if (offlineQueue.length === 0) {
      return results
    }

    console.log(`[DataService] 开始处理 ${offlineQueue.length} 个待同步操作`)

    while (offlineQueue.length > 0) {
      const op = offlineQueue[0]

      try {
        await deps.executeOperation(op)
        offlineQueue.shift()
        results.success++

        await deps.markAsSynced(op)
      } catch (error) {
        op.retryCount++

        if (op.retryCount >= 3) {
          console.error('[DataService] 操作永久失败，放弃:', op, error)
          offlineQueue.shift()
          results.failed++

          await deps.markAsFailed(op, error)
        } else {
          console.warn('[DataService] 操作失败，将重试:', op, error)
          break
        }
      }

      saveQueue()
    }

    console.log('[DataService] 队列处理完成:', results)
    return results
  }

  const processOfflineQueueWithRetry = async (): Promise<void> => {
    if (isProcessingQueue) {
      console.log('[DataService] 队列正在处理中，跳过')
      return
    }

    isProcessingQueue = true

    try {
      let retryCount = 0
      const maxRetries = 3

      while (offlineQueue.length > 0 && retryCount < maxRetries) {
        if (!deps.isOnline()) {
          console.log('[DataService] 网络已断开，停止处理队列')
          break
        }

        const result = await processOfflineQueue()

        if (result.failed > 0 && offlineQueue.length > 0) {
          retryCount++
          const delay = Math.min(1000 * Math.pow(2, retryCount), 30000)
          console.log(`[DataService] 部分操作失败，${delay / 1000}秒后重试 (${retryCount}/${maxRetries})`)
          await new Promise(resolve => setTimeout(resolve, delay))
        } else {
          break
        }
      }

      if (offlineQueue.length === 0) {
        console.log('[DataService] ✅ 所有离线操作已同步')
        deps.onQueueEmpty?.()
      }
    } finally {
      isProcessingQueue = false
    }
  }

  const getQueueStats = (): QueueStats => ({
    queueSize: offlineQueue.length,
    operations: [...offlineQueue],
  })

  const getQueue = (): WriteOperation[] => offlineQueue

  const setQueue = (ops: WriteOperation[]): void => {
    offlineQueue = [...ops]
    saveQueue()
  }

  return {
    loadQueue,
    saveQueue,
    enqueueOperation,
    processOfflineQueue,
    processOfflineQueueWithRetry,
    getQueueStats,
    getQueue,
    setQueue,
  }
}
