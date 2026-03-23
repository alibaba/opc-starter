/**
 * personService 测试
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock supabase
vi.mock('@/lib/supabase/client', () => ({
  supabase: {
    from: vi.fn(),
  },
}))

// Mock authService
vi.mock('@/lib/supabase/auth', () => ({
  authService: {
    getCurrentUser: vi.fn(),
  },
}))

import { supabase } from '@/lib/supabase/client'
import { authService } from '@/lib/supabase/auth'
import {
  getPersons,
  getPersonById,
  createPerson,
  updatePerson,
  deletePerson,
  getPersonPhotoCount,
} from '../personService'

const mockedSupabase = vi.mocked(supabase)
const mockedAuth = vi.mocked(authService)

const mockSupabasePerson = {
  id: 'person-1',
  user_id: 'user-1',
  name: 'Test Person',
  avatar: 'https://example.com/avatar.jpg',
  tags: ['family'],
  department: 'Engineering',
  photo_count: 5,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
}

describe('personService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getPersons', () => {
    it('应该获取并转换人物列表', async () => {
      const mockOrder = vi.fn().mockResolvedValue({
        data: [mockSupabasePerson],
        error: null,
      })
      const mockSelect = vi.fn().mockReturnValue({ order: mockOrder })
      mockedSupabase.from.mockReturnValue({ select: mockSelect } as never)

      const result = await getPersons()

      expect(mockedSupabase.from).toHaveBeenCalledWith('persons')
      expect(result).toHaveLength(1)
      expect(result[0].id).toBe('person-1')
      expect(result[0].name).toBe('Test Person')
      expect(result[0].photoCount).toBe(5)
      expect(result[0].tags).toEqual(['family'])
    })

    it('应该处理 Supabase 错误', async () => {
      const mockOrder = vi.fn().mockResolvedValue({
        data: null,
        error: { message: 'Database error' },
      })
      const mockSelect = vi.fn().mockReturnValue({ order: mockOrder })
      mockedSupabase.from.mockReturnValue({ select: mockSelect } as never)

      await expect(getPersons()).rejects.toThrow('获取人物列表失败')
    })

    it('应该返回空数组当无数据', async () => {
      const mockOrder = vi.fn().mockResolvedValue({ data: null, error: null })
      const mockSelect = vi.fn().mockReturnValue({ order: mockOrder })
      mockedSupabase.from.mockReturnValue({ select: mockSelect } as never)

      const result = await getPersons()
      expect(result).toEqual([])
    })
  })

  describe('getPersonById', () => {
    it('应该获取并转换单个人物', async () => {
      const mockMaybeSingle = vi.fn().mockResolvedValue({
        data: mockSupabasePerson,
        error: null,
      })
      const mockEq = vi.fn().mockReturnValue({ maybeSingle: mockMaybeSingle })
      const mockSelect = vi.fn().mockReturnValue({ eq: mockEq })
      mockedSupabase.from.mockReturnValue({ select: mockSelect } as never)

      const result = await getPersonById('person-1')

      expect(result).not.toBeNull()
      expect(result?.id).toBe('person-1')
      expect(result?.name).toBe('Test Person')
    })

    it('应该返回 null 当人物不存在', async () => {
      const mockMaybeSingle = vi.fn().mockResolvedValue({
        data: null,
        error: null,
      })
      const mockEq = vi.fn().mockReturnValue({ maybeSingle: mockMaybeSingle })
      const mockSelect = vi.fn().mockReturnValue({ eq: mockEq })
      mockedSupabase.from.mockReturnValue({ select: mockSelect } as never)

      const result = await getPersonById('nonexistent')
      expect(result).toBeNull()
    })

    it('应该处理 Supabase 错误', async () => {
      const mockMaybeSingle = vi.fn().mockResolvedValue({
        data: null,
        error: { message: 'Not found' },
      })
      const mockEq = vi.fn().mockReturnValue({ maybeSingle: mockMaybeSingle })
      const mockSelect = vi.fn().mockReturnValue({ eq: mockEq })
      mockedSupabase.from.mockReturnValue({ select: mockSelect } as never)

      await expect(getPersonById('person-1')).rejects.toThrow('获取人物详情失败')
    })
  })

  describe('createPerson', () => {
    it('应该创建人物', async () => {
      mockedAuth.getCurrentUser.mockResolvedValue({ id: 'user-1' } as never)

      const mockSingle = vi.fn().mockResolvedValue({
        data: mockSupabasePerson,
        error: null,
      })
      const mockSelect = vi.fn().mockReturnValue({ single: mockSingle })
      const mockInsert = vi.fn().mockReturnValue({ select: mockSelect })
      mockedSupabase.from.mockReturnValue({ insert: mockInsert } as never)

      const result = await createPerson({
        name: 'Test Person',
        avatar: 'https://example.com/avatar.jpg',
        tags: ['family'],
        department: '',
        joinedAt: new Date(),
      })

      expect(result.name).toBe('Test Person')
    })

    it('应该在未认证时抛错', async () => {
      mockedAuth.getCurrentUser.mockResolvedValue(null)

      await expect(
        createPerson({
          name: 'Test',
          avatar: '',
          tags: [],
          department: '',
          joinedAt: new Date(),
        })
      ).rejects.toThrow('User not authenticated')
    })

    it('应该处理 Supabase 错误', async () => {
      mockedAuth.getCurrentUser.mockResolvedValue({ id: 'user-1' } as never)

      const mockSingle = vi.fn().mockResolvedValue({
        data: null,
        error: { message: 'Insert failed' },
      })
      const mockSelect = vi.fn().mockReturnValue({ single: mockSingle })
      const mockInsert = vi.fn().mockReturnValue({ select: mockSelect })
      mockedSupabase.from.mockReturnValue({ insert: mockInsert } as never)

      await expect(
        createPerson({
          name: 'Test',
          avatar: '',
          tags: [],
          department: '',
          joinedAt: new Date(),
        })
      ).rejects.toThrow('创建人物失败')
    })
  })

  describe('updatePerson', () => {
    it('应该更新人物', async () => {
      const mockEq = vi.fn().mockResolvedValue({ error: null })
      const mockUpdate = vi.fn().mockReturnValue({ eq: mockEq })
      mockedSupabase.from.mockReturnValue({ update: mockUpdate } as never)

      await updatePerson('person-1', { name: 'Updated Name' })

      expect(mockUpdate).toHaveBeenCalledWith({ name: 'Updated Name' })
    })

    it('应该处理错误', async () => {
      const mockEq = vi.fn().mockResolvedValue({ error: { message: 'Update failed' } })
      const mockUpdate = vi.fn().mockReturnValue({ eq: mockEq })
      mockedSupabase.from.mockReturnValue({ update: mockUpdate } as never)

      await expect(updatePerson('person-1', { name: 'Test' })).rejects.toThrow('更新人物失败')
    })
  })

  describe('deletePerson', () => {
    it('应该删除人物', async () => {
      const mockEq = vi.fn().mockResolvedValue({ error: null })
      const mockDelete = vi.fn().mockReturnValue({ eq: mockEq })
      mockedSupabase.from.mockReturnValue({ delete: mockDelete } as never)

      await deletePerson('person-1')

      expect(mockedSupabase.from).toHaveBeenCalledWith('persons')
    })

    it('应该处理错误', async () => {
      const mockEq = vi.fn().mockResolvedValue({ error: { message: 'Delete failed' } })
      const mockDelete = vi.fn().mockReturnValue({ eq: mockEq })
      mockedSupabase.from.mockReturnValue({ delete: mockDelete } as never)

      await expect(deletePerson('person-1')).rejects.toThrow('删除人物失败')
    })
  })

  describe('getPersonPhotoCount', () => {
    it('应该返回照片数量', async () => {
      const mockEq = vi.fn().mockResolvedValue({ count: 10, error: null })
      const mockSelect = vi.fn().mockReturnValue({ eq: mockEq })
      mockedSupabase.from.mockReturnValue({ select: mockSelect } as never)

      const count = await getPersonPhotoCount('person-1')
      expect(count).toBe(10)
    })

    it('应该返回 0 当无照片', async () => {
      const mockEq = vi.fn().mockResolvedValue({ count: null, error: null })
      const mockSelect = vi.fn().mockReturnValue({ eq: mockEq })
      mockedSupabase.from.mockReturnValue({ select: mockSelect } as never)

      const count = await getPersonPhotoCount('person-1')
      expect(count).toBe(0)
    })

    it('应该在错误时返回 0', async () => {
      const mockEq = vi.fn().mockResolvedValue({ count: null, error: { message: 'Error' } })
      const mockSelect = vi.fn().mockReturnValue({ eq: mockEq })
      mockedSupabase.from.mockReturnValue({ select: mockSelect } as never)

      const count = await getPersonPhotoCount('person-1')
      expect(count).toBe(0)
    })
  })
})
