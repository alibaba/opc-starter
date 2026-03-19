/**
 * useAuth - 认证 Hook
 * 封装认证状态获取
 */
import { useAuthStore } from '@/stores/useAuthStore'

export function useAuth() {
  const { user, isAuthenticated, isLoading } = useAuthStore()

  return {
    user,
    isAuthenticated,
    isLoading,
  }
}
