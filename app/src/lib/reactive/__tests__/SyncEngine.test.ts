import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { LocalAdapter, RemoteAdapter } from '../types'
import { SyncEngine } from '../SyncEngine'

interface TestPhoto {
  id: string
  title: string
  url: string
  tags?: string[]
  participants?: string[]
  updated_at?: string
}

const createMockLocalAdapter = (): LocalAdapter<TestPhoto> & {
  _store: Map<string, TestPhoto>
} => {
  const store = new Map<string, TestPhoto>()
  
  return {
    _store: store,
    findAll: vi.fn(async () => Array.from(store.values())),
    findOne: vi.fn(async (id: string) => store.get(id)),
    query: vi.fn(async () => Array.from(store.values())),
    upsert: vi.fn(async (doc: TestPhoto) => { store.set(doc.id, doc) }),
    bulkUpsert: vi.fn(async (docs: TestPhoto[]) => { 
      docs.forEach(doc => store.set(doc.id, doc)) 
    }),
    remove: vi.fn(async (id: string) => { store.delete(id) }),
    clear: vi.fn(async () => { store.clear() }),
  }
}

const createMockRemoteAdapter = (): RemoteAdapter<TestPhoto> => {
  let idCounter = 0
  
  return {
    fetch: vi.fn(async () => []),
    fetchOne: vi.fn(async () => undefined),
    insert: vi.fn(async (doc) => ({ ...doc, id: `server-${++idCounter}` } as TestPhoto)),
    update: vi.fn(async (id, changes) => ({ id, ...changes } as TestPhoto)),
    remove: vi.fn(async () => {}),
    subscribe: vi.fn(() => () => {}),
  }
}

describe('SyncEngine', () => {
  let engine: SyncEngine<TestPhoto>
  let mockLocal: ReturnType<typeof createMockLocalAdapter>
  let mockRemote: ReturnType<typeof createMockRemoteAdapter>

  beforeEach(() => {
    mockLocal = createMockLocalAdapter()
    mockRemote = createMockRemoteAdapter()
    engine = new SyncEngine<TestPhoto>({
      localAdapter: mockLocal,
      remoteAdapter: mockRemote,
      entityName: 'photos',
    })
  })

  describe('Initial Sync', () => {
    it('首次同步应该从服务端拉取全量数据', async () => {
      mockRemote.fetch = vi.fn().mockResolvedValue([
        { id: '1', title: 'P1', url: '1.jpg' },
        { id: '2', title: 'P2', url: '2.jpg' },
      ])

      await engine.initialSync()

      expect(mockRemote.fetch).toHaveBeenCalled()
      expect(mockLocal.bulkUpsert).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ id: '1' }),
          expect.objectContaining({ id: '2' }),
        ])
      )
    })

    it('首次同步应该更新 lastSyncTime', async () => {
      mockRemote.fetch = vi.fn().mockResolvedValue([])
      
      const before = new Date()
      await engine.initialSync()
      const after = new Date()

      const lastSync = engine.getLastSyncTime()
      expect(lastSync).toBeDefined()
      expect(lastSync!.getTime()).toBeGreaterThanOrEqual(before.getTime())
      expect(lastSync!.getTime()).toBeLessThanOrEqual(after.getTime())
    })

    it('增量同步应该只拉取变更数据', async () => {
      const lastSync = new Date('2025-12-08T00:00:00Z')
      engine.setLastSyncTime(lastSync)

      mockRemote.fetch = vi.fn().mockResolvedValue([])
      
      await engine.deltaSync()

      expect(mockRemote.fetch).toHaveBeenCalledWith(
        expect.objectContaining({
          filter: expect.objectContaining({
            updated_at: expect.any(Object)
          }),
        })
      )
    })

    it('增量同步应该合并本地和远程数据', async () => {
      mockLocal._store.set('1', { id: '1', title: 'Local', url: '1.jpg' })
      engine.setLastSyncTime(new Date('2025-12-08T00:00:00Z'))

      mockRemote.fetch = vi.fn().mockResolvedValue([
        { id: '2', title: 'Remote New', url: '2.jpg' },
      ])

      await engine.deltaSync()

      expect(mockLocal.bulkUpsert).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ id: '2' }),
        ])
      )
    })
  })

  describe('Offline Queue', () => {
    it('离线时应该将操作加入队列', async () => {
      engine.setOnlineStatus(false)

      await engine.queueOperation({
        type: 'INSERT',
        data: { title: 'Offline Photo', url: 'offline.jpg' },
      })

      const queue = engine.getPendingOperations()
      expect(queue).toHaveLength(1)
      expect(queue[0].type).toBe('INSERT')
    })

    it('在线时 queueOperation 应该立即执行', async () => {
      engine.setOnlineStatus(true)

      await engine.queueOperation({
        type: 'INSERT',
        data: { title: 'Online Photo', url: 'online.jpg' },
      })

      expect(mockRemote.insert).toHaveBeenCalled()
      expect(engine.getPendingOperations()).toHaveLength(0)
    })

    it('恢复在线时应该处理队列', async () => {
      engine.setOnlineStatus(false)
      
      await engine.queueOperation({
        type: 'INSERT',
        data: { title: 'Queued', url: 'q.jpg' },
      })

      expect(engine.getPendingOperations()).toHaveLength(1)

      engine.setOnlineStatus(true)
      await engine.processQueue()

      expect(mockRemote.insert).toHaveBeenCalled()
      expect(engine.getPendingOperations()).toHaveLength(0)
    })

    it('队列处理失败应该保留操作并增加重试计数', async () => {
      engine.setOnlineStatus(false)
      
      await engine.queueOperation({
        type: 'INSERT',
        data: { title: 'Retry', url: 'r.jpg' },
      })

      mockRemote.insert = vi.fn().mockRejectedValue(new Error('Network'))

      engine.setOnlineStatus(true)
      await engine.processQueue()

      const queue = engine.getPendingOperations()
      expect(queue).toHaveLength(1)
      expect(queue[0].retryCount).toBe(1)
    })

    it('超过最大重试次数应该移除操作', async () => {
      engine = new SyncEngine<TestPhoto>({
        localAdapter: mockLocal,
        remoteAdapter: mockRemote,
        entityName: 'photos',
        maxRetries: 2,
      })
      
      engine.setOnlineStatus(false)
      await engine.queueOperation({
        type: 'INSERT',
        data: { title: 'Fail', url: 'f.jpg' },
      })

      mockRemote.insert = vi.fn().mockRejectedValue(new Error('Network'))
      engine.setOnlineStatus(true)

      await engine.processQueue()
      await engine.processQueue()
      await engine.processQueue()

      expect(engine.getPendingOperations()).toHaveLength(0)
    })

    it('UPDATE 操作应该调用 remote.update', async () => {
      engine.setOnlineStatus(false)
      
      await engine.queueOperation({
        id: 'photo-1',
        type: 'UPDATE',
        data: { title: 'Updated' },
      })

      engine.setOnlineStatus(true)
      await engine.processQueue()

      expect(mockRemote.update).toHaveBeenCalledWith('photo-1', { title: 'Updated' })
    })

    it('DELETE 操作应该调用 remote.remove', async () => {
      engine.setOnlineStatus(false)
      
      await engine.queueOperation({
        id: 'photo-1',
        type: 'DELETE',
      })

      engine.setOnlineStatus(true)
      await engine.processQueue()

      expect(mockRemote.remove).toHaveBeenCalledWith('photo-1')
    })
  })

  describe('Conflict Resolution', () => {
    it('tags 字段应该合并去重', () => {
      const local: TestPhoto = { id: '1', tags: ['a', 'b'], title: 'P', url: 'p.jpg' }
      const remote: TestPhoto = { id: '1', tags: ['b', 'c'], title: 'P', url: 'p.jpg' }

      const resolved = engine.resolveConflict(local, remote)

      expect(resolved.tags).toEqual(expect.arrayContaining(['a', 'b', 'c']))
      expect(resolved.tags).toHaveLength(3)
    })

    it('participants 字段应该合并去重', () => {
      const local: TestPhoto = { id: '1', participants: ['u1', 'u2'], title: 'P', url: 'p.jpg' }
      const remote: TestPhoto = { id: '1', participants: ['u2', 'u3'], title: 'P', url: 'p.jpg' }

      const resolved = engine.resolveConflict(local, remote)

      expect(resolved.participants).toEqual(expect.arrayContaining(['u1', 'u2', 'u3']))
      expect(resolved.participants).toHaveLength(3)
    })

    it('其他字段应该服务端优先', () => {
      const local: TestPhoto = { id: '1', title: 'Local', url: 'local.jpg' }
      const remote: TestPhoto = { id: '1', title: 'Remote', url: 'remote.jpg' }

      const resolved = engine.resolveConflict(local, remote)

      expect(resolved.title).toBe('Remote')
      expect(resolved.url).toBe('remote.jpg')
    })

    it('应该支持自定义冲突解决器', () => {
      const customResolver = vi.fn((local: TestPhoto, remote: TestPhoto) => ({
        ...local,
        title: `${local.title} + ${remote.title}`,
      }))

      engine = new SyncEngine<TestPhoto>({
        localAdapter: mockLocal,
        remoteAdapter: mockRemote,
        entityName: 'photos',
        conflictResolver: customResolver,
      })

      const local: TestPhoto = { id: '1', title: 'A', url: 'a.jpg' }
      const remote: TestPhoto = { id: '1', title: 'B', url: 'b.jpg' }

      const resolved = engine.resolveConflict(local, remote)

      expect(customResolver).toHaveBeenCalledWith(local, remote)
      expect(resolved.title).toBe('A + B')
    })
  })

  describe('Sync Status', () => {
    it('同步时应该更新状态为 syncing', async () => {
      const statusChanges: string[] = []
      
      engine = new SyncEngine<TestPhoto>({
        localAdapter: mockLocal,
        remoteAdapter: mockRemote,
        entityName: 'photos',
        onSyncStatusChange: (status) => statusChanges.push(status.status),
      })

      mockRemote.fetch = vi.fn().mockResolvedValue([])
      await engine.initialSync()

      expect(statusChanges).toContain('syncing')
      expect(statusChanges).toContain('synced')
    })

    it('同步失败时应该更新状态为 error', async () => {
      let lastStatus: string = ''
      
      engine = new SyncEngine<TestPhoto>({
        localAdapter: mockLocal,
        remoteAdapter: mockRemote,
        entityName: 'photos',
        onSyncStatusChange: (status) => { lastStatus = status.status },
      })

      mockRemote.fetch = vi.fn().mockRejectedValue(new Error('Network'))
      
      try {
        await engine.initialSync()
      } catch {
        // Expected error
      }

      expect(lastStatus).toBe('error')
    })

    it('离线时应该更新状态为 offline', () => {
      let lastStatus: string = ''
      
      engine = new SyncEngine<TestPhoto>({
        localAdapter: mockLocal,
        remoteAdapter: mockRemote,
        entityName: 'photos',
        onSyncStatusChange: (status) => { lastStatus = status.status },
      })

      engine.setOnlineStatus(false)

      expect(lastStatus).toBe('offline')
    })
  })
})