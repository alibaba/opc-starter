/**
 * apiService (index.ts) 单元测试
 * 测试统一 API 服务层
 *
 * 注意：测试环境 VITE_ENABLE_MSW=true，所以代码走 MSW (fetch) 路径
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock supabase (used by non-MSW path, still needed for import)
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

vi.mock('@/services/cache/memoryCache', () => ({
  memoryCache: {
    getOrFetch: vi.fn((_key: string, fetcher: () => Promise<unknown>) => fetcher()),
    PROFILE_TTL: 300000,
  },
}))

vi.mock('@/services/db/personDB', () => ({
  personDB: {
    getAll: vi.fn().mockResolvedValue([]),
    addPersons: vi.fn().mockResolvedValue(undefined),
  },
}))

// Mock global fetch for MSW mode
const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

import { apiService } from '../index'

describe('apiService (MSW mode)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getAlbums', () => {
    it('should fetch albums via MSW', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({
          data: [{ id: 'a1', title: 'Album 1' }],
        }),
      })

      const result = await apiService.getAlbums()

      expect(mockFetch).toHaveBeenCalledWith('/api/albums')
      expect(result).toEqual([{ id: 'a1', title: 'Album 1' }])
    })

    it('should handle albums response with "albums" key', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({
          albums: [{ id: 'a1', title: 'Album 1' }],
        }),
      })

      const result = await apiService.getAlbums()

      expect(result).toEqual([{ id: 'a1', title: 'Album 1' }])
    })

    it('should return empty array when no data', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({}),
      })

      const result = await apiService.getAlbums()

      expect(result).toEqual([])
    })

    it('should throw on fetch error', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
      })

      await expect(apiService.getAlbums()).rejects.toThrow('获取相册失败')
    })
  })

  describe('getAlbumById', () => {
    it('should fetch album by id', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({
          data: { id: 'a1', title: 'Album 1' },
        }),
      })

      const result = await apiService.getAlbumById('a1')

      expect(mockFetch).toHaveBeenCalledWith('/api/albums/a1')
      expect(result).toEqual({ id: 'a1', title: 'Album 1' })
    })

    it('should handle "album" key in response', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({
          album: { id: 'a1', title: 'Album 1' },
        }),
      })

      const result = await apiService.getAlbumById('a1')

      expect(result).toEqual({ id: 'a1', title: 'Album 1' })
    })

    it('should return null when not found', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 404,
      })

      const result = await apiService.getAlbumById('nonexistent')

      expect(result).toBeNull()
    })
  })

  describe('createAlbum', () => {
    it('should create album via POST', async () => {
      const mockAlbum = { id: 'new-1', title: 'New Album' }
      mockFetch.mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({ success: true, data: mockAlbum }),
      })

      const result = await apiService.createAlbum({
        title: 'New Album',
        type: 'regular',
        photoIds: [],
      })

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/albums',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        })
      )
      expect(result.success).toBe(true)
      expect(result.data).toEqual(mockAlbum)
    })
  })

  describe('updateAlbum', () => {
    it('should update album via PUT', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({ success: true }),
      })

      const result = await apiService.updateAlbum('a1', { title: 'Updated' })

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/albums/a1',
        expect.objectContaining({
          method: 'PUT',
        })
      )
      expect(result.success).toBe(true)
    })
  })

  describe('deleteAlbum', () => {
    it('should delete album via DELETE', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({ success: true }),
      })

      const result = await apiService.deleteAlbum('a1')

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/albums/a1',
        expect.objectContaining({
          method: 'DELETE',
        })
      )
      expect(result.success).toBe(true)
    })
  })

  describe('getPersons', () => {
    it('should fetch persons via MSW', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({
          data: [{ id: 'p1', name: 'Person 1' }],
        }),
      })

      const result = await apiService.getPersons()

      expect(mockFetch).toHaveBeenCalledWith('/api/persons')
      expect(result).toEqual([{ id: 'p1', name: 'Person 1' }])
    })

    it('should handle "persons" key in response', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({
          persons: [{ id: 'p1', name: 'Person 1' }],
        }),
      })

      const result = await apiService.getPersons()

      expect(result).toEqual([{ id: 'p1', name: 'Person 1' }])
    })

    it('should throw on fetch error', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
      })

      await expect(apiService.getPersons()).rejects.toThrow('获取人员失败')
    })
  })

  describe('getPersonById', () => {
    it('should fetch person by id', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({
          data: { id: 'p1', name: 'Person 1' },
        }),
      })

      const result = await apiService.getPersonById('p1')

      expect(mockFetch).toHaveBeenCalledWith('/api/persons/p1')
      expect(result).toEqual({ id: 'p1', name: 'Person 1' })
    })

    it('should return null when not found', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 404,
      })

      const result = await apiService.getPersonById('nonexistent')

      expect(result).toBeNull()
    })
  })
})
