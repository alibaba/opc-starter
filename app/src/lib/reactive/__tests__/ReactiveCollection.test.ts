import { beforeEach, describe, expect, it, vi } from 'vitest'
import { firstValueFrom } from 'rxjs'
import type { LocalAdapter, RemoteAdapter, Change } from '../types'
import { ReactiveCollection } from '../ReactiveCollection'

/**
 * 测试用的 Mock 类型
 */
interface MockPhoto {
  id: string
  title: string
  url: string
  tags: string[]
  participants: string[]
  albumId?: string
  createdAt?: Date
  clientId?: string
  [key: string]: unknown // 添加索引签名以允许类型转换
}

const createMockLocalAdapter = (): LocalAdapter<MockPhoto> & {
  _store: Map<string, MockPhoto>
  _listeners: Set<(change: Change<MockPhoto>) => void>
} => {
  const store = new Map<string, MockPhoto>()
  const listeners = new Set<(change: Change<MockPhoto>) => void>()

  return {
    _store: store,
    _listeners: listeners,

    findAll: vi.fn(async () => Array.from(store.values())),
    findOne: vi.fn(async (id: string) => store.get(id)),
    query: vi.fn(async (options) => {
      let results = Array.from(store.values())
      if (options.filter && typeof options.filter === 'object') {
        results = results.filter((item) =>
          Object.entries(options.filter as object).every(
            ([k, v]) => (item as Record<string, unknown>)[k] === v
          )
        )
      }
      if (options.sort) {
        const { field, order } = options.sort
        results.sort((a, b) => {
          const aVal = a[field as keyof MockPhoto]
          const bVal = b[field as keyof MockPhoto]
          if (aVal === undefined || aVal === null || bVal === undefined || bVal === null) return 0
          if (aVal < bVal) return order === 'asc' ? -1 : 1
          if (aVal > bVal) return order === 'asc' ? 1 : -1
          return 0
        })
      }
      return results
    }),
    upsert: vi.fn(async (doc: MockPhoto) => {
      store.set(doc.id, doc)
    }),
    bulkUpsert: vi.fn(async (docs: MockPhoto[]) => {
      docs.forEach((doc) => store.set(doc.id, doc))
    }),
    remove: vi.fn(async (id: string) => {
      store.delete(id)
    }),
    clear: vi.fn(async () => {
      store.clear()
    }),
  }
}

const createMockRemoteAdapter = (): RemoteAdapter<MockPhoto> & {
  _subscribeCallback?: (change: Change<MockPhoto>) => void
  simulateChange: (change: Change<MockPhoto>) => void
} => {
  let subscribeCallback: ((change: Change<MockPhoto>) => void) | undefined
  let idCounter = 0

  return {
    _subscribeCallback: subscribeCallback,

    fetch: vi.fn(async () => []),
    fetchOne: vi.fn(async () => undefined),
    insert: vi.fn(async (doc) => ({ ...doc, id: `server-uuid-${++idCounter}` }) as MockPhoto),
    update: vi.fn(async (id, changes) => ({ id, ...changes }) as MockPhoto),
    remove: vi.fn(async () => {}),
    subscribe: vi.fn((callback) => {
      subscribeCallback = callback
      return () => {
        subscribeCallback = undefined
      }
    }),

    simulateChange: (change: Change<MockPhoto>) => {
      subscribeCallback?.(change)
    },
  }
}

describe('ReactiveCollection', () => {
  let collection: ReactiveCollection<MockPhoto>
  let mockLocalAdapter: ReturnType<typeof createMockLocalAdapter>
  let mockRemoteAdapter: ReturnType<typeof createMockRemoteAdapter>

  beforeEach(async () => {
    mockLocalAdapter = createMockLocalAdapter()
    mockRemoteAdapter = createMockRemoteAdapter()
    collection = new ReactiveCollection<MockPhoto>('photos', {
      localAdapter: mockLocalAdapter,
      remoteAdapter: mockRemoteAdapter,
    })
    await collection.ready()
  })

  describe('find() - 响应式查询', () => {
    it('应该返回 Observable 并在数据变化时自动更新', async () => {
      const results: MockPhoto[][] = []

      const subscription = collection.find().subscribe((photos) => {
        results.push([...photos])
      })

      await collection.insert({ title: 'Test Photo', url: 'test.jpg', tags: [], participants: [] })

      await new Promise((resolve) => setTimeout(resolve, 50))
      subscription.unsubscribe()

      expect(results.length).toBeGreaterThanOrEqual(2)
      expect(results[0]).toHaveLength(0)
      expect(results[results.length - 1]).toHaveLength(1)
    })

    it('应该支持过滤条件', async () => {
      await collection.insert({
        title: 'Photo A',
        url: 'a.jpg',
        albumId: 'album-1',
        tags: [],
        participants: [],
      })
      await collection.insert({
        title: 'Photo B',
        url: 'b.jpg',
        albumId: 'album-2',
        tags: [],
        participants: [],
      })

      await new Promise((resolve) => setTimeout(resolve, 20))

      const photos = await firstValueFrom(collection.find({ filter: { albumId: 'album-1' } }))

      expect(photos).toHaveLength(1)
      expect(photos[0].albumId).toBe('album-1')
    })

    it('应该支持排序', async () => {
      await collection.insert({
        title: 'Old Photo',
        url: 'old.jpg',
        createdAt: new Date('2024-01-01'),
        tags: [],
        participants: [],
      })
      await collection.insert({
        title: 'New Photo',
        url: 'new.jpg',
        createdAt: new Date('2025-01-01'),
        tags: [],
        participants: [],
      })

      await new Promise((resolve) => setTimeout(resolve, 20))

      const photos = await firstValueFrom(
        collection.find({ sort: { field: 'createdAt', order: 'desc' } })
      )

      expect(photos).toHaveLength(2)
      expect(photos[0].title).toBe('New Photo')
      expect(photos[1].title).toBe('Old Photo')
    })
  })

  describe('insert() - 乐观插入', () => {
    it('应该立即更新本地数据（乐观更新）', async () => {
      const subscription = vi.fn()
      collection.find().subscribe(subscription)

      const promise = collection.insert({
        title: 'New Photo',
        url: 'new.jpg',
        tags: [],
        participants: [],
      })

      await new Promise((resolve) => setTimeout(resolve, 10))

      expect(subscription).toHaveBeenCalled()
      const lastCall = subscription.mock.calls[subscription.mock.calls.length - 1][0]
      expect(lastCall.some((p: MockPhoto) => p.title === 'New Photo')).toBe(true)

      await promise
    })

    it('应该在远程失败时回滚', async () => {
      mockRemoteAdapter.insert = vi.fn().mockRejectedValue(new Error('Network error'))

      const subscription = vi.fn()
      collection.find().subscribe(subscription)

      await expect(
        collection.insert({ title: 'Fail Photo', url: 'fail.jpg', tags: [], participants: [] })
      ).rejects.toThrow('Network error')

      await new Promise((resolve) => setTimeout(resolve, 50))

      const lastCall = subscription.mock.calls[subscription.mock.calls.length - 1][0]
      expect(lastCall.some((p: MockPhoto) => p.title === 'Fail Photo')).toBe(false)
    })

    it('应该用服务端 ID 替换临时 ID', async () => {
      mockRemoteAdapter.insert = vi.fn().mockResolvedValue({
        id: 'server-uuid-123',
        title: 'New Photo',
        url: 'new.jpg',
        tags: [],
        participants: [],
      })

      const result = await collection.insert({
        title: 'New Photo',
        url: 'new.jpg',
        tags: [],
        participants: [],
      })

      expect(result.id).toBe('server-uuid-123')
      expect(result.id).not.toMatch(/^temp_/)
    })

    it('应该使用 clientId 作为稳定标识符', async () => {
      const result = await collection.insert({
        title: 'New Photo',
        url: 'new.jpg',
        tags: [],
        participants: [],
      })

      expect(result.clientId).toBeDefined()
      expect(typeof result.clientId).toBe('string')
    })
  })

  describe('update() - 乐观更新', () => {
    it('应该立即更新本地数据', async () => {
      const inserted = await collection.insert({
        title: 'Original',
        url: 'test.jpg',
        tags: [],
        participants: [],
      })

      const updatePromise = collection.update(inserted.id, { title: 'Updated' })

      await new Promise((resolve) => setTimeout(resolve, 10))

      const current = await firstValueFrom(collection.findOne(inserted.id))
      expect(current?.title).toBe('Updated')

      await updatePromise
    })

    it('应该在失败时回滚到原始值', async () => {
      const inserted = await collection.insert({
        title: 'Original',
        url: 'test.jpg',
        tags: [],
        participants: [],
      })

      mockRemoteAdapter.update = vi.fn().mockRejectedValue(new Error('Conflict'))

      await expect(collection.update(inserted.id, { title: 'Updated' })).rejects.toThrow('Conflict')

      await new Promise((resolve) => setTimeout(resolve, 50))

      const current = await firstValueFrom(collection.findOne(inserted.id))
      expect(current?.title).toBe('Original')
    })
  })

  describe('remove() - 乐观删除', () => {
    it('应该立即从本地删除', async () => {
      const inserted = await collection.insert({
        title: 'To Delete',
        url: 'delete.jpg',
        tags: [],
        participants: [],
      })

      const deletePromise = collection.remove(inserted.id)

      await new Promise((resolve) => setTimeout(resolve, 10))

      const photos = await firstValueFrom(collection.find())
      expect(photos.some((p) => p.id === inserted.id)).toBe(false)

      await deletePromise
    })

    it('应该在失败时恢复', async () => {
      const inserted = await collection.insert({
        title: 'Keep Me',
        url: 'keep.jpg',
        tags: [],
        participants: [],
      })

      mockRemoteAdapter.remove = vi.fn().mockRejectedValue(new Error('Cannot delete'))

      await expect(collection.remove(inserted.id)).rejects.toThrow('Cannot delete')

      await new Promise((resolve) => setTimeout(resolve, 50))

      const photos = await firstValueFrom(collection.find())
      expect(photos.some((p) => p.id === inserted.id)).toBe(true)
    })
  })

  describe('Realtime Sync - 实时同步', () => {
    it('应该处理远程 INSERT 事件', async () => {
      const subscription = vi.fn()
      collection.find().subscribe(subscription)

      mockRemoteAdapter.simulateChange({
        type: 'INSERT',
        doc: {
          id: 'remote-new',
          title: 'Remote Photo',
          url: 'remote.jpg',
          tags: [],
          participants: [],
        },
      })

      await new Promise((resolve) => setTimeout(resolve, 50))

      const lastCall = subscription.mock.calls[subscription.mock.calls.length - 1][0]
      expect(lastCall.some((p: MockPhoto) => p.id === 'remote-new')).toBe(true)
    })

    it('应该处理远程 UPDATE 事件', async () => {
      await collection.insert({ title: 'Original', url: 'test.jpg', tags: [], participants: [] })
      const photos = await firstValueFrom(collection.find())
      const photoId = photos[0].id

      mockRemoteAdapter.simulateChange({
        type: 'UPDATE',
        doc: { id: photoId, title: 'Remote Update', url: 'test.jpg', tags: [], participants: [] },
      })

      await new Promise((resolve) => setTimeout(resolve, 50))

      const updated = await firstValueFrom(collection.findOne(photoId))
      expect(updated?.title).toBe('Remote Update')
    })

    it('应该处理远程 DELETE 事件', async () => {
      const inserted = await collection.insert({
        title: 'To Delete',
        url: 'test.jpg',
        tags: [],
        participants: [],
      })

      mockRemoteAdapter.simulateChange({
        type: 'DELETE',
        id: inserted.id,
      })

      await new Promise((resolve) => setTimeout(resolve, 50))

      const photos = await firstValueFrom(collection.find())
      expect(photos.some((p) => p.id === inserted.id)).toBe(false)
    })
  })

  describe('onError callback', () => {
    it('应该在操作失败时调用 onError 回调', async () => {
      const onError = vi.fn()

      collection = new ReactiveCollection<MockPhoto>('photos', {
        localAdapter: mockLocalAdapter,
        remoteAdapter: mockRemoteAdapter,
        onError,
      })

      mockRemoteAdapter.insert = vi.fn().mockRejectedValue(new Error('Network error'))

      await expect(
        collection.insert({ title: 'Fail', url: 'fail.jpg', tags: [], participants: [] })
      ).rejects.toThrow()

      expect(onError).toHaveBeenCalledWith(expect.any(Error), 'insert')
    })
  })
})
