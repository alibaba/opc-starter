/**
 * remoteApi 远程 API 测试
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/supabase/client', () => ({
  supabase: {
    from: vi.fn(),
  },
}))

vi.mock('@/lib/supabase/auth', () => ({
  authService: {
    getCurrentUser: vi.fn(),
  },
}))

vi.mock('@/services/db/personDB', () => ({
  personDB: {
    get: vi.fn(),
    getAll: vi.fn(),
    add: vi.fn(),
    addPersons: vi.fn(),
    deletePerson: vi.fn(),
  },
}))

import { supabase } from '@/lib/supabase/client'
import { authService } from '@/lib/supabase/auth'
import { personDB } from '@/services/db/personDB'
import { createRemoteApi } from '../remoteApi'

const mockedSupabase = vi.mocked(supabase)
const mockedAuth = vi.mocked(authService)
const mockedPersonDB = vi.mocked(personDB)

describe('remoteApi', () => {
  let api: ReturnType<typeof createRemoteApi>

  beforeEach(() => {
    vi.clearAllMocks()
    api = createRemoteApi()
  })

  describe('transformSupabasePerson', () => {
    it('应该正确转换 Supabase 数据', () => {
      const row = {
        id: 'p-1',
        full_name: 'Test User',
        avatar_url: 'https://example.com/avatar.jpg',
        department: 'Engineering',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      }

      const person = api.transformSupabasePerson(row)

      expect(person.id).toBe('p-1')
      expect(person.name).toBe('Test User')
      expect(person.avatar).toBe('https://example.com/avatar.jpg')
      expect(person.department).toBe('Engineering')
      expect(person.photoCount).toBe(0)
      expect(person.tags).toEqual([])
    })

    it('应该处理缺失字段', () => {
      const row = { id: 'p-1' }
      const person = api.transformSupabasePerson(row)

      expect(person.name).toBe('Unknown')
      expect(person.avatar).toBe('')
      expect(person.department).toBe('')
    })
  })

  describe('createPerson', () => {
    it('应该创建人物', async () => {
      mockedAuth.getCurrentUser.mockResolvedValue({ id: 'user-1' } as never)

      const mockUpsert = vi.fn().mockResolvedValue({ error: null })
      mockedSupabase.from.mockReturnValue({ upsert: mockUpsert } as never)

      const person = {
        id: 'p-1',
        name: 'Test',
        avatar: '',
        department: '',
        joinedAt: new Date('2024-01-01'),
        photoCount: 0,
        tags: [],
      }

      const result = await api.createPerson(person)
      expect(result.id).toBe('p-1')
      expect(mockedSupabase.from).toHaveBeenCalledWith('profiles')
    })

    it('应该在未登录时抛错', async () => {
      mockedAuth.getCurrentUser.mockResolvedValue(null)

      await expect(
        api.createPerson({
          id: 'p-1',
          name: 'Test',
          avatar: '',
          department: '',
          joinedAt: new Date(),
          photoCount: 0,
          tags: [],
        })
      ).rejects.toThrow('用户未登录')
    })

    it('应该处理 Supabase 错误', async () => {
      mockedAuth.getCurrentUser.mockResolvedValue({ id: 'user-1' } as never)

      const mockUpsert = vi.fn().mockResolvedValue({ error: new Error('DB Error') })
      mockedSupabase.from.mockReturnValue({ upsert: mockUpsert } as never)

      await expect(
        api.createPerson({
          id: 'p-1',
          name: 'Test',
          avatar: '',
          department: '',
          joinedAt: new Date(),
          photoCount: 0,
          tags: [],
        })
      ).rejects.toThrow()
    })
  })

  describe('updatePerson', () => {
    it('应该更新人物', async () => {
      mockedPersonDB.get.mockResolvedValue({
        id: 'p-1',
        name: 'Old Name',
        avatar: '',
        department: '',
        joinedAt: new Date(),
        photoCount: 0,
        tags: [],
      } as never)

      const mockEq = vi.fn().mockResolvedValue({ error: null })
      const mockUpdate = vi.fn().mockReturnValue({ eq: mockEq })
      mockedSupabase.from.mockReturnValue({ update: mockUpdate } as never)

      const result = await api.updatePerson('p-1', { name: 'New Name' })
      expect(result.name).toBe('New Name')
    })

    it('应该在人物不存在时抛错', async () => {
      mockedPersonDB.get.mockResolvedValue(null as never)

      await expect(api.updatePerson('nonexistent', { name: 'Test' })).rejects.toThrow(
        'Person not found'
      )
    })
  })

  describe('deletePerson', () => {
    it('应该删除人物', async () => {
      const mockEq = vi.fn().mockResolvedValue({ error: null })
      const mockDelete = vi.fn().mockReturnValue({ eq: mockEq })
      mockedSupabase.from.mockReturnValue({ delete: mockDelete } as never)

      await api.deletePerson('p-1')
      expect(mockedSupabase.from).toHaveBeenCalledWith('profiles')
    })

    it('应该处理错误', async () => {
      const mockEq = vi.fn().mockResolvedValue({ error: new Error('Delete failed') })
      const mockDelete = vi.fn().mockReturnValue({ eq: mockEq })
      mockedSupabase.from.mockReturnValue({ delete: mockDelete } as never)

      await expect(api.deletePerson('p-1')).rejects.toThrow()
    })
  })

  describe('syncPersonsFromCloud', () => {
    it('应该同步云端人物数据', async () => {
      const mockOrder = vi.fn().mockResolvedValue({
        data: [
          { id: 'p-1', full_name: 'User 1', created_at: '2024-01-01' },
          { id: 'p-2', full_name: 'User 2', created_at: '2024-01-02' },
        ],
        error: null,
      })
      const mockSelect = vi.fn().mockReturnValue({ order: mockOrder })
      mockedSupabase.from.mockReturnValue({ select: mockSelect } as never)
      mockedPersonDB.addPersons.mockResolvedValue(undefined as never)

      const count = await api.syncPersonsFromCloud()
      expect(count).toBe(2)
      expect(mockedPersonDB.addPersons).toHaveBeenCalled()
    })

    it('应该返回 0 当云端无数据', async () => {
      const mockOrder = vi.fn().mockResolvedValue({ data: [], error: null })
      const mockSelect = vi.fn().mockReturnValue({ order: mockOrder })
      mockedSupabase.from.mockReturnValue({ select: mockSelect } as never)

      const count = await api.syncPersonsFromCloud()
      expect(count).toBe(0)
    })

    it('应该处理错误', async () => {
      const mockOrder = vi.fn().mockResolvedValue({ data: null, error: new Error('Sync failed') })
      const mockSelect = vi.fn().mockReturnValue({ order: mockOrder })
      mockedSupabase.from.mockReturnValue({ select: mockSelect } as never)

      await expect(api.syncPersonsFromCloud()).rejects.toThrow()
    })
  })

  describe('executePersonOperation', () => {
    it('应该处理 add 操作', async () => {
      mockedAuth.getCurrentUser.mockResolvedValue({ id: 'user-1' } as never)
      const mockUpsert = vi.fn().mockResolvedValue({ error: null })
      mockedSupabase.from.mockReturnValue({ upsert: mockUpsert } as never)

      const op = {
        id: 'p-1',
        type: 'add' as const,
        entityType: 'person' as const,
        data: { name: 'New Person' },
        timestamp: Date.now(),
        retryCount: 0,
      }

      const result = await api.executePersonOperation(op)
      expect(result).toBeDefined()
    })

    it('应该处理 update 操作', async () => {
      mockedPersonDB.get.mockResolvedValue({
        id: 'p-1',
        name: 'Old',
        avatar: '',
        department: '',
        joinedAt: new Date(),
        photoCount: 0,
        tags: [],
      } as never)

      const mockEq = vi.fn().mockResolvedValue({ error: null })
      const mockUpdate = vi.fn().mockReturnValue({ eq: mockEq })
      mockedSupabase.from.mockReturnValue({ update: mockUpdate } as never)

      const op = {
        id: 'p-1',
        type: 'update' as const,
        entityType: 'person' as const,
        data: { name: 'Updated' },
        timestamp: Date.now(),
        retryCount: 0,
      }

      const result = await api.executePersonOperation(op)
      expect(result).toBeDefined()
    })

    it('应该处理 delete 操作', async () => {
      const mockEq = vi.fn().mockResolvedValue({ error: null })
      const mockDelete = vi.fn().mockReturnValue({ eq: mockEq })
      mockedSupabase.from.mockReturnValue({ delete: mockDelete } as never)

      const op = {
        id: 'p-1',
        type: 'delete' as const,
        entityType: 'person' as const,
        data: {},
        timestamp: Date.now(),
        retryCount: 0,
      }

      const result = await api.executePersonOperation(op)
      expect(result).toBeUndefined()
    })

    it('应该处理不支持的操作类型', async () => {
      const op = {
        id: 'p-1',
        type: 'unknown' as 'add',
        entityType: 'person' as const,
        data: {},
        timestamp: Date.now(),
        retryCount: 0,
      }

      const result = await api.executePersonOperation(op)
      expect(result).toBeUndefined()
    })
  })
})
