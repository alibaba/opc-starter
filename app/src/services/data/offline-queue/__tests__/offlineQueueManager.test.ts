/**
 * offlineQueueManager 离线队列管理器测试
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createOfflineQueueManager } from '../offlineQueueManager'
import type { WriteOperation } from '@/services/data/DataService'

describe('offlineQueueManager', () => {
  let mockStorage: Record<string, string>
  let mockDeps: {
    storageKey: string
    isOnline: () => boolean
    executeOperation: (op: WriteOperation) => Promise<void>
    markAsSynced: (op: WriteOperation) => Promise<void>
    markAsFailed: (op: WriteOperation, error: unknown) => Promise<void>
    onQueueEmpty?: () => void
  }

  beforeEach(() => {
    vi.useFakeTimers()
    mockStorage = {}

    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(
      (key: string) => mockStorage[key] ?? null
    )
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation((key: string, value: string) => {
      mockStorage[key] = value
    })

    mockDeps = {
      storageKey: 'test-queue',
      isOnline: () => true,
      executeOperation: async () => undefined,
      markAsSynced: async () => undefined,
      markAsFailed: async () => undefined,
      onQueueEmpty: () => undefined,
    }
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  describe('loadQueue', () => {
    it('应该从 localStorage 加载队列', () => {
      const ops: WriteOperation[] = [
        { id: '1', type: 'add', entityType: 'person', data: {}, timestamp: 1000, retryCount: 0 },
      ]
      mockStorage['test-queue'] = JSON.stringify(ops)

      const manager = createOfflineQueueManager(mockDeps)
      manager.loadQueue()

      expect(manager.getQueue()).toHaveLength(1)
      expect(manager.getQueue()[0].id).toBe('1')
    })

    it('应该处理空 localStorage', () => {
      const manager = createOfflineQueueManager(mockDeps)
      manager.loadQueue()
      expect(manager.getQueue()).toHaveLength(0)
    })

    it('应该处理 JSON 解析错误', () => {
      mockStorage['test-queue'] = 'invalid-json'

      const manager = createOfflineQueueManager(mockDeps)
      manager.loadQueue()
      expect(manager.getQueue()).toHaveLength(0)
    })
  })

  describe('enqueueOperation', () => {
    it('应该添加操作到队列', async () => {
      const manager = createOfflineQueueManager(mockDeps)

      await manager.enqueueOperation({
        id: '1',
        type: 'add',
        entityType: 'person',
        data: { name: 'Test' },
      })

      expect(manager.getQueue()).toHaveLength(1)
      expect(manager.getQueue()[0].retryCount).toBe(0)
      expect(manager.getQueue()[0].timestamp).toBeDefined()
    })

    it('应该保存到 localStorage', async () => {
      const manager = createOfflineQueueManager(mockDeps)

      await manager.enqueueOperation({
        id: '1',
        type: 'add',
        entityType: 'person',
        data: {},
      })

      expect(mockStorage['test-queue']).toBeDefined()
      const saved = JSON.parse(mockStorage['test-queue'])
      expect(saved).toHaveLength(1)
    })

    it('应该支持多个操作', async () => {
      const manager = createOfflineQueueManager(mockDeps)

      await manager.enqueueOperation({ id: '1', type: 'add', entityType: 'person', data: {} })
      await manager.enqueueOperation({ id: '2', type: 'update', entityType: 'person', data: {} })
      await manager.enqueueOperation({ id: '3', type: 'delete', entityType: 'person', data: {} })

      expect(manager.getQueue()).toHaveLength(3)
    })
  })

  describe('processOfflineQueue', () => {
    it('空队列应该返回 0/0', async () => {
      const manager = createOfflineQueueManager(mockDeps)
      const result = await manager.processOfflineQueue()
      expect(result).toEqual({ success: 0, failed: 0 })
    })

    it('应该成功处理队列中的操作', async () => {
      const executeOperation = vi.fn().mockResolvedValue(undefined)
      const markAsSynced = vi.fn().mockResolvedValue(undefined)
      const manager = createOfflineQueueManager({
        ...mockDeps,
        executeOperation,
        markAsSynced,
      })

      await manager.enqueueOperation({ id: '1', type: 'add', entityType: 'person', data: {} })
      await manager.enqueueOperation({ id: '2', type: 'update', entityType: 'person', data: {} })

      const result = await manager.processOfflineQueue()

      expect(result.success).toBe(2)
      expect(result.failed).toBe(0)
      expect(manager.getQueue()).toHaveLength(0)
      expect(markAsSynced).toHaveBeenCalledTimes(2)
    })

    it('失败操作应该重试并在 3 次后放弃', async () => {
      const executeOperation = vi.fn().mockRejectedValue(new Error('Network error'))
      const markAsFailed = vi.fn().mockResolvedValue(undefined)
      const manager = createOfflineQueueManager({
        ...mockDeps,
        executeOperation,
        markAsFailed,
      })

      await manager.enqueueOperation({ id: '1', type: 'add', entityType: 'person', data: {} })

      // 第一次处理：retryCount 0 → 1，break
      let result = await manager.processOfflineQueue()
      expect(result.success).toBe(0)
      expect(result.failed).toBe(0)
      expect(manager.getQueue()).toHaveLength(1)

      // 第二次处理：retryCount 1 → 2，break
      result = await manager.processOfflineQueue()
      expect(manager.getQueue()).toHaveLength(1)

      // 第三次处理：retryCount 2 → 3 >= 3，放弃
      result = await manager.processOfflineQueue()
      expect(result.failed).toBe(1)
      expect(manager.getQueue()).toHaveLength(0)
      expect(markAsFailed).toHaveBeenCalledTimes(1)
    })
  })

  describe('getQueueStats', () => {
    it('应该返回正确的统计', async () => {
      const manager = createOfflineQueueManager(mockDeps)

      await manager.enqueueOperation({ id: '1', type: 'add', entityType: 'person', data: {} })
      await manager.enqueueOperation({ id: '2', type: 'update', entityType: 'person', data: {} })

      const stats = manager.getQueueStats()
      expect(stats.queueSize).toBe(2)
      expect(stats.operations).toHaveLength(2)
    })

    it('应该返回操作的副本', async () => {
      const manager = createOfflineQueueManager(mockDeps)
      await manager.enqueueOperation({ id: '1', type: 'add', entityType: 'person', data: {} })

      const stats = manager.getQueueStats()
      stats.operations.pop()

      // 原始队列不应被修改
      expect(manager.getQueue()).toHaveLength(1)
    })
  })

  describe('setQueue', () => {
    it('应该替换队列并保存', () => {
      const manager = createOfflineQueueManager(mockDeps)

      const ops: WriteOperation[] = [
        { id: '1', type: 'add', entityType: 'person', data: {}, timestamp: 1000, retryCount: 0 },
        { id: '2', type: 'delete', entityType: 'person', data: {}, timestamp: 2000, retryCount: 0 },
      ]

      manager.setQueue(ops)

      expect(manager.getQueue()).toHaveLength(2)
      expect(mockStorage['test-queue']).toBeDefined()
    })
  })

  describe('processOfflineQueueWithRetry', () => {
    it('应该在所有操作完成后调用 onQueueEmpty', async () => {
      const onQueueEmpty = vi.fn()
      const manager = createOfflineQueueManager({
        ...mockDeps,
        onQueueEmpty,
      })
      await manager.enqueueOperation({ id: '1', type: 'add', entityType: 'person', data: {} })

      await manager.processOfflineQueueWithRetry()

      expect(onQueueEmpty).toHaveBeenCalled()
    })

    it('应该在离线时停止处理', async () => {
      const executeOperation = vi.fn().mockResolvedValue(undefined)
      const manager = createOfflineQueueManager({
        ...mockDeps,
        isOnline: () => false,
        executeOperation,
      })
      await manager.enqueueOperation({ id: '1', type: 'add', entityType: 'person', data: {} })

      await manager.processOfflineQueueWithRetry()

      expect(executeOperation).not.toHaveBeenCalled()
    })

    it('应该防止重复处理', async () => {
      const executeOperation = vi.fn().mockResolvedValue(undefined)
      const manager = createOfflineQueueManager({
        ...mockDeps,
        executeOperation,
      })
      await manager.enqueueOperation({ id: '1', type: 'add', entityType: 'person', data: {} })

      // 并发调用
      const p1 = manager.processOfflineQueueWithRetry()
      const p2 = manager.processOfflineQueueWithRetry()

      await Promise.all([p1, p2])

      // executeOperation 只应被调用一次
      expect(executeOperation).toHaveBeenCalledTimes(1)
    })
  })
})
