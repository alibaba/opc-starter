/**
 * 统一 API 服务层（DataService 适配层）
 *
 * 架构变更：
 * - MSW 模式 (VITE_ENABLE_MSW=true): 使用 fetch → MSW handlers → photoDB
 * - Supabase 模式 (VITE_ENABLE_MSW=false): 使用 DataService（Supabase 优先 → IndexedDB）
 *
 * 这个文件作为适配层，为现有页面提供统一的 API 接口，
 * 内部根据环境自动切换到 DataService 或 MSW
 */

import { supabase } from '@/lib/supabase/client'
import { authService } from '@/lib/supabase/auth'
import { dataService } from '@/services/data'
import { memoryCache } from '@/services/cache/memoryCache'
import { convertToAccelerateUrl } from '@/config/oss'
import type { Photo } from '@/types/photo'
import type { Album } from '@/types/album'
import type { Person } from '@/types/person'
import type { PaginatedResponse, ApiResponse } from '@/types/api'

/**
 * 检查是否使用 MSW Mock 模式
 */
const useMSW = import.meta.env.VITE_ENABLE_MSW === 'true'

console.log('[API Service] 初始化（DataService 适配层）', {
  mode: useMSW ? 'MSW Mock' : 'DataService (Supabase)',
  VITE_ENABLE_MSW: import.meta.env.VITE_ENABLE_MSW,
})

/**
 * 数据转换：Supabase 格式 → 前端格式
 */
function transformSupabasePhoto(supabasePhoto: Record<string, unknown>): Photo {
  // v6.0: 优先使用 OSS URL，回退到 Supabase Storage
  let photoUrl =
    supabasePhoto.oss_url ||
    supabase.storage.from('photos-original').getPublicUrl(supabasePhoto.storage_path).data.publicUrl

  // 转换为传输加速 URL（如果启用）
  photoUrl = convertToAccelerateUrl(photoUrl)

  // 获取数据库字段（优先使用数据库的直接字段）
  const dbWidth = supabasePhoto.width
  const dbHeight = supabasePhoto.height
  const dbFileSize = supabasePhoto.file_size
  const dbMimeType = supabasePhoto.mime_type

  // 确保 metadata 有有效的宽高值（降级兼容）
  const metadata = supabasePhoto.metadata || {}

  // 标准化格式：jpg → image/jpeg
  let format = dbMimeType || metadata.format || 'jpg'
  if (format === 'jpg' || format === 'image/jpg') {
    format = 'image/jpeg'
  } else if (!format.startsWith('image/')) {
    format = `image/${format}`
  }

  const safeMetadata = {
    width: dbWidth || metadata.width || 800,
    height: dbHeight || metadata.height || 600,
    size: dbFileSize || metadata.size || 0,
    format: format,
    fileName: metadata.fileName,
  }

  return {
    id: supabasePhoto.id,
    base64: photoUrl, // OSS 传输加速 URL 或 Supabase Storage URL
    thumbnail: photoUrl, // 简化：使用同一个URL
    uploadedAt: new Date(supabasePhoto.created_at),
    takenAt: supabasePhoto.taken_at ? new Date(supabasePhoto.taken_at) : null,
    tags: supabasePhoto.tags || [],
    faces: supabasePhoto.faces || [],
    metadata: safeMetadata,
    // 数据库字段（直接映射，用于 AI 验证等场景）
    width: dbWidth || undefined,
    height: dbHeight || undefined,
    file_size: dbFileSize || undefined,
    mime_type: format,
    // 云同步字段 - 从 Supabase 加载的照片已经在云端
    cloudSyncStatus: 'synced',
    cloudStoragePath: photoUrl,
    cloudSyncProgress: 100,
    // v5.0 OSS fields（也转换为加速 URL）
    oss_url: photoUrl,
    oss_key: supabasePhoto.oss_key,
    file_hash: supabasePhoto.file_hash,
  }
}

/**
 * API 服务导出
 */
export const apiService = {
  /**
   * 获取照片列表
   *
   * 策略：IndexedDB 优先 → Supabase 回退
   * 1. 优先从 IndexedDB 读取（快速响应）
   * 2. 如果 IndexedDB 为空，触发 Supabase 同步
   * 3. 后台 Realtime 保持数据更新
   */
  async getPhotos(
    params: {
      page?: number
      pageSize?: number
      personId?: string
      organizationId?: string
      forceRefresh?: boolean // 强制从 Supabase 刷新
      orderBy?: 'taken_at' | 'updated_at' | 'created_at' // 排序字段，默认 taken_at
    } = {}
  ): Promise<PaginatedResponse<Photo>> {
    const { page = 1, pageSize = 20, personId, organizationId, orderBy = 'taken_at' } = params
    // forceRefresh 参数暂时不使用，因为 Epic-22 始终从 Supabase 查询以支持 public 照片

    if (useMSW) {
      // MSW 模式：使用 fetch，会被 MSW 拦截
      console.log('[API Service] MSW 模式 - 调用 /api/photos')
      const url = personId
        ? `/api/persons/${personId}/photos`
        : `/api/photos?page=${page}&pageSize=${pageSize}`

      const response = await fetch(url)
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const result = await response.json()
      return result.data || result
    } else {
      // Supabase 模式：使用 DataService（IndexedDB 优先）
      console.log('[API Service] Supabase 模式 - IndexedDB 优先策略')

      try {
        // 处理按人员筛选的情况
        if (personId) {
          console.warn('[API Service] 按人员筛选照片功能待实现（需要 faces 表）')
          return {
            items: [],
            total: 0,
            page,
            pageSize,
            totalPages: 0,
          }
        }

        // Epic-22: 为了支持 public 照片显示，始终从 Supabase 查询
        // RLS 策略会自动返回用户有权查看的照片（自己的 + public + 组织内的）
        // 注意：后续可以优化为仅缓存自己的照片，public 照片实时查询
        console.log('[API Service] 从 Supabase 查询照片（支持 public 可见性）...')

        let query = supabase
          .from('photos')
          .select('*', { count: 'exact' })
          .order(orderBy, { ascending: false, nullsFirst: false })
          .range((page - 1) * pageSize, page * pageSize - 1)

        // 按组织筛选
        // Epic-22 更新：选择具体团队时，只显示该团队的照片（不包含 public）
        // "全部"模式（organizationId 为空）：RLS 自动返回有权限的照片 + public 照片
        if (organizationId) {
          // 获取组织路径
          const { data: org } = await supabase
            .from('organizations')
            .select('path')
            .eq('id', organizationId)
            .maybeSingle()

          if (org?.path) {
            // 获取所有组织，然后在 JS 中筛选该组织及其子组织
            // 因为 ltree 类型不支持 PostgREST 的 like 操作符
            const { data: allOrgs } = await supabase.from('organizations').select('id, path')

            if (allOrgs && allOrgs.length > 0) {
              // 筛选当前组织及所有子组织（path 以当前组织 path 开头）
              const orgPath = org.path
              const descendantOrgs = allOrgs.filter(
                (o) => o.id === organizationId || (o.path && o.path.startsWith(orgPath + '.'))
              )
              const orgIds = descendantOrgs.map((o) => o.id)
              if (orgIds.length > 0) {
                // 只获取该组织的照片，不包含 public 照片
                // 用户想查看具体团队时，只看团队的照片
                query = query.in('organization_id', orgIds)
              }
            }
          }
        }

        const { data, error, count } = await query

        if (error) {
          console.error('Supabase 查询错误:', error)
          throw new Error(`获取照片列表失败: ${error.message}`)
        }

        const photos = (data || []).map(transformSupabasePhoto)

        // 3. 同步到 IndexedDB（后台执行，不阻塞返回）
        if (photos.length > 0) {
          import('@/services/db/photoDB').then(({ photoDB }) => {
            photoDB.addPhotos(photos).catch((err) => {
              console.warn('[API Service] 同步到 IndexedDB 失败:', err)
            })
          })
        }

        console.log(`[API Service] ✅ 从 Supabase 获取 ${photos.length} 张照片`)

        return {
          items: photos,
          total: count || 0,
          page,
          pageSize,
          totalPages: Math.ceil((count || 0) / pageSize),
        }
      } catch (error) {
        console.error('[API Service] 查询失败:', error)
        throw error
      }
    }
  },

  /**
   * 获取单张照片
   */
  async getPhotoById(photoId: string): Promise<Photo | null> {
    if (useMSW) {
      const response = await fetch(`/api/photos/${photoId}`)
      if (!response.ok) return null
      const result = await response.json()
      return result.data || result.photo
    } else {
      // Supabase 模式：使用 DataService（从 IndexedDB 读取）
      return await dataService.getPhoto(photoId)
    }
  },

  /**
   * 上传照片
   */
  async uploadPhoto(params: {
    base64: string
    filename: string
    tags?: string[]
  }): Promise<ApiResponse<{ photoId: string; faces: unknown[] }>> {
    if (useMSW) {
      const response = await fetch('/api/photos/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      })
      return await response.json()
    } else {
      // TODO: 实现 Supabase 上传逻辑
      throw new Error('Supabase 上传功能待实现')
    }
  },

  /**
   * 删除照片
   */
  async deletePhoto(photoId: string): Promise<ApiResponse<void>> {
    if (useMSW) {
      const response = await fetch(`/api/photos/${photoId}`, {
        method: 'DELETE',
      })
      return await response.json()
    } else {
      // Supabase 模式：使用 DataService（Supabase 优先 → IndexedDB）
      try {
        await dataService.deletePhoto(photoId)
        return { success: true }
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : '删除失败',
        }
      }
    }
  },

  /**
   * 更新照片标签
   */
  async updatePhotoTags(photoId: string, tags: string[]): Promise<ApiResponse<void>> {
    if (useMSW) {
      const response = await fetch(`/api/photos/${photoId}/tags`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tags }),
      })
      return await response.json()
    } else {
      // Supabase 模式：使用 DataService（Supabase 优先 → IndexedDB）
      try {
        await dataService.updatePhoto(photoId, { tags })
        return { success: true }
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : '更新失败',
        }
      }
    }
  },

  /**
   * 获取相册列表
   * Epic-22: 支持获取权限相关字段
   * 关联查询封面照片 URL，如果封面为空则使用第一张照片作为回退
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
        .select(
          `
          *,
          cover_photo:photos!cover_photo_id (
            oss_thumbnail_url,
            oss_compressed_url,
            oss_url
          )
        `
        )
        .order('updated_at', { ascending: false })

      if (error) throw new Error(`Supabase 错误: ${error.message}`)

      // 转换数据库字段名到前端格式
      const albums = (data || []).map((item) => {
        // 提取封面照片 URL（优先级：thumbnail > compressed > original）
        const coverPhotoUrl =
          item.cover_photo?.oss_thumbnail_url ||
          item.cover_photo?.oss_compressed_url ||
          item.cover_photo?.oss_url

        return {
          id: item.id,
          title: item.title,
          description: item.description || '',
          type: item.type,
          coverPhoto: item.cover_photo_id || '',
          coverPhotoUrl: coverPhotoUrl || undefined,
          photoIds: item.photo_ids || [],
          slideshowSettings: item.slideshow_settings || undefined,
          // Epic-22: 权限字段
          visibility: item.visibility || 'private',
          organizationId: item.organization_id,
          createdAt: new Date(item.created_at),
          updatedAt: new Date(item.updated_at),
        }
      })

      // 回退处理：对于没有封面 URL 但有照片的相册，获取实际存在的照片作为封面
      const albumsNeedingCover = albums.filter((a) => !a.coverPhotoUrl && a.photoIds.length > 0)

      if (albumsNeedingCover.length > 0) {
        // 收集所有需要查询的照片 ID（每个相册取前 5 张，避免无效 ID）
        const allPhotoIds = [...new Set(albumsNeedingCover.flatMap((a) => a.photoIds.slice(0, 5)))]

        const { data: photosData } = await supabase
          .from('photos')
          .select('id, oss_thumbnail_url, oss_compressed_url, oss_url')
          .in('id', allPhotoIds)

        if (photosData && photosData.length > 0) {
          // 创建照片 ID 到 URL 的映射
          const photoUrlMap = new Map(
            photosData.map((p) => [p.id, p.oss_thumbnail_url || p.oss_compressed_url || p.oss_url])
          )

          // 为每个相册找到第一张有效的封面照片
          albumsNeedingCover.forEach((album) => {
            for (const photoId of album.photoIds) {
              const url = photoUrlMap.get(photoId)
              if (url) {
                album.coverPhotoUrl = url
                break
              }
            }
          })
        }
      }

      return albums
    }
  },

  /**
   * 获取相册详情
   * Epic-22: 支持获取权限相关字段
   * 关联查询封面照片 URL
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
        .select(
          `
          *,
          cover_photo:photos!cover_photo_id (
            oss_thumbnail_url,
            oss_compressed_url,
            oss_url
          )
        `
        )
        .eq('id', albumId)
        .maybeSingle()

      if (error || !data) return null

      // 提取封面照片 URL（优先级：thumbnail > compressed > original）
      let coverPhotoUrl =
        data.cover_photo?.oss_thumbnail_url ||
        data.cover_photo?.oss_compressed_url ||
        data.cover_photo?.oss_url

      // 回退处理：如果没有封面 URL 但有照片，获取第一张照片的 URL
      const photoIds = data.photo_ids || []
      if (!coverPhotoUrl && photoIds.length > 0) {
        const { data: photoData } = await supabase
          .from('photos')
          .select('oss_thumbnail_url, oss_compressed_url, oss_url')
          .eq('id', photoIds[0])
          .maybeSingle()

        if (photoData) {
          coverPhotoUrl =
            photoData.oss_thumbnail_url || photoData.oss_compressed_url || photoData.oss_url
        }
      }

      // 转换数据库字段名到前端格式
      return {
        id: data.id,
        title: data.title,
        description: data.description || '',
        type: data.type,
        coverPhoto: data.cover_photo_id || '',
        coverPhotoUrl: coverPhotoUrl || undefined,
        photoIds,
        slideshowSettings: data.slideshow_settings || undefined,
        // Epic-22: 权限字段
        visibility: data.visibility || 'private',
        organizationId: data.organization_id,
        createdAt: new Date(data.created_at),
        updatedAt: new Date(data.updated_at),
      }
    }
  },

  /**
   * 创建相册
   * Epic-22: 支持 visibility 和 organizationId 权限设置
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
      // 获取当前用户 ID（带缓存）
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
          // Epic-22: 权限设置
          visibility: params.visibility || 'private',
          organization_id: params.visibility === 'organization' ? params.organizationId : null,
        })
        .select()
        .single()

      if (error) {
        return { success: false, error: error.message }
      }

      // 转换数据库字段名到前端格式
      const album: Album = {
        id: data.id,
        title: data.title,
        description: data.description || '',
        type: data.type,
        coverPhoto: data.cover_photo_id || '',
        photoIds: data.photo_ids || [],
        slideshowSettings: data.slideshow_settings || undefined,
        // Epic-22: 权限字段
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
   * 自动生成相册
   */
  async generateAlbum(params: {
    type: string
    personId?: string
    startDate?: string | Date
    endDate?: string | Date
    department?: string
  }): Promise<ApiResponse<Album>> {
    if (useMSW) {
      const response = await fetch('/api/albums/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      })
      return await response.json()
    } else {
      // TODO: 实现 Supabase 自动生成相册逻辑
      throw new Error('Supabase 自动生成相册功能待实现')
    }
  },

  /**
   * 获取人员列表
   *
   * 策略：IndexedDB 优先 → Supabase 回退
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

  /**
   * 获取人员相关照片
   */
  async getPersonPhotos(personId: string): Promise<Photo[]> {
    if (useMSW) {
      const response = await fetch(`/api/persons/${personId}/photos`)
      if (!response.ok) throw new Error('获取人员照片失败')
      const result = await response.json()
      return result.data || result.photos || []
    } else {
      // TODO: 需要先创建 faces 表
      // 暂时返回空数组
      console.warn('[API Service] Supabase 模式下获取人员照片功能待实现（需要 faces 表）')
      return []
    }
  },
}

/**
 * 导出便捷方法
 */
export const {
  getPhotos,
  getPhotoById,
  uploadPhoto,
  deletePhoto,
  updatePhotoTags,
  getAlbums,
  getAlbumById,
  createAlbum,
  updateAlbum,
  deleteAlbum,
  generateAlbum,
  getPersons,
  getPersonById,
  getPersonPhotos,
} = apiService
