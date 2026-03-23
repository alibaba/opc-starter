/**
 * permissions 权限工具函数测试
 */
import { describe, it, expect } from 'vitest'
import {
  hasPermission,
  checkPermission,
  getRoleLabel,
  canManageOrganization,
  canManageMembers,
  canEditPhoto,
  canDeletePhoto,
  permissions,
} from '../permissions'

describe('permissions', () => {
  describe('hasPermission', () => {
    it('admin 应该拥有所有权限', () => {
      expect(hasPermission('admin', 'admin')).toBe(true)
      expect(hasPermission('admin', 'manager')).toBe(true)
      expect(hasPermission('admin', 'member')).toBe(true)
    })

    it('manager 应该有 manager 和 member 权限', () => {
      expect(hasPermission('manager', 'admin')).toBe(false)
      expect(hasPermission('manager', 'manager')).toBe(true)
      expect(hasPermission('manager', 'member')).toBe(true)
    })

    it('member 只应该有 member 权限', () => {
      expect(hasPermission('member', 'admin')).toBe(false)
      expect(hasPermission('member', 'manager')).toBe(false)
      expect(hasPermission('member', 'member')).toBe(true)
    })
  })

  describe('checkPermission', () => {
    it('应该允许有权限的操作', () => {
      const result = checkPermission('admin', { minRole: 'admin' })
      expect(result.allowed).toBe(true)
      expect(result.message).toBeUndefined()
    })

    it('应该拒绝无权限的操作并返回提示', () => {
      const result = checkPermission('member', { minRole: 'admin' })
      expect(result.allowed).toBe(false)
      expect(result.message).toBe('需要 管理员 权限')
    })

    it('应该对 manager 权限检查正确', () => {
      const result = checkPermission('member', { minRole: 'manager' })
      expect(result.allowed).toBe(false)
      expect(result.message).toBe('需要 经理 权限')
    })

    it('应该允许 manager 执行 member 级别操作', () => {
      const result = checkPermission('manager', { minRole: 'member' })
      expect(result.allowed).toBe(true)
    })
  })

  describe('getRoleLabel', () => {
    it('应该返回正确的角色中文标签', () => {
      expect(getRoleLabel('admin')).toBe('管理员')
      expect(getRoleLabel('manager')).toBe('经理')
      expect(getRoleLabel('member')).toBe('成员')
    })
  })

  describe('canManageOrganization', () => {
    it('只有 admin 能管理组织', () => {
      expect(canManageOrganization('admin')).toBe(true)
      expect(canManageOrganization('manager')).toBe(false)
      expect(canManageOrganization('member')).toBe(false)
    })
  })

  describe('canManageMembers', () => {
    it('只有 admin 能管理成员', () => {
      expect(canManageMembers('admin')).toBe(true)
      expect(canManageMembers('manager')).toBe(false)
      expect(canManageMembers('member')).toBe(false)
    })
  })

  describe('canEditPhoto', () => {
    it('所有人都可以编辑自己的照片', () => {
      expect(canEditPhoto('member', true)).toBe(true)
      expect(canEditPhoto('manager', true)).toBe(true)
      expect(canEditPhoto('admin', true)).toBe(true)
    })

    it('只有 admin 能编辑他人的照片', () => {
      expect(canEditPhoto('admin', false)).toBe(true)
      expect(canEditPhoto('manager', false)).toBe(false)
      expect(canEditPhoto('member', false)).toBe(false)
    })
  })

  describe('canDeletePhoto', () => {
    it('所有人都可以删除自己的照片', () => {
      expect(canDeletePhoto('member', true)).toBe(true)
      expect(canDeletePhoto('manager', true)).toBe(true)
      expect(canDeletePhoto('admin', true)).toBe(true)
    })

    it('只有 admin 能删除他人的照片', () => {
      expect(canDeletePhoto('admin', false)).toBe(true)
      expect(canDeletePhoto('manager', false)).toBe(false)
      expect(canDeletePhoto('member', false)).toBe(false)
    })
  })

  describe('permissions 配置对象', () => {
    it('组织权限配置应该正确', () => {
      expect(permissions.organization.create.minRole).toBe('admin')
      expect(permissions.organization.update.minRole).toBe('admin')
      expect(permissions.organization.delete.minRole).toBe('admin')
      expect(permissions.organization.viewAll.minRole).toBe('member')
    })

    it('成员权限配置应该正确', () => {
      expect(permissions.member.add.minRole).toBe('admin')
      expect(permissions.member.remove.minRole).toBe('admin')
      expect(permissions.member.changeRole.minRole).toBe('admin')
      expect(permissions.member.assignTeam.minRole).toBe('admin')
    })

    it('照片权限配置应该正确', () => {
      expect(permissions.photo.upload.minRole).toBe('member')
      expect(permissions.photo.editOwn.minRole).toBe('member')
      expect(permissions.photo.editAny.minRole).toBe('admin')
      expect(permissions.photo.deleteOwn.minRole).toBe('member')
      expect(permissions.photo.deleteAny.minRole).toBe('admin')
    })

    it('每个权限配置应该包含 description', () => {
      const allPermissions = [
        ...Object.values(permissions.organization),
        ...Object.values(permissions.member),
        ...Object.values(permissions.photo),
      ]

      for (const perm of allPermissions) {
        expect(perm.description).toBeTruthy()
      }
    })
  })
})
