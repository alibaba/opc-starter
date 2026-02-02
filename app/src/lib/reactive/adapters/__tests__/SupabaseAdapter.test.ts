import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { SupabaseClient } from '@supabase/supabase-js'
import { SupabaseAdapter } from '../SupabaseAdapter'
import type { BaseEntity } from '../../types'

interface TestPhoto extends BaseEntity {
  title: string
  url: string
  albumId?: string
}

const createMockSupabaseClient = () => {
  const channelCallbacks: Map<string, (payload: unknown) => void> = new Map()
  
  const mockChannel = {
    on: vi.fn().mockReturnThis(),
    subscribe: vi.fn().mockReturnThis(),
  }
  
  const mockFrom = {
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    range: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: null, error: null }),
  }
  
  const mockClient = {
    from: vi.fn().mockReturnValue(mockFrom),
    channel: vi.fn().mockReturnValue(mockChannel),
    removeChannel: vi.fn(),
    _mockFrom: mockFrom,
    _mockChannel: mockChannel,
    _channelCallbacks: channelCallbacks,
    _triggerRealtimeEvent: (payload: unknown) => {
      const onCall = mockChannel.on.mock.calls.find(
        (call: unknown[]) => call[0] === 'postgres_changes'
      )
      if (onCall && onCall[2]) {
        onCall[2](payload)
      }
    },
  }
  
  return mockClient as unknown as SupabaseClient & {
    _mockFrom: typeof mockFrom
    _mockChannel: typeof mockChannel
    _triggerRealtimeEvent: (payload: unknown) => void
  }
}

describe('SupabaseAdapter', () => {
  let adapter: SupabaseAdapter<TestPhoto>
  let mockClient: ReturnType<typeof createMockSupabaseClient>

  beforeEach(() => {
    mockClient = createMockSupabaseClient()
    adapter = new SupabaseAdapter<TestPhoto>('photos', mockClient)
  })

  describe('fetch()', () => {
    it('应该调用 select 并返回数据', async () => {
      const mockData = [
        { id: '1', title: 'Photo 1', url: 'a.jpg' },
        { id: '2', title: 'Photo 2', url: 'b.jpg' },
      ]
      
      mockClient._mockFrom.select.mockReturnValue({
        ...mockClient._mockFrom,
        then: (resolve: (value: { data: unknown; error: null }) => void) => 
          resolve({ data: mockData, error: null }),
      })

      const result = await adapter.fetch()
      
      expect(mockClient.from).toHaveBeenCalledWith('photos')
      expect(result).toEqual(mockData)
    })

    it('应该支持过滤条件', async () => {
      mockClient._mockFrom.eq.mockReturnValue({
        ...mockClient._mockFrom,
        then: (resolve: (value: { data: unknown[]; error: null }) => void) => 
          resolve({ data: [], error: null }),
      })

      await adapter.fetch({ filter: { albumId: 'album-1' } })
      
      expect(mockClient._mockFrom.eq).toHaveBeenCalledWith('albumId', 'album-1')
    })

    it('应该支持排序', async () => {
      mockClient._mockFrom.order.mockReturnValue({
        ...mockClient._mockFrom,
        then: (resolve: (value: { data: unknown[]; error: null }) => void) => 
          resolve({ data: [], error: null }),
      })

      await adapter.fetch({ sort: { field: 'title', order: 'asc' } })
      
      expect(mockClient._mockFrom.order).toHaveBeenCalledWith('title', { ascending: true })
    })

    it('fetch 失败时应该抛出错误', async () => {
      const mockError = { message: 'Database error', code: 'ERROR' }
      
      mockClient._mockFrom.select.mockReturnValue({
        ...mockClient._mockFrom,
        then: (resolve: (value: { data: null; error: typeof mockError }) => void) => 
          resolve({ data: null, error: mockError }),
      })

      await expect(adapter.fetch()).rejects.toEqual(mockError)
    })
  })

  describe('fetchOne()', () => {
    it('应该返回单条记录', async () => {
      const mockPhoto = { id: '1', title: 'Photo 1', url: 'a.jpg' }
      
      mockClient._mockFrom.single.mockResolvedValue({ data: mockPhoto, error: null })

      const result = await adapter.fetchOne('1')
      
      expect(mockClient._mockFrom.eq).toHaveBeenCalledWith('id', '1')
      expect(result).toEqual(mockPhoto)
    })

    it('记录不存在时应该返回 undefined', async () => {
      mockClient._mockFrom.single.mockResolvedValue({ 
        data: null, 
        error: { code: 'PGRST116', message: 'Not found' } 
      })

      const result = await adapter.fetchOne('non-existent')
      
      expect(result).toBeUndefined()
    })
  })

  describe('insert()', () => {
    it('应该插入记录并返回结果', async () => {
      const newPhoto = { title: 'New Photo', url: 'new.jpg' }
      const insertedPhoto = { id: 'server-1', ...newPhoto }
      
      mockClient._mockFrom.single.mockResolvedValue({ data: insertedPhoto, error: null })

      const result = await adapter.insert(newPhoto)
      
      expect(mockClient._mockFrom.insert).toHaveBeenCalledWith(newPhoto)
      expect(result).toEqual(insertedPhoto)
    })
  })

  describe('update()', () => {
    it('应该更新记录并返回结果', async () => {
      const changes = { title: 'Updated Title' }
      const updatedPhoto = { id: '1', title: 'Updated Title', url: 'a.jpg' }
      
      mockClient._mockFrom.single.mockResolvedValue({ data: updatedPhoto, error: null })

      const result = await adapter.update('1', changes)
      
      expect(mockClient._mockFrom.update).toHaveBeenCalledWith(changes)
      expect(mockClient._mockFrom.eq).toHaveBeenCalledWith('id', '1')
      expect(result).toEqual(updatedPhoto)
    })
  })

  describe('remove()', () => {
    it('应该删除记录', async () => {
      mockClient._mockFrom.eq.mockReturnValue({
        ...mockClient._mockFrom,
        then: (resolve: (value: { error: null }) => void) => 
          resolve({ error: null }),
      })

      await adapter.remove('1')
      
      expect(mockClient._mockFrom.delete).toHaveBeenCalled()
      expect(mockClient._mockFrom.eq).toHaveBeenCalledWith('id', '1')
    })
  })

  describe('Realtime Subscription', () => {
    it('subscribe() 应该订阅 postgres_changes', () => {
      const callback = vi.fn()
      
      adapter.subscribe(callback)

      expect(mockClient.channel).toHaveBeenCalled()
      expect(mockClient._mockChannel.on).toHaveBeenCalledWith(
        'postgres_changes',
        expect.objectContaining({ table: 'photos' }),
        expect.any(Function)
      )
      expect(mockClient._mockChannel.subscribe).toHaveBeenCalled()
    })

    it('应该将 Supabase INSERT payload 转换为标准 Change 格式', () => {
      const callback = vi.fn()
      adapter.subscribe(callback)

      const supabasePayload = {
        eventType: 'INSERT',
        new: { id: '1', title: 'New', url: 'new.jpg' },
        old: {},
      }
      
      mockClient._triggerRealtimeEvent(supabasePayload)

      expect(callback).toHaveBeenCalledWith({
        type: 'INSERT',
        doc: { id: '1', title: 'New', url: 'new.jpg' },
      })
    })

    it('应该将 Supabase UPDATE payload 转换为标准 Change 格式', () => {
      const callback = vi.fn()
      adapter.subscribe(callback)

      const supabasePayload = {
        eventType: 'UPDATE',
        new: { id: '1', title: 'Updated', url: 'a.jpg' },
        old: { id: '1', title: 'Original', url: 'a.jpg' },
      }
      
      mockClient._triggerRealtimeEvent(supabasePayload)

      expect(callback).toHaveBeenCalledWith({
        type: 'UPDATE',
        doc: { id: '1', title: 'Updated', url: 'a.jpg' },
        oldDoc: { id: '1', title: 'Original', url: 'a.jpg' },
      })
    })

    it('应该将 Supabase DELETE payload 转换为标准 Change 格式', () => {
      const callback = vi.fn()
      adapter.subscribe(callback)

      const supabasePayload = {
        eventType: 'DELETE',
        new: {},
        old: { id: '1', title: 'Deleted', url: 'a.jpg' },
      }
      
      mockClient._triggerRealtimeEvent(supabasePayload)

      expect(callback).toHaveBeenCalledWith({
        type: 'DELETE',
        id: '1',
        oldDoc: { id: '1', title: 'Deleted', url: 'a.jpg' },
      })
    })

    it('unsubscribe 应该移除 channel', () => {
      const callback = vi.fn()
      const unsubscribe = adapter.subscribe(callback)

      unsubscribe()

      expect(mockClient.removeChannel).toHaveBeenCalled()
    })
  })
})
