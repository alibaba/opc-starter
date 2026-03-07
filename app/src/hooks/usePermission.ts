/**
 * usePermission Hook - 权限检查
 * @description 根据当前用户角色和选中的组织上下文，计算操作权限（增删改成员、管理团队等）
 */
import { useMemo } from 'react'
import { useOrganization } from './useOrganization'
import { useAuthStore } from '@/stores/useAuthStore'
import {
  hasPermission,
  checkPermission,
  canManageOrganization,
  canManageMembers,
  canEditPhoto,
  canDeletePhoto,
  type UserRole,
  type PermissionConfig,
} from '@/lib/permissions'

export interface UsePermissionResult {
  userRole: UserRole
  isAdmin: boolean
  isManager: boolean
  isMember: boolean
  hasPermission: (requiredRole: UserRole) => boolean
  checkPermission: (permission: PermissionConfig) => { allowed: boolean; message?: string }
  canManageOrganization: boolean
  canManageMembers: boolean
  canEditPhoto: (isOwner: boolean) => boolean
  canDeletePhoto: (isOwner: boolean) => boolean
  isLoading: boolean
}

export function usePermission(): UsePermissionResult {
  const { user } = useAuthStore()
  const { userOrgInfo, isLoading } = useOrganization(user?.id || '')

  const userRole = userOrgInfo?.role || 'member'

  const result = useMemo(
    () => ({
      userRole,
      isAdmin: userRole === 'admin',
      isManager: userRole === 'manager' || userRole === 'admin',
      isMember: true,
      hasPermission: (requiredRole: UserRole) => hasPermission(userRole, requiredRole),
      checkPermission: (permission: PermissionConfig) => checkPermission(userRole, permission),
      canManageOrganization: canManageOrganization(userRole),
      canManageMembers: canManageMembers(userRole),
      canEditPhoto: (isOwner: boolean) => canEditPhoto(userRole, isOwner),
      canDeletePhoto: (isOwner: boolean) => canDeletePhoto(userRole, isOwner),
      isLoading,
    }),
    [userRole, isLoading]
  )

  return result
}
