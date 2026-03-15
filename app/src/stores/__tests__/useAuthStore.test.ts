/**
 * useAuthStore 单元测试
 * 测试认证状态管理，mock authService
 */

import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { AuthError, User } from '@supabase/supabase-js'
import { useAuthStore } from '../useAuthStore'

vi.mock('@/lib/supabase/auth', () => ({
  authService: {
    getCurrentUser: vi.fn(),
    signUp: vi.fn(),
    signIn: vi.fn(),
    signOut: vi.fn(),
    onAuthStateChange: vi.fn(),
  },
}))

const mockUser: User = {
  id: 'user-1',
  email: 'test@example.com',
  app_metadata: {},
  user_metadata: {},
  aud: 'authenticated',
  created_at: '2024-01-01T00:00:00Z',
} as User

describe('useAuthStore', () => {
  beforeEach(async () => {
    useAuthStore.setState({
      user: null,
      isLoading: false,
      isAuthenticated: false,
      error: null,
    })
    vi.clearAllMocks()
  })

  describe('initialize', () => {
    it('initialize 成功时设置 user 和 isAuthenticated', async () => {
      const { authService } = await import('@/lib/supabase/auth')
      vi.mocked(authService.getCurrentUser).mockResolvedValue(mockUser)
      vi.mocked(authService.onAuthStateChange).mockImplementation(() => ({
        data: {
          subscription: {
            id: 'test-sub',
            callback: vi.fn(),
            unsubscribe: vi.fn(),
          },
        },
      }))

      const { initialize } = useAuthStore.getState()
      await initialize()

      expect(useAuthStore.getState().user).toEqual(mockUser)
      expect(useAuthStore.getState().isAuthenticated).toBe(true)
      expect(useAuthStore.getState().isLoading).toBe(false)
    })

    it('initialize 失败时设置 error', async () => {
      const { authService } = await import('@/lib/supabase/auth')
      vi.mocked(authService.getCurrentUser).mockRejectedValue(new Error('网络错误'))

      const { initialize } = useAuthStore.getState()
      await initialize()

      expect(useAuthStore.getState().error).toEqual({ message: '初始化认证失败' })
      expect(useAuthStore.getState().isLoading).toBe(false)
    })
  })

  describe('signIn', () => {
    it('signIn 成功时设置 user 和 isAuthenticated', async () => {
      const { authService } = await import('@/lib/supabase/auth')
      vi.mocked(authService.signIn).mockResolvedValue({ user: mockUser, error: null })

      const { signIn } = useAuthStore.getState()
      await signIn('test@example.com', 'password')

      expect(useAuthStore.getState().user).toEqual(mockUser)
      expect(useAuthStore.getState().isAuthenticated).toBe(true)
      expect(useAuthStore.getState().isLoading).toBe(false)
    })

    it('signIn 失败时设置 error', async () => {
      const { authService } = await import('@/lib/supabase/auth')
      vi.mocked(authService.signIn).mockResolvedValue({
        user: null,
        error: {
          message: 'Invalid credentials',
          code: 'invalid_credentials',
        } as unknown as AuthError,
      })

      const { signIn } = useAuthStore.getState()
      await signIn('test@example.com', 'wrong')

      expect(useAuthStore.getState().error).toEqual({
        message: 'Invalid credentials',
        code: 'invalid_credentials',
      })
      expect(useAuthStore.getState().isLoading).toBe(false)
    })
  })

  describe('signUp', () => {
    it('signUp 成功时设置 user 和 isAuthenticated', async () => {
      const { authService } = await import('@/lib/supabase/auth')
      vi.mocked(authService.signUp).mockResolvedValue({ user: mockUser, error: null })

      const { signUp } = useAuthStore.getState()
      await signUp('new@example.com', 'password', 'Display Name')

      expect(useAuthStore.getState().user).toEqual(mockUser)
      expect(useAuthStore.getState().isAuthenticated).toBe(true)
      expect(useAuthStore.getState().isLoading).toBe(false)
    })

    it('signUp 失败时设置 error', async () => {
      const { authService } = await import('@/lib/supabase/auth')
      vi.mocked(authService.signUp).mockResolvedValue({
        user: null,
        error: {
          message: 'Email already registered',
          code: 'user_exists',
        } as unknown as AuthError,
      })

      const { signUp } = useAuthStore.getState()
      await signUp('existing@example.com', 'password')

      expect(useAuthStore.getState().error).toEqual({
        message: 'Email already registered',
        code: 'user_exists',
      })
      expect(useAuthStore.getState().isLoading).toBe(false)
    })
  })

  describe('signOut', () => {
    it('signOut 成功时清空 user', async () => {
      useAuthStore.setState({ user: mockUser, isAuthenticated: true })
      const { authService } = await import('@/lib/supabase/auth')
      vi.mocked(authService.signOut).mockResolvedValue({ error: null })

      const { signOut } = useAuthStore.getState()
      await signOut()

      expect(useAuthStore.getState().user).toBeNull()
      expect(useAuthStore.getState().isAuthenticated).toBe(false)
      expect(useAuthStore.getState().isLoading).toBe(false)
    })

    it('signOut 失败时设置 error', async () => {
      const { authService } = await import('@/lib/supabase/auth')
      vi.mocked(authService.signOut).mockResolvedValue({
        error: {
          message: 'Network error',
          code: 'network_error',
        } as unknown as AuthError,
      })

      const { signOut } = useAuthStore.getState()
      await signOut()

      expect(useAuthStore.getState().error).toEqual({ message: 'Network error' })
      expect(useAuthStore.getState().isLoading).toBe(false)
    })
  })

  describe('clearError', () => {
    it('clearError 清除 error', () => {
      useAuthStore.setState({ error: { message: '某错误' } })
      const { clearError } = useAuthStore.getState()
      clearError()
      expect(useAuthStore.getState().error).toBeNull()
    })
  })
})
