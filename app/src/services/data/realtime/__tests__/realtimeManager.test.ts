/**
 * realtimeManager 单元测试
 * 测试 Supabase Realtime 订阅管理
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/services/db/personDB', () => ({
  personDB: {
    add: vi.fn(),
    deletePerson: vi.fn(),
  },
}))

import { createRealtimeManager } from '../realtimeManager'
import { personDB } from '@/services/db/personDB'

function createMockSupabase() {
  const mockChannel = {
    on: vi.fn().mockReturnThis(),
    subscribe: vi.fn().mockReturnThis(),
    unsubscribe: vi.fn(),
  }

  return {
    supabase: {
      channel: vi.fn().mockReturnValue(mockChannel),
    },
    mockChannel,
  }
}

describe('realtimeManager', () => {
  let mockTransform: (row: Record<string, unknown>) => {
    id: string
    name: string
    avatar: string
    department: string
    joinedAt: Date
    photoCount: number
    tags: string[]
  }
  let mockResolve: <T extends { id: string; version?: number }>(local: T, remote: T) => Promise<T>

  beforeEach(() => {
    vi.clearAllMocks()
    mockTransform = (row) => ({
      id: row.id as string,
      name: (row.full_name as string) || '',
      avatar: (row.avatar_url as string) || '',
      department: '',
      joinedAt: new Date(),
      photoCount: 0,
      tags: [],
    })
    mockResolve = <T extends { id: string; version?: number }>(_local: T, remote: T) =>
      Promise.resolve(remote)
  })

  describe('subscribePersons', () => {
    it('should create a channel subscription', () => {
      const { supabase, mockChannel } = createMockSupabase()
      const manager = createRealtimeManager({
        supabase: supabase as never,
        transformSupabasePerson: mockTransform,
        resolveConflict: mockResolve,
      })

      const unsub = manager.subscribePersons()

      expect(supabase.channel).toHaveBeenCalledWith('persons-realtime')
      expect(mockChannel.on).toHaveBeenCalledWith(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'profiles' },
        expect.any(Function)
      )
      expect(mockChannel.subscribe).toHaveBeenCalled()
      expect(typeof unsub).toBe('function')
    })

    it('should handle INSERT events', async () => {
      const { supabase, mockChannel } = createMockSupabase()
      const callback = vi.fn()
      vi.mocked(personDB.add).mockResolvedValue(undefined)

      const transformSpy = vi.fn(mockTransform)
      const manager = createRealtimeManager({
        supabase: supabase as never,
        transformSupabasePerson: transformSpy,
        resolveConflict: mockResolve,
      })

      manager.subscribePersons(callback)

      // Get the handler passed to .on()
      const handler = mockChannel.on.mock.calls[0][2]

      await handler({
        eventType: 'INSERT',
        new: { id: 'p1', full_name: 'New Person' },
        old: {},
      })

      expect(transformSpy).toHaveBeenCalledWith({ id: 'p1', full_name: 'New Person' })
      expect(personDB.add).toHaveBeenCalled()
      expect(callback).toHaveBeenCalledWith(expect.objectContaining({ type: 'INSERT' }))
    })

    it('should handle UPDATE events', async () => {
      const { supabase, mockChannel } = createMockSupabase()
      vi.mocked(personDB.add).mockResolvedValue(undefined)

      const transformSpy = vi.fn(mockTransform)
      const manager = createRealtimeManager({
        supabase: supabase as never,
        transformSupabasePerson: transformSpy,
        resolveConflict: mockResolve,
      })

      manager.subscribePersons()

      const handler = mockChannel.on.mock.calls[0][2]

      await handler({
        eventType: 'UPDATE',
        new: { id: 'p1', full_name: 'Updated Person' },
        old: { id: 'p1', full_name: 'Old Person' },
      })

      expect(transformSpy).toHaveBeenCalledWith({ id: 'p1', full_name: 'Updated Person' })
      expect(personDB.add).toHaveBeenCalled()
    })

    it('should handle DELETE events', async () => {
      const { supabase, mockChannel } = createMockSupabase()
      vi.mocked(personDB.deletePerson).mockResolvedValue(undefined)

      const manager = createRealtimeManager({
        supabase: supabase as never,
        transformSupabasePerson: mockTransform,
        resolveConflict: mockResolve,
      })

      manager.subscribePersons()

      const handler = mockChannel.on.mock.calls[0][2]

      await handler({
        eventType: 'DELETE',
        new: {},
        old: { id: 'p1' },
      })

      expect(personDB.deletePerson).toHaveBeenCalledWith('p1')
    })

    it('should handle DELETE events without old data', async () => {
      const { supabase, mockChannel } = createMockSupabase()

      const manager = createRealtimeManager({
        supabase: supabase as never,
        transformSupabasePerson: mockTransform,
        resolveConflict: mockResolve,
      })

      manager.subscribePersons()

      const handler = mockChannel.on.mock.calls[0][2]

      await handler({
        eventType: 'DELETE',
        new: {},
        old: null,
      })

      expect(personDB.deletePerson).not.toHaveBeenCalled()
    })

    it('should handle errors in event handler', async () => {
      const { supabase, mockChannel } = createMockSupabase()
      vi.mocked(personDB.add).mockRejectedValue(new Error('DB error'))
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      const manager = createRealtimeManager({
        supabase: supabase as never,
        transformSupabasePerson: mockTransform,
        resolveConflict: mockResolve,
      })

      manager.subscribePersons()

      const handler = mockChannel.on.mock.calls[0][2]

      await handler({
        eventType: 'INSERT',
        new: { id: 'p1', full_name: 'Person' },
        old: {},
      })

      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('失败'), expect.any(Error))
      consoleSpy.mockRestore()
    })

    it('should unsubscribe existing channel before resubscribing', () => {
      const { supabase, mockChannel } = createMockSupabase()

      const manager = createRealtimeManager({
        supabase: supabase as never,
        transformSupabasePerson: mockTransform,
        resolveConflict: mockResolve,
      })

      manager.subscribePersons()
      manager.subscribePersons() // resubscribe

      expect(mockChannel.unsubscribe).toHaveBeenCalledTimes(1)
    })

    it('should unsubscribe when returned function is called', () => {
      const { supabase, mockChannel } = createMockSupabase()

      const manager = createRealtimeManager({
        supabase: supabase as never,
        transformSupabasePerson: mockTransform,
        resolveConflict: mockResolve,
      })

      const unsub = manager.subscribePersons()
      unsub()

      expect(mockChannel.unsubscribe).toHaveBeenCalled()
    })
  })

  describe('subscribeAll', () => {
    it('should subscribe to all tables', () => {
      const { supabase } = createMockSupabase()

      const manager = createRealtimeManager({
        supabase: supabase as never,
        transformSupabasePerson: mockTransform,
        resolveConflict: mockResolve,
      })

      const unsub = manager.subscribeAll({ onPersonChange: vi.fn() })

      expect(supabase.channel).toHaveBeenCalledWith('persons-realtime')
      expect(typeof unsub).toBe('function')
    })

    it('should unsubscribe all when returned function is called', () => {
      const { supabase, mockChannel } = createMockSupabase()

      const manager = createRealtimeManager({
        supabase: supabase as never,
        transformSupabasePerson: mockTransform,
        resolveConflict: mockResolve,
      })

      const unsub = manager.subscribeAll()
      unsub()

      expect(mockChannel.unsubscribe).toHaveBeenCalled()
    })
  })

  describe('cleanup', () => {
    it('should unsubscribe all channels', () => {
      const { supabase, mockChannel } = createMockSupabase()

      const manager = createRealtimeManager({
        supabase: supabase as never,
        transformSupabasePerson: mockTransform,
        resolveConflict: mockResolve,
      })

      manager.subscribePersons()
      manager.cleanup()

      expect(mockChannel.unsubscribe).toHaveBeenCalled()
    })
  })
})
