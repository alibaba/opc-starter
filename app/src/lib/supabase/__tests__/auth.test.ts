/**
 * authService 认证服务测试
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

// vi.mock 工厂函数不能引用外部变量
vi.mock('@/lib/supabase/client', () => ({
  supabase: {
    auth: {
      signUp: vi.fn(),
      signInWithPassword: vi.fn(),
      signOut: vi.fn(),
      getUser: vi.fn(),
      getSession: vi.fn(),
      onAuthStateChange: vi
        .fn()
        .mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } }),
    },
  },
}))

import { supabase } from '@/lib/supabase/client'
import { authService } from '../auth'

describe('authService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('signUp', () => {
    it('应该成功注册用户', async () => {
      const mockUser = { id: 'user-1', email: 'test@example.com' }
      vi.mocked(supabase.auth.signUp).mockResolvedValue({
        data: { user: mockUser },
        error: null,
      } as never)

      const result = await authService.signUp({
        email: 'test@example.com',
        password: 'password123',
        displayName: 'Test User',
      })

      expect(result.user).toEqual(mockUser)
      expect(result.error).toBeNull()
      expect(supabase.auth.signUp).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123',
        options: { data: { display_name: 'Test User' } },
      })
    })

    it('应该处理注册错误', async () => {
      const mockError = { message: 'Email already exists' }
      vi.mocked(supabase.auth.signUp).mockResolvedValue({
        data: { user: null },
        error: mockError,
      } as never)

      const result = await authService.signUp({
        email: 'existing@example.com',
        password: 'password123',
      })

      expect(result.user).toBeNull()
      expect(result.error).toEqual(mockError)
    })
  })

  describe('signIn', () => {
    it('应该成功登录', async () => {
      const mockUser = { id: 'user-1', email: 'test@example.com' }
      vi.mocked(supabase.auth.signInWithPassword).mockResolvedValue({
        data: { user: mockUser },
        error: null,
      } as never)

      const result = await authService.signIn({
        email: 'test@example.com',
        password: 'password123',
      })

      expect(result.user).toEqual(mockUser)
      expect(supabase.auth.signInWithPassword).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123',
      })
    })

    it('应该处理登录错误', async () => {
      const mockError = { message: 'Invalid credentials' }
      vi.mocked(supabase.auth.signInWithPassword).mockResolvedValue({
        data: { user: null },
        error: mockError,
      } as never)

      const result = await authService.signIn({
        email: 'test@example.com',
        password: 'wrong',
      })

      expect(result.error).toEqual(mockError)
    })
  })

  describe('signOut', () => {
    it('应该成功登出', async () => {
      vi.mocked(supabase.auth.signOut).mockResolvedValue({ error: null } as never)

      const result = await authService.signOut()

      expect(result.error).toBeNull()
      expect(supabase.auth.signOut).toHaveBeenCalled()
    })

    it('应该处理登出错误', async () => {
      const mockError = { message: 'Sign out failed' }
      vi.mocked(supabase.auth.signOut).mockResolvedValue({ error: mockError } as never)

      const result = await authService.signOut()

      expect(result.error).toEqual(mockError)
    })
  })

  describe('getCurrentUser', () => {
    it('应该获取当前用户', async () => {
      const mockUser = { id: 'user-1', email: 'test@example.com' }
      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: { user: mockUser },
        error: null,
      } as never)

      const result = await authService.getCurrentUser(true)

      expect(result).toEqual(mockUser)
      expect(supabase.auth.getUser).toHaveBeenCalled()
    })

    it('应该返回 null 当用户未登录', async () => {
      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: { user: null },
        error: null,
      } as never)

      const result = await authService.getCurrentUser(true)

      expect(result).toBeNull()
    })

    it('forceRefresh 应该触发新请求', async () => {
      const mockUser = { id: 'user-1', email: 'test@example.com' }
      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: { user: mockUser },
        error: null,
      } as never)

      await authService.getCurrentUser(true)

      expect(supabase.auth.getUser).toHaveBeenCalledTimes(1)
    })

    it('应该使用缓存避免重复请求', async () => {
      const mockUser = { id: 'user-1', email: 'test@example.com' }
      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: { user: mockUser },
        error: null,
      } as never)

      // 第一次请求 - 强制刷新填充缓存
      await authService.getCurrentUser(true)
      expect(supabase.auth.getUser).toHaveBeenCalledTimes(1)

      // 第二次请求 - 不强制刷新，使用缓存
      const result = await authService.getCurrentUser(false)
      expect(result).toEqual(mockUser)
      // 不应该发起新的请求
      expect(supabase.auth.getUser).toHaveBeenCalledTimes(1)
    })

    it('应该处理 getUser 抛出异常', async () => {
      vi.mocked(supabase.auth.getUser).mockRejectedValue(new Error('Network error'))

      await expect(authService.getCurrentUser(true)).rejects.toThrow('Network error')
    })
  })

  describe('getSession', () => {
    it('应该获取当前会话', async () => {
      const mockSession = { access_token: 'token-123', user: { id: 'user-1' } }
      vi.mocked(supabase.auth.getSession).mockResolvedValue({
        data: { session: mockSession },
        error: null,
      } as never)

      const result = await authService.getSession()

      expect(result).toEqual(mockSession)
    })

    it('应该返回 null 当无会话', async () => {
      vi.mocked(supabase.auth.getSession).mockResolvedValue({
        data: { session: null },
        error: null,
      } as never)

      const result = await authService.getSession()

      expect(result).toBeNull()
    })
  })

  describe('onAuthStateChange', () => {
    it('应该注册认证状态监听', () => {
      const callback = vi.fn()
      const result = authService.onAuthStateChange(callback)

      expect(supabase.auth.onAuthStateChange).toHaveBeenCalled()
      expect(result).toBeDefined()
    })
  })
})
