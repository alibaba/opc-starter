/**
 * 统一 API 服务层（DataService 适配层）
 *
 * OPC-Starter 简化版本：
 * - MSW 模式 (VITE_ENABLE_MSW=true): 使用 fetch → MSW handlers
 * - Supabase 模式 (VITE_ENABLE_MSW=false): 直接访问 Supabase
 */

import { supabase } from '@/lib/supabase/client'
import { authService } from '@/lib/supabase/auth'
import { memoryCache } from '@/services/cache/memoryCache'
import type { Album } from '@/types/album'
import type { Person } from '@/types/person'
import type { ApiResponse } from '@/types/api'

/**
 * 检查是否使用 MSW Mock 模式
 */
const useMSW = import.meta.env.VITE_ENABLE_MSW === 'true'

console.log('[API Service] 初始化', {
  mode: useMSW ? 'MSW Mock' : 'Supabase',
  VITE_ENABLE_MSW: import.meta.env.VITE_ENABLE_MSW,
})

/**
 * API 服务导出
 */
export const apiService = {
  /**
   * 获取相册列表
   */
  async getAlbums(): Promise<Album[]> {
    if (useMSW) {
      const response = await fetch('/api/albums')
      if (!response.ok) throw new Error('获取相册失败')
      const result = await response.json()
      return result.data || result.albums || []
    } else {
      const { data, error } = await supabase
        .from('albums')
        .select('*')
        .order('updated_at', { ascending: false })

      if (error) throw new Error(`Supabase 错误: ${error.message}`)

      return (data || []).map((item) => ({
        id: item.id,
        title: item.title,
        description: item.description || '',
        type: item.type,
        coverPhoto: item.cover_photo_id || '',
        photoIds: item.photo_ids || [],
        slideshowSettings: item.slideshow_settings || undefined,
        visibility: item.visibility || 'private',
        organizationId: item.organization_id,
        createdAt: new Date(item.created_at),
        updatedAt: new Date(item.updated_at),
      }))
    }
  },

  /**
   * 获取相册详情
   */
  async getAlbumById(albumId: string): Promise<Album | null> {
    if (useMSW) {
      const response = await fetch(`/api/albums/${albumId}`)
      if (!response.ok) return null
      const result = await response.json()
      return result.data || result.album
    } else {
      const { data, error } = await supabase
        .from('albums')
        .select('*')
        .eq('id', albumId)
        .maybeSingle()

      if (error || !data) return null

      return {
        id: data.id,
        title: data.title,
        description: data.description || '',
        type: data.type,
        coverPhoto: data.cover_photo_id || '',
        photoIds: data.photo_ids || [],
        slideshowSettings: data.slideshow_settings || undefined,
        visibility: data.visibility || 'private',
        organizationId: data.organization_id,
        createdAt: new Date(data.created_at),
        updatedAt: new Date(data.updated_at),
      }
    }
  },

  /**
   * 创建相册
   */
  async createAlbum(params: {
    title: string
    description?: string
    type: string
    photoIds: string[]
    visibility?: import('@/types/album').AlbumVisibility
    organizationId?: string
  }): Promise<ApiResponse<Album>> {
    if (useMSW) {
      const response = await fetch('/api/albums', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      })
      return await response.json()
    } else {
      const user = await authService.getCurrentUser()
      if (!user) {
        return { success: false, error: '用户未登录' }
      }

      const { data, error } = await supabase
        .from('albums')
        .insert({
          user_id: user.id,
          title: params.title,
          description: params.description,
          type: params.type,
          photo_ids: params.photoIds,
          cover_photo_id: params.photoIds[0] || null,
          visibility: params.visibility || 'private',
          organization_id: params.visibility === 'organization' ? params.organizationId : null,
        })
        .select()
        .single()

      if (error) {
        return { success: false, error: error.message }
      }

      const album: Album = {
        id: data.id,
        title: data.title,
        description: data.description || '',
        type: data.type,
        coverPhoto: data.cover_photo_id || '',
        photoIds: data.photo_ids || [],
        slideshowSettings: data.slideshow_settings || undefined,
        visibility: data.visibility || 'private',
        organizationId: data.organization_id,
        createdAt: new Date(data.created_at),
        updatedAt: new Date(data.updated_at),
      }

      return { success: true, data: album }
    }
  },

  /**
   * 更新相册
   */
  async updateAlbum(
    albumId: string,
    params: Partial<{
      title: string
      description: string
      photoIds: string[]
      slideshowSettings: import('@/types/album').SlideshowSettings
    }>
  ): Promise<ApiResponse<void>> {
    if (useMSW) {
      const response = await fetch(`/api/albums/${albumId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      })
      return await response.json()
    } else {
      const updateData: Record<string, unknown> = {}
      if (params.title) updateData.title = params.title
      if (params.description !== undefined) updateData.description = params.description
      if (params.photoIds) updateData.photo_ids = params.photoIds
      if (params.slideshowSettings) updateData.slideshow_settings = params.slideshowSettings

      const { error } = await supabase.from('albums').update(updateData).eq('id', albumId)

      if (error) {
        return { success: false, error: error.message }
      }
      return { success: true }
    }
  },

  /**
   * 删除相册
   */
  async deleteAlbum(albumId: string): Promise<ApiResponse<void>> {
    if (useMSW) {
      const response = await fetch(`/api/albums/${albumId}`, {
        method: 'DELETE',
      })
      return await response.json()
    } else {
      const { error } = await supabase.from('albums').delete().eq('id', albumId)

      if (error) {
        return { success: false, error: error.message }
      }
      return { success: true }
    }
  },

  /**
   * 获取人员列表
   */
  async getPersons(): Promise<Person[]> {
    if (useMSW) {
      const response = await fetch('/api/persons')
      if (!response.ok) throw new Error('获取人员失败')
      const result = await response.json()
      return result.data || result.persons || []
    } else {
      return memoryCache.getOrFetch(
        'api:persons',
        async () => {
          const { personDB } = await import('@/services/db/personDB')

          try {
            const cached = await personDB.getAll()
            if (cached.length > 0) {
              console.log(`[API Service] ✅ persons 缓存命中: ${cached.length} 人`)
              return cached
            }
          } catch (e) {
            console.warn('[API Service] 读取 persons 缓存失败:', e)
          }

          console.log('[API Service] persons 缓存未命中，从 Supabase 拉取...')
          const { data, error } = await supabase.from('persons').select('*').order('name')

          if (error) throw new Error(`Supabase 错误: ${error.message}`)

          if (data && data.length > 0) {
            personDB.addPersons(data).catch((err) => {
              console.warn('[API Service] 同步 persons 到 IndexedDB 失败:', err)
            })
          }

          console.log(`[API Service] ✅ 从 Supabase 获取 ${data?.length || 0} 人`)
          return data || []
        },
        memoryCache.PROFILE_TTL
      )
    }
  },

  /**
   * 获取人员详情
   */
  async getPersonById(personId: string): Promise<Person | null> {
    if (useMSW) {
      const response = await fetch(`/api/persons/${personId}`)
      if (!response.ok) return null
      const result = await response.json()
      return result.data || result.person
    } else {
      const { data, error } = await supabase
        .from('persons')
        .select('*')
        .eq('id', personId)
        .maybeSingle()

      if (error || !data) return null
      return data
    }
  },
}

/**
 * 导出便捷方法
 */
export const {
  getAlbums,
  getAlbumById,
  createAlbum,
  updateAlbum,
  deleteAlbum,
  getPersons,
  getPersonById,
} = apiService
