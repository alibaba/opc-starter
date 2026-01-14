/**
 * @vitest-environment jsdom
 */
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'
import { BehaviorSubject } from 'rxjs'
import { useQuery, useQueryOne, useMutation, useSyncStatus } from '../index'
import type { ReactiveCollection } from '../../ReactiveCollection'
import type { BaseEntity, SyncStatus } from '../../types'

interface TestPhoto extends BaseEntity {
  title: string
  url: string
  albumId?: string
}

const createMockCollection = () => {
  const dataSubject = new BehaviorSubject<TestPhoto[]>([])
  let idCounter = 0
  
  const mockCollection = {
    find: vi.fn((options?: { filter?: Partial<TestPhoto> }) => {
      if (options?.filter) {
        return dataSubject.pipe()
      }
      return dataSubject.asObservable()
    }),
    findOne: vi.fn((id: string) => {
      return new BehaviorSubject(dataSubject.getValue().find(p => p.id === id))
    }),
    insert: vi.fn(async (doc: Omit<TestPhoto, 'id'>) => {
      const newDoc = { ...doc, id: `photo-${++idCounter}` } as TestPhoto
      dataSubject.next([...dataSubject.getValue(), newDoc])
      return newDoc
    }),
    update: vi.fn(async (id: string, changes: Partial<TestPhoto>) => {
      const current = dataSubject.getValue()
      const updated = current.map(p => p.id === id ? { ...p, ...changes } : p)
      dataSubject.next(updated)
      return updated.find(p => p.id === id) as TestPhoto
    }),
    remove: vi.fn(async (id: string) => {
      dataSubject.next(dataSubject.getValue().filter(p => p.id !== id))
    }),
    _dataSubject: dataSubject,
    _addPhoto: (photo: TestPhoto) => {
      dataSubject.next([...dataSubject.getValue(), photo])
    },
  }
  
  return mockCollection as unknown as ReactiveCollection<TestPhoto> & {
    _dataSubject: BehaviorSubject<TestPhoto[]>
    _addPhoto: (photo: TestPhoto) => void
  }
}

describe('useQuery', () => {
  let mockCollection: ReturnType<typeof createMockCollection>

  beforeEach(() => {
    mockCollection = createMockCollection()
  })

  it('应该返回响应式数据', async () => {
    mockCollection._dataSubject.next([
      { id: '1', title: 'Photo 1', url: 'a.jpg' },
    ])

    const { result } = renderHook(() => useQuery(mockCollection))

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.data).toHaveLength(1)
    expect(result.current.error).toBeNull()
  })

  it('BehaviorSubject 有初始值时 loading 立即变为 false', async () => {
    const { result } = renderHook(() => useQuery(mockCollection))
    
    await waitFor(() => {
      expect(result.current.loading).toBe(false)
      expect(result.current.data).toHaveLength(0)
    })
  })

  it('数据变化时应该自动更新', async () => {
    const { result } = renderHook(() => useQuery(mockCollection))

    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.data).toHaveLength(0)

    act(() => {
      mockCollection._addPhoto({ id: '1', title: 'New', url: 'new.jpg' })
    })

    await waitFor(() => {
      expect(result.current.data).toHaveLength(1)
    })
  })

  it('依赖变化时应该重新订阅', async () => {
    const { result, rerender } = renderHook(
      ({ albumId }) => useQuery(mockCollection, { filter: { albumId } }),
      { initialProps: { albumId: 'a1' } }
    )

    await waitFor(() => expect(result.current.loading).toBe(false))

    rerender({ albumId: 'a2' })

    expect(mockCollection.find).toHaveBeenCalledTimes(2)
  })

  it('refetch 应该重新获取数据', async () => {
    const { result } = renderHook(() => useQuery(mockCollection))

    await waitFor(() => expect(result.current.loading).toBe(false))

    const initialCallCount = (mockCollection.find as ReturnType<typeof vi.fn>).mock.calls.length

    act(() => {
      result.current.refetch()
    })

    expect((mockCollection.find as ReturnType<typeof vi.fn>).mock.calls.length).toBeGreaterThan(initialCallCount)
  })
})

describe('useQueryOne', () => {
  let mockCollection: ReturnType<typeof createMockCollection>

  beforeEach(() => {
    mockCollection = createMockCollection()
    mockCollection._dataSubject.next([
      { id: '1', title: 'Photo 1', url: 'a.jpg' },
    ])
  })

  it('应该返回单条数据', async () => {
    const { result } = renderHook(() => useQueryOne(mockCollection, '1'))

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.data?.title).toBe('Photo 1')
  })

  it('不存在的 ID 应该返回 undefined', async () => {
    const { result } = renderHook(() => useQueryOne(mockCollection, 'non-existent'))

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.data).toBeUndefined()
  })
})

describe('useMutation', () => {
  let mockCollection: ReturnType<typeof createMockCollection>

  beforeEach(() => {
    mockCollection = createMockCollection()
  })

  it('insert 应该添加数据并返回结果', async () => {
    const { result } = renderHook(() => useMutation(mockCollection))

    let insertedPhoto: TestPhoto | undefined

    await act(async () => {
      insertedPhoto = await result.current.insert({ title: 'New', url: 'new.jpg' })
    })

    expect(insertedPhoto?.title).toBe('New')
    expect(insertedPhoto?.id).toBeDefined()
    expect(result.current.loading).toBe(false)
  })

  it('insert 时 loading 应该为 true', async () => {
    const { result } = renderHook(() => useMutation(mockCollection))

    expect(result.current.loading).toBe(false)

    const insertPromise = act(async () => {
      await result.current.insert({ title: 'Test', url: 'test.jpg' })
    })

    await insertPromise
    expect(result.current.loading).toBe(false)
  })

  it('insert 失败时应该设置 error', async () => {
    mockCollection.insert = vi.fn().mockRejectedValue(new Error('Failed'))

    const { result } = renderHook(() => useMutation(mockCollection))

    await act(async () => {
      try {
        await result.current.insert({ title: 'Fail', url: 'f.jpg' })
      } catch {
        // Expected
      }
    })

    expect(result.current.error?.message).toBe('Failed')
    expect(result.current.loading).toBe(false)
  })

  it('update 应该更新数据', async () => {
    mockCollection._addPhoto({ id: '1', title: 'Original', url: 'o.jpg' })

    const { result } = renderHook(() => useMutation(mockCollection))

    let updatedPhoto: TestPhoto | undefined

    await act(async () => {
      updatedPhoto = await result.current.update('1', { title: 'Updated' })
    })

    expect(updatedPhoto?.title).toBe('Updated')
  })

  it('remove 应该删除数据', async () => {
    mockCollection._addPhoto({ id: '1', title: 'To Delete', url: 'd.jpg' })

    const { result } = renderHook(() => useMutation(mockCollection))

    await act(async () => {
      await result.current.remove('1')
    })

    expect(mockCollection.remove).toHaveBeenCalledWith('1')
  })
})

describe('useSyncStatus', () => {
  it('无 observable 时应该返回默认状态', () => {
    const { result } = renderHook(() => useSyncStatus())

    expect(result.current.status).toBe('idle')
    expect(result.current.pendingCount).toBe(0)
  })

  it('应该反映 observable 的状态', async () => {
    const statusSubject = new BehaviorSubject<SyncStatus>({
      status: 'syncing',
      pendingCount: 5,
    })

    const { result } = renderHook(() => useSyncStatus(statusSubject.asObservable()))

    await waitFor(() => {
      expect(result.current.status).toBe('syncing')
      expect(result.current.pendingCount).toBe(5)
    })
  })

  it('状态变化时应该自动更新', async () => {
    const statusSubject = new BehaviorSubject<SyncStatus>({
      status: 'idle',
      pendingCount: 0,
    })

    const { result } = renderHook(() => useSyncStatus(statusSubject.asObservable()))

    await waitFor(() => expect(result.current.status).toBe('idle'))

    act(() => {
      statusSubject.next({ status: 'synced', pendingCount: 0, lastSyncAt: new Date() })
    })

    await waitFor(() => {
      expect(result.current.status).toBe('synced')
      expect(result.current.lastSyncAt).toBeDefined()
    })
  })

  it('离线时应该显示 offline 状态', async () => {
    const statusSubject = new BehaviorSubject<SyncStatus>({
      status: 'offline',
      pendingCount: 3,
    })

    const { result } = renderHook(() => useSyncStatus(statusSubject.asObservable()))

    await waitFor(() => {
      expect(result.current.status).toBe('offline')
      expect(result.current.pendingCount).toBe(3)
    })
  })

  it('错误时应该包含 error 信息', async () => {
    const testError = new Error('Sync failed')
    const statusSubject = new BehaviorSubject<SyncStatus>({
      status: 'error',
      pendingCount: 0,
      error: testError,
    })

    const { result } = renderHook(() => useSyncStatus(statusSubject.asObservable()))

    await waitFor(() => {
      expect(result.current.status).toBe('error')
      expect(result.current.error?.message).toBe('Sync failed')
    })
  })
})