/**
 * Profile Service 单元测试
 *
 * 测试覆盖：
 * - 获取用户资料
 * - 更新用户资料
 * - 同步到 persons 表
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { User } from '@supabase/supabase-js'

// Mock 依赖
vi.mock('@/lib/supabase/client', () => ({
  supabase: {
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn(),
      single: vi.fn(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
    }),
  },
}))

vi.mock('@/lib/supabase/auth', () => ({
  authService: {
    getCurrentUser: vi.fn(),
  },
}))

vi.mock('@/utils/imageCompressor', () => ({
  compressImageToWebP: vi.fn().mockResolvedValue(new Blob(['compressed'])),
}))

vi.mock('@/services/storage/supabaseStorage', () => ({
  storageService: {
    upload: vi
      .fn()
      .mockResolvedValue({
        success: true,
        publicUrl: 'https://example.com/avatar.webp',
        path: 'user-1/avatar-123.webp',
      }),
    delete: vi.fn().mockResolvedValue({ success: true }),
  },
}))

import { supabase } from '@/lib/supabase/client'
import { authService } from '@/lib/supabase/auth'
import { getProfile, updateProfile, syncToPersons } from '../profileService'

// ============================================
// 测试数据
// ============================================

const mockUser: User = {
  id: 'user-1',
  email: 'test@example.com',
  user_metadata: { full_name: 'Test User' },
  created_at: '2024-01-01T00:00:00Z',
  app_metadata: {},
  aud: 'authenticated',
} as User

const mockProfileData = {
  id: 'user-1',
  email: 'test@example.com',
  full_name: 'Test User',
  nickname: 'Tester',
  gender: 'male',
  team: 'Engineering',
  avatar_url: 'https://example.com/avatar.jpg',
  bio: 'A test user',
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
}

// ============================================
// 测试套件
// ============================================

describe('profileService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // ============================================================
  // getProfile
  // ============================================================
  describe('getProfile', () => {
    it('应该返回 null 当用户未登录', async () => {
      vi.mocked(authService.getCurrentUser).mockResolvedValue(null)

      const result = await getProfile()

      expect(result).toBeNull()
    })

    it('应该获取现有 profile', async () => {
      vi.mocked(authService.getCurrentUser).mockResolvedValue(mockUser)
      const mockMaybeSingle = vi.fn().mockResolvedValue({ data: mockProfileData, error: null })
      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: mockMaybeSingle,
      } as never)

      const result = await getProfile()

      expect(result).not.toBeNull()
      expect(result?.id).toBe('user-1')
      expect(result?.fullName).toBe('Test User')
    })

    it('应该处理数据库错误', async () => {
      vi.mocked(authService.getCurrentUser).mockResolvedValue(mockUser)
      const mockMaybeSingle = vi
        .fn()
        .mockResolvedValue({ data: null, error: { message: 'DB error' } })
      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: mockMaybeSingle,
      } as never)

      const result = await getProfile()

      expect(result).toBeNull()
    })

    it('应该创建默认 profile 当不存在时', async () => {
      vi.mocked(authService.getCurrentUser).mockResolvedValue(mockUser)

      // 第一次查询返回 null（不存在）
      const mockSingle = vi.fn().mockResolvedValue({ data: mockProfileData, error: null })
      const mockInsert = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnThis(),
        single: mockSingle,
      })

      vi.mocked(supabase.from)
        .mockReturnValueOnce({
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
        } as never)
        .mockReturnValueOnce({
          insert: mockInsert,
        } as never)

      const result = await getProfile()

      expect(mockInsert).toHaveBeenCalled()
      expect(result).not.toBeNull()
    })

    it('应该处理 profile 插入主键冲突（23505）', async () => {
      vi.mocked(authService.getCurrentUser).mockResolvedValue(mockUser)

      // 第一次查询返回 null
      // 插入失败（主键冲突）
      // 重新查询成功
      const mockInsert = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: null,
          error: { code: '23505', message: 'duplicate key' },
        }),
      })

      vi.mocked(supabase.from)
        .mockReturnValueOnce({
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
        } as never)
        .mockReturnValueOnce({
          insert: mockInsert,
        } as never)
        .mockReturnValueOnce({
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({ data: mockProfileData, error: null }),
        } as never)

      const result = await getProfile()

      expect(result).not.toBeNull()
      expect(result?.fullName).toBe('Test User')
    })

    it('应该处理 profile 插入主键冲突后重查失败', async () => {
      vi.mocked(authService.getCurrentUser).mockResolvedValue(mockUser)

      const mockInsert = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: null,
          error: { code: '23505', message: 'duplicate key' },
        }),
      })

      vi.mocked(supabase.from)
        .mockReturnValueOnce({
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
        } as never)
        .mockReturnValueOnce({
          insert: mockInsert,
        } as never)
        .mockReturnValueOnce({
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          maybeSingle: vi
            .fn()
            .mockResolvedValue({ data: null, error: { message: 'Refetch failed' } }),
        } as never)

      const result = await getProfile()

      expect(result).toBeNull()
    })

    it('应该处理非主键冲突的插入错误', async () => {
      vi.mocked(authService.getCurrentUser).mockResolvedValue(mockUser)

      const mockInsert = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: null,
          error: { code: '42000', message: 'Some other error' },
        }),
      })

      vi.mocked(supabase.from)
        .mockReturnValueOnce({
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
        } as never)
        .mockReturnValueOnce({
          insert: mockInsert,
        } as never)

      const result = await getProfile()

      expect(result).toBeNull()
    })

    it('应该处理异常', async () => {
      vi.mocked(authService.getCurrentUser).mockRejectedValue(new Error('Auth service down'))

      const result = await getProfile()
      expect(result).toBeNull()
    })
  })

  // ============================================================
  // updateProfile
  // ============================================================
  describe('updateProfile', () => {
    it('应该抛出错误当用户未登录', async () => {
      vi.mocked(authService.getCurrentUser).mockResolvedValue(null)

      await expect(updateProfile({ fullName: 'New Name' })).rejects.toThrow('未登录或用户不存在')
    })

    it('应该成功更新 profile', async () => {
      vi.mocked(authService.getCurrentUser).mockResolvedValue(mockUser)
      const mockSingle = vi.fn().mockResolvedValue({ data: mockProfileData, error: null })
      vi.mocked(supabase.from).mockReturnValue({
        from: vi.fn().mockReturnThis(),
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: mockSingle,
      } as never)

      // 需要重新 mock 链式调用
      const updateMock = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: mockSingle,
      })

      vi.mocked(supabase.from).mockReturnValue({
        update: updateMock,
      } as never)

      const result = await updateProfile({ fullName: 'New Name' })

      expect(result.fullName).toBe('Test User')
    })

    it('应该处理更新失败', async () => {
      vi.mocked(authService.getCurrentUser).mockResolvedValue(mockUser)

      const updateMock = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: null,
          error: { message: 'Update failed' },
        }),
      })

      vi.mocked(supabase.from).mockReturnValue({
        update: updateMock,
      } as never)

      await expect(updateProfile({ fullName: 'New Name' })).rejects.toThrow('更新个人信息失败')
    })
  })

  // ============================================================
  // syncToPersons
  // ============================================================
  describe('syncToPersons', () => {
    it('应该更新现有 person 记录', async () => {
      const mockMaybeSingle = vi.fn().mockResolvedValue({
        data: { id: 'person-1', user_id: 'user-1' },
        error: null,
      })
      const mockUpdateEq = vi.fn().mockResolvedValue({ error: null })
      const mockUpdate = vi.fn().mockReturnValue({ eq: mockUpdateEq })

      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: mockMaybeSingle,
        update: mockUpdate,
      } as never)

      const profile = {
        id: 'user-1',
        email: 'test@example.com',
        fullName: 'Test User',
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      await syncToPersons(profile)

      expect(mockUpdate).toHaveBeenCalled()
    })

    it('应该创建新 person 记录当不存在时', async () => {
      const mockMaybeSingle = vi.fn().mockResolvedValue({ data: null, error: null })
      const mockInsert = vi.fn().mockResolvedValue({ error: null })

      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: mockMaybeSingle,
        insert: mockInsert,
      } as never)

      const profile = {
        id: 'user-1',
        email: 'test@example.com',
        fullName: 'Test User',
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      await syncToPersons(profile)

      expect(mockInsert).toHaveBeenCalled()
    })

    it('应该处理查询错误', async () => {
      const mockMaybeSingle = vi
        .fn()
        .mockResolvedValue({ data: null, error: { message: 'Query failed' } })

      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: mockMaybeSingle,
      } as never)

      const profile = {
        id: 'user-1',
        email: 'test@example.com',
        fullName: 'Test User',
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      await expect(syncToPersons(profile)).rejects.toThrow('Query failed')
    })

    it('应该处理更新 person 时错误', async () => {
      const mockMaybeSingle = vi.fn().mockResolvedValue({
        data: { id: 'person-1', user_id: 'user-1' },
        error: null,
      })
      const mockUpdateEq = vi.fn().mockResolvedValue({ error: { message: 'Update person failed' } })
      const mockUpdate = vi.fn().mockReturnValue({ eq: mockUpdateEq })

      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: mockMaybeSingle,
        update: mockUpdate,
      } as never)

      const profile = {
        id: 'user-1',
        email: 'test@example.com',
        fullName: 'Test User',
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      await expect(syncToPersons(profile)).rejects.toThrow('Update person failed')
    })

    it('应该处理插入 person 时错误', async () => {
      const mockMaybeSingle = vi.fn().mockResolvedValue({ data: null, error: null })
      const mockInsert = vi.fn().mockResolvedValue({ error: { message: 'Insert person failed' } })

      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: mockMaybeSingle,
        insert: mockInsert,
      } as never)

      const profile = {
        id: 'user-1',
        email: 'test@example.com',
        fullName: 'Test User',
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      await expect(syncToPersons(profile)).rejects.toThrow('Insert person failed')
    })
  })
})
