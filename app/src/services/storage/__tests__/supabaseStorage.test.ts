/**
 * supabaseStorage 单元测试
 * 测试文件存储服务
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockUpload = vi.fn()
const mockRemove = vi.fn()
const mockGetPublicUrl = vi.fn()
const mockCreateSignedUrl = vi.fn()
const mockList = vi.fn()
const mockDownload = vi.fn()

vi.mock('@/lib/supabase/client', () => ({
  supabase: {
    storage: {
      from: vi.fn(() => ({
        upload: mockUpload,
        remove: mockRemove,
        getPublicUrl: mockGetPublicUrl,
        createSignedUrl: mockCreateSignedUrl,
        list: mockList,
        download: mockDownload,
      })),
    },
  },
}))

import { storageService } from '../supabaseStorage'
import { supabase } from '@/lib/supabase/client'

describe('SupabaseStorageService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetPublicUrl.mockReturnValue({
      data: { publicUrl: 'https://example.com/file.jpg' },
    })
  })

  describe('upload', () => {
    it('should upload file successfully', async () => {
      mockUpload.mockResolvedValue({
        data: { path: 'user1/avatar.jpg' },
        error: null,
      })

      const file = new File(['content'], 'avatar.jpg', { type: 'image/jpeg' })
      const result = await storageService.upload(file, 'user1/avatar.jpg')

      expect(result.success).toBe(true)
      expect(result.path).toBe('user1/avatar.jpg')
      expect(result.publicUrl).toBe('https://example.com/file.jpg')
      expect(supabase.storage.from).toHaveBeenCalledWith('avatars')
    })

    it('should upload to custom bucket', async () => {
      mockUpload.mockResolvedValue({
        data: { path: 'photos/pic.jpg' },
        error: null,
      })

      const file = new File(['content'], 'pic.jpg', { type: 'image/jpeg' })
      await storageService.upload(file, 'photos/pic.jpg', 'photos')

      expect(supabase.storage.from).toHaveBeenCalledWith('photos')
    })

    it('should handle upload error', async () => {
      mockUpload.mockResolvedValue({
        data: null,
        error: { message: 'Bucket not found' },
      })

      const file = new File(['content'], 'avatar.jpg', { type: 'image/jpeg' })
      const result = await storageService.upload(file, 'user1/avatar.jpg')

      expect(result.success).toBe(false)
      expect(result.error).toBe('Bucket not found')
    })

    it('should handle upload exception', async () => {
      mockUpload.mockRejectedValue(new Error('Network error'))

      const file = new File(['content'], 'avatar.jpg', { type: 'image/jpeg' })
      const result = await storageService.upload(file, 'user1/avatar.jpg')

      expect(result.success).toBe(false)
      expect(result.error).toBe('Network error')
    })

    it('should handle non-Error exception', async () => {
      mockUpload.mockRejectedValue('string error')

      const file = new File(['content'], 'avatar.jpg', { type: 'image/jpeg' })
      const result = await storageService.upload(file, 'user1/avatar.jpg')

      expect(result.success).toBe(false)
      expect(result.error).toBe('Unknown error')
    })
  })

  describe('delete', () => {
    it('should delete files successfully', async () => {
      mockRemove.mockResolvedValue({ error: null })

      const result = await storageService.delete(['user1/avatar.jpg'])

      expect(result).toBe(true)
      expect(supabase.storage.from).toHaveBeenCalledWith('avatars')
    })

    it('should delete from custom bucket', async () => {
      mockRemove.mockResolvedValue({ error: null })

      await storageService.delete(['photos/pic.jpg'], 'photos')

      expect(supabase.storage.from).toHaveBeenCalledWith('photos')
    })

    it('should handle delete error', async () => {
      mockRemove.mockResolvedValue({ error: { message: 'Not found' } })

      const result = await storageService.delete(['user1/avatar.jpg'])

      expect(result).toBe(false)
    })

    it('should handle delete exception', async () => {
      mockRemove.mockRejectedValue(new Error('Network error'))

      const result = await storageService.delete(['user1/avatar.jpg'])

      expect(result).toBe(false)
    })
  })

  describe('getPublicUrl', () => {
    it('should return public URL', () => {
      const url = storageService.getPublicUrl('user1/avatar.jpg')

      expect(url).toBe('https://example.com/file.jpg')
    })

    it('should use custom bucket', () => {
      storageService.getPublicUrl('photos/pic.jpg', 'photos')

      expect(supabase.storage.from).toHaveBeenCalledWith('photos')
    })
  })

  describe('getSignedUrl', () => {
    it('should return signed URL', async () => {
      mockCreateSignedUrl.mockResolvedValue({
        data: { signedUrl: 'https://example.com/signed/file.jpg?token=abc' },
        error: null,
      })

      const url = await storageService.getSignedUrl('user1/avatar.jpg')

      expect(url).toBe('https://example.com/signed/file.jpg?token=abc')
    })

    it('should accept custom expiry', async () => {
      mockCreateSignedUrl.mockResolvedValue({
        data: { signedUrl: 'https://example.com/signed/file.jpg' },
        error: null,
      })

      await storageService.getSignedUrl('user1/avatar.jpg', 7200)

      expect(mockCreateSignedUrl).toHaveBeenCalledWith('user1/avatar.jpg', 7200)
    })

    it('should handle error', async () => {
      mockCreateSignedUrl.mockResolvedValue({
        data: null,
        error: { message: 'Not authorized' },
      })

      const url = await storageService.getSignedUrl('user1/avatar.jpg')

      expect(url).toBeNull()
    })

    it('should handle exception', async () => {
      mockCreateSignedUrl.mockRejectedValue(new Error('Network error'))

      const url = await storageService.getSignedUrl('user1/avatar.jpg')

      expect(url).toBeNull()
    })
  })

  describe('list', () => {
    it('should return file list', async () => {
      const mockFiles = [
        {
          name: 'avatar.jpg',
          id: '1',
          updated_at: '2024-01-01',
          created_at: '2024-01-01',
          last_accessed_at: '2024-01-01',
          metadata: {},
        },
      ]
      mockList.mockResolvedValue({ data: mockFiles, error: null })

      const files = await storageService.list('user1/')

      expect(files).toEqual(mockFiles)
    })

    it('should handle list error', async () => {
      mockList.mockResolvedValue({ data: null, error: { message: 'Bucket not found' } })

      const files = await storageService.list()

      expect(files).toEqual([])
    })

    it('should handle list exception', async () => {
      mockList.mockRejectedValue(new Error('Network error'))

      const files = await storageService.list()

      expect(files).toEqual([])
    })
  })

  describe('download', () => {
    it('should download file successfully', async () => {
      const mockBlob = new Blob(['file content'])
      mockDownload.mockResolvedValue({ data: mockBlob, error: null })

      const result = await storageService.download('user1/avatar.jpg')

      expect(result).toEqual(mockBlob)
    })

    it('should handle download error', async () => {
      mockDownload.mockResolvedValue({ data: null, error: { message: 'Not found' } })

      const result = await storageService.download('user1/avatar.jpg')

      expect(result).toBeNull()
    })

    it('should handle download exception', async () => {
      mockDownload.mockRejectedValue(new Error('Network error'))

      const result = await storageService.download('user1/avatar.jpg')

      expect(result).toBeNull()
    })
  })
})
