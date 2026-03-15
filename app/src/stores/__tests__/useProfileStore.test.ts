/**
 * useProfileStore 单元测试
 * 测试 Profile 状态管理，mock profileService
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { UserProfile } from '@/types/user'
import { useProfileStore } from '../useProfileStore'

vi.mock('@/services/api/profileService', () => ({
  profileService: {
    getProfile: vi.fn(),
    updateProfile: vi.fn(),
    uploadAvatar: vi.fn(),
    deleteAvatar: vi.fn(),
  },
}))

const mockProfile: UserProfile = {
  id: 'user-1',
  email: 'test@example.com',
  fullName: '测试用户',
  nickname: '昵称',
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
}

describe('useProfileStore', () => {
  beforeEach(() => {
    useProfileStore.setState({
      profile: null,
      isLoading: false,
      isEditing: false,
      error: null,
      uploadProgress: 0,
    })
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('loadProfile', () => {
    it('loadProfile 成功时设置 profile', async () => {
      const { profileService } = await import('@/services/api/profileService')
      vi.mocked(profileService.getProfile).mockResolvedValue(mockProfile)

      const { loadProfile } = useProfileStore.getState()
      await loadProfile()

      expect(useProfileStore.getState().profile).toEqual(mockProfile)
      expect(useProfileStore.getState().isLoading).toBe(false)
    })

    it('loadProfile 失败时设置 error', async () => {
      const { profileService } = await import('@/services/api/profileService')
      vi.mocked(profileService.getProfile).mockRejectedValue(new Error('网络错误'))

      const { loadProfile } = useProfileStore.getState()
      await loadProfile()

      expect(useProfileStore.getState().error).toBe('网络错误')
      expect(useProfileStore.getState().isLoading).toBe(false)
    })
  })

  describe('updateProfile', () => {
    it('updateProfile 成功时更新 profile', async () => {
      useProfileStore.setState({ profile: mockProfile })
      const updatedProfile: UserProfile = {
        ...mockProfile,
        fullName: '新名字',
        updatedAt: new Date(),
      }
      const { profileService } = await import('@/services/api/profileService')
      vi.mocked(profileService.updateProfile).mockResolvedValue(updatedProfile)

      const { updateProfile } = useProfileStore.getState()
      await updateProfile({ fullName: '新名字' })

      expect(useProfileStore.getState().profile).toEqual(updatedProfile)
      expect(useProfileStore.getState().isLoading).toBe(false)
      expect(useProfileStore.getState().isEditing).toBe(false)
    })

    it('updateProfile 失败时回滚到原始 profile', async () => {
      useProfileStore.setState({ profile: mockProfile })
      const { profileService } = await import('@/services/api/profileService')
      vi.mocked(profileService.updateProfile).mockRejectedValue(new Error('更新失败'))

      const { updateProfile } = useProfileStore.getState()
      await expect(updateProfile({ fullName: '新名字' })).rejects.toThrow('更新失败')

      expect(useProfileStore.getState().profile).toEqual(mockProfile)
      expect(useProfileStore.getState().error).toBe('更新失败')
      expect(useProfileStore.getState().isLoading).toBe(false)
    })
  })

  describe('uploadAvatar', () => {
    it('uploadAvatar 成功时更新 profile.avatarUrl', async () => {
      vi.useFakeTimers()
      useProfileStore.setState({ profile: mockProfile })
      const file = new File(['avatar'], 'avatar.png', { type: 'image/png' })
      const { profileService } = await import('@/services/api/profileService')
      vi.mocked(profileService.uploadAvatar).mockResolvedValue({
        url: 'https://example.com/avatar.webp',
        path: 'user-1/avatar.webp',
      })

      const { uploadAvatar } = useProfileStore.getState()
      const promise = uploadAvatar(file)

      await vi.advanceTimersByTimeAsync(1000)
      await promise

      expect(useProfileStore.getState().profile?.avatarUrl).toBe('https://example.com/avatar.webp')
      expect(useProfileStore.getState().isLoading).toBe(false)
      expect(useProfileStore.getState().uploadProgress).toBe(0)
    })

    it('uploadAvatar 失败时设置 error', async () => {
      useProfileStore.setState({ profile: mockProfile })
      const file = new File(['avatar'], 'avatar.png', { type: 'image/png' })
      const { profileService } = await import('@/services/api/profileService')
      vi.mocked(profileService.uploadAvatar).mockRejectedValue(new Error('上传失败'))

      const { uploadAvatar } = useProfileStore.getState()
      await expect(uploadAvatar(file)).rejects.toThrow('上传失败')

      expect(useProfileStore.getState().error).toBe('上传失败')
      expect(useProfileStore.getState().isLoading).toBe(false)
      expect(useProfileStore.getState().uploadProgress).toBe(0)
    })
  })

  describe('deleteAvatar', () => {
    it('deleteAvatar 成功时清空 avatarUrl', async () => {
      useProfileStore.setState({
        profile: { ...mockProfile, avatarUrl: 'https://example.com/old.webp' },
      })
      const { profileService } = await import('@/services/api/profileService')
      vi.mocked(profileService.deleteAvatar).mockResolvedValue(undefined)

      const { deleteAvatar } = useProfileStore.getState()
      await deleteAvatar()

      expect(useProfileStore.getState().profile?.avatarUrl).toBeUndefined()
      expect(useProfileStore.getState().isLoading).toBe(false)
    })

    it('deleteAvatar 失败时设置 error', async () => {
      useProfileStore.setState({ profile: mockProfile })
      const { profileService } = await import('@/services/api/profileService')
      vi.mocked(profileService.deleteAvatar).mockRejectedValue(new Error('删除失败'))

      const { deleteAvatar } = useProfileStore.getState()
      await expect(deleteAvatar()).rejects.toThrow('删除失败')

      expect(useProfileStore.getState().error).toBe('删除失败')
      expect(useProfileStore.getState().isLoading).toBe(false)
    })
  })

  describe('setEditing', () => {
    it('setEditing 设置 isEditing 并清除 error', () => {
      useProfileStore.setState({ error: '某错误' })
      const { setEditing } = useProfileStore.getState()
      setEditing(true)
      expect(useProfileStore.getState().isEditing).toBe(true)
      expect(useProfileStore.getState().error).toBeNull()
    })
  })

  describe('clearError', () => {
    it('clearError 清除 error', () => {
      useProfileStore.setState({ error: '某错误' })
      const { clearError } = useProfileStore.getState()
      clearError()
      expect(useProfileStore.getState().error).toBeNull()
    })
  })

  describe('reset', () => {
    it('reset 重置为初始状态', () => {
      useProfileStore.setState({
        profile: mockProfile,
        isLoading: true,
        isEditing: true,
        error: '错误',
        uploadProgress: 50,
      })
      const { reset } = useProfileStore.getState()
      reset()
      expect(useProfileStore.getState().profile).toBeNull()
      expect(useProfileStore.getState().isLoading).toBe(false)
      expect(useProfileStore.getState().isEditing).toBe(false)
      expect(useProfileStore.getState().error).toBeNull()
      expect(useProfileStore.getState().uploadProgress).toBe(0)
    })
  })
})
