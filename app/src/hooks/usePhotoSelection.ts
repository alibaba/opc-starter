import { useState, useCallback } from 'react'
import { toast } from 'react-hot-toast'
import type { Photo } from '../types/photo'

export interface SelectedPhoto {
  id: string
  photoId: string
  thumbnailUrl: string
  fileSize: number
  mimeType: string
  order: number
}

interface UsePhotoSelectionOptions {
  maxPhotos?: number
  minPhotos?: number
  allowedFormats?: string[]
  maxFileSize?: number
}

const DEFAULT_OPTIONS: Required<UsePhotoSelectionOptions> = {
  maxPhotos: 10,
  minPhotos: 1,
  allowedFormats: ['image/jpeg', 'image/png', 'image/webp'],
  maxFileSize: 10 * 1024 * 1024
}

export const usePhotoSelection = (options: UsePhotoSelectionOptions = {}) => {
  const config = { ...DEFAULT_OPTIONS, ...options }
  const [selectedPhotos, setSelectedPhotos] = useState<SelectedPhoto[]>([])

  const validatePhoto = useCallback((photo: Photo): boolean => {
    // 安全检查：确保 metadata 存在
    if (!photo.metadata) {
      console.warn('[PhotoSelection] 照片缺少 metadata:', photo.id)
      // 允许选择，使用默认值
      return true
    }

    // 标准化格式：jpg → jpeg
    let format = photo.metadata.format || 'jpeg'
    if (format === 'jpg') {
      format = 'jpeg'
    }
    
    // 构建 MIME 类型
    const mimeType = format.startsWith('image/') ? format : `image/${format}`
    
    console.log('[PhotoSelection] 验证照片:', {
      photoId: photo.id,
      originalFormat: photo.metadata.format,
      normalizedFormat: format,
      mimeType,
      allowedFormats: config.allowedFormats,
      isAllowed: config.allowedFormats.includes(mimeType)
    })
    
    if (!config.allowedFormats.includes(mimeType)) {
      console.error('[PhotoSelection] 格式不支持:', { format, mimeType, allowedFormats: config.allowedFormats })
      toast.error(`不支持的格式: ${format}`)
      return false
    }

    const fileSize = photo.metadata.size || 0
    if (fileSize > 0 && fileSize > config.maxFileSize) {
      console.error('[PhotoSelection] 文件过大:', { fileSize, maxFileSize: config.maxFileSize })
      toast.error(`照片大小超过限制 (${(config.maxFileSize / 1024 / 1024).toFixed(1)}MB)`)
      return false
    }

    console.log('[PhotoSelection] ✅ 验证通过')
    return true
  }, [config.allowedFormats, config.maxFileSize])

  const togglePhoto = useCallback((photo: Photo) => {
    console.log('[PhotoSelection] togglePhoto 被调用:', photo.id)
    
    setSelectedPhotos((prev) => {
      const existingIndex = prev.findIndex((p) => p.photoId === photo.id)

      if (existingIndex !== -1) {
        console.log('[PhotoSelection] 取消选择照片:', photo.id)
        return prev.filter((p) => p.photoId !== photo.id)
      }

      if (prev.length >= config.maxPhotos) {
        console.warn('[PhotoSelection] 已达到最大选择数量:', config.maxPhotos)
        toast.error(`最多只能选择 ${config.maxPhotos} 张照片`)
        return prev
      }

      console.log('[PhotoSelection] 开始验证照片...')
      if (!validatePhoto(photo)) {
        console.error('[PhotoSelection] 照片验证失败')
        return prev
      }

      // 安全获取 metadata 信息并标准化格式
      let format = photo.metadata?.format || 'jpeg'
      if (format === 'jpg') {
        format = 'jpeg'
      }
      const mimeType = format.startsWith('image/') ? format : `image/${format}`
      const fileSize = photo.metadata?.size || 0
      
      const newPhoto: SelectedPhoto = {
        id: `selected-${Date.now()}-${photo.id}`,
        photoId: photo.id,
        thumbnailUrl: photo.thumbnail || photo.base64,
        fileSize,
        mimeType,
        order: prev.length
      }

      console.log('[PhotoSelection] ✅ 照片已添加到选择列表:', newPhoto)
      return [...prev, newPhoto]
    })
  }, [config.maxPhotos, validatePhoto])

  const removePhoto = useCallback((photoId: string) => {
    setSelectedPhotos((prev) => {
      const filtered = prev.filter((p) => p.photoId !== photoId)
      return filtered.map((p, index) => ({ ...p, order: index }))
    })
  }, [])

  const reorderPhotos = useCallback((fromIndex: number, toIndex: number) => {
    setSelectedPhotos((prev) => {
      const result = [...prev]
      const [removed] = result.splice(fromIndex, 1)
      result.splice(toIndex, 0, removed)
      return result.map((p, index) => ({ ...p, order: index }))
    })
  }, [])

  const clearSelection = useCallback(() => {
    setSelectedPhotos([])
  }, [])

  const isSelected = useCallback((photoId: string): boolean => {
    return selectedPhotos.some((p) => p.photoId === photoId)
  }, [selectedPhotos])

  const canAddMore = selectedPhotos.length < config.maxPhotos
  const hasMinimum = selectedPhotos.length >= config.minPhotos
  const count = selectedPhotos.length

  return {
    selectedPhotos,
    togglePhoto,
    removePhoto,
    reorderPhotos,
    clearSelection,
    isSelected,
    canAddMore,
    hasMinimum,
    count,
    maxPhotos: config.maxPhotos,
    minPhotos: config.minPhotos
  }
}
