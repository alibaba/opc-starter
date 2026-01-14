/**
 * useEnsurePhotosLoaded Hook
 * 
 * 确保照片数据已加载到 Zustand Store
 * 
 * 策略：
 * 1. 检查 Zustand Store 是否已有数据
 * 2. 如果没有，从 IndexedDB 读取（快速）
 * 3. 如果 IndexedDB 也为空，触发 Supabase 同步
 * 
 * 使用场景：
 * - 直接访问需要照片数据的页面（如 AI Fusion）
 * - 确保任意入口都能正确加载数据
 * 
 * @author BMAD Team
 * @date 2025-11-30
 */

import { useEffect, useState, useCallback } from 'react'
import { usePhotoStore } from '@/stores/usePhotoStore'
import { dataService } from '@/services/data'

interface UseEnsurePhotosLoadedOptions {
  /** 是否自动加载，默认 true */
  autoLoad?: boolean
  /** 最小照片数量，低于此数量会尝试从 Supabase 同步 */
  minPhotos?: number
}

interface UseEnsurePhotosLoadedResult {
  /** 是否正在加载 */
  loading: boolean
  /** 加载错误 */
  error: string | null
  /** 是否有照片 */
  hasPhotos: boolean
  /** 照片数量 */
  photoCount: number
  /** 数据来源 */
  source: 'store' | 'indexeddb' | 'supabase' | null
  /** 手动刷新函数 */
  refresh: () => Promise<void>
}

export function useEnsurePhotosLoaded(
  options: UseEnsurePhotosLoadedOptions = {}
): UseEnsurePhotosLoadedResult {
  const { autoLoad = true, minPhotos = 0 } = options
  
  const { photos, setPhotos } = usePhotoStore()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [source, setSource] = useState<'store' | 'indexeddb' | 'supabase' | null>(null)

  /**
   * 加载照片数据
   */
  const loadPhotos = useCallback(async (forceRefresh = false) => {
    // 如果 Store 已有足够数据且不是强制刷新，跳过
    if (!forceRefresh && photos.length > minPhotos) {
      setSource('store')
      return
    }

    setLoading(true)
    setError(null)

    try {
      // 1. 先尝试从 IndexedDB 读取
      console.log('[useEnsurePhotosLoaded] 检查 IndexedDB 缓存...')
      const cached = await dataService.getAllPhotos()

      if (cached.length > minPhotos && !forceRefresh) {
        console.log(`[useEnsurePhotosLoaded] ✅ 从 IndexedDB 加载 ${cached.length} 张照片`)
        setPhotos(cached)
        setSource('indexeddb')
        return
      }

      // 2. IndexedDB 为空或数据不足，从 Supabase 同步
      console.log('[useEnsurePhotosLoaded] IndexedDB 数据不足，从 Supabase 同步...')
      
      // 执行初始同步（内部会判断是完整同步还是增量同步）
      await dataService.initialSync()

      // 3. 再次从 IndexedDB 读取（initialSync 会填充 IndexedDB）
      const synced = await dataService.getAllPhotos()
      
      if (synced.length > 0) {
        console.log(`[useEnsurePhotosLoaded] ✅ 从 Supabase 同步 ${synced.length} 张照片`)
        setPhotos(synced)
        setSource('supabase')
      } else {
        console.log('[useEnsurePhotosLoaded] ⚠️ 没有照片数据')
        setSource(null)
      }

    } catch (err) {
      const message = err instanceof Error ? err.message : '加载照片失败'
      console.error('[useEnsurePhotosLoaded] ❌ 加载失败:', err)
      setError(message)
    } finally {
      setLoading(false)
    }
  }, [photos.length, minPhotos, setPhotos])

  /**
   * 手动刷新（强制从 Supabase 同步）
   */
  const refresh = useCallback(async () => {
    await loadPhotos(true)
  }, [loadPhotos])

  // 自动加载
  useEffect(() => {
    if (autoLoad) {
      loadPhotos()
    }
  }, [autoLoad, loadPhotos])

  return {
    loading,
    error,
    hasPhotos: photos.length > 0,
    photoCount: photos.length,
    source,
    refresh,
  }
}

/**
 * 预加载照片数据（不依赖组件生命周期）
 * 
 * 用于 main.tsx 启动时预热 Store
 */
export async function preloadPhotosToStore(): Promise<{
  success: boolean
  count: number
  source: 'indexeddb' | 'supabase' | null
  error?: string
  syncResult?: { added: number; updated: number }
}> {
  const { setPhotos } = usePhotoStore.getState()

  try {
    // 1. 先尝试从 IndexedDB 读取
    console.log('[preloadPhotosToStore] 检查 IndexedDB 缓存...')
    const cached = await dataService.getAllPhotos()

    if (cached.length > 0) {
      console.log(`[preloadPhotosToStore] ✅ 从 IndexedDB 预热 ${cached.length} 张照片`)
      setPhotos(cached)
      
      // 后台执行增量同步（不阻塞启动）
      dataService.incrementalSync().then(syncResult => {
        if (syncResult.added > 0 || syncResult.updated > 0 || syncResult.deleted > 0) {
          console.log(`[preloadPhotosToStore] 🔄 增量同步完成: 新增 ${syncResult.added}, 更新 ${syncResult.updated}, 删除 ${syncResult.deleted}`)
          
          // 重新加载 Store
          dataService.getAllPhotos().then(updatedPhotos => {
            setPhotos(updatedPhotos)
            console.log(`[preloadPhotosToStore] ✅ Store 已更新: ${updatedPhotos.length} 张照片`)
          })
        }
      }).catch(err => {
        console.warn('[preloadPhotosToStore] ⚠️ 增量同步失败:', err)
      })
      
      return { success: true, count: cached.length, source: 'indexeddb' }
    }

    // 2. IndexedDB 为空，从 Supabase 同步
    console.log('[preloadPhotosToStore] IndexedDB 为空，从 Supabase 同步...')
    await dataService.initialSync()

    // 3. 再次读取
    const synced = await dataService.getAllPhotos()
    
    if (synced.length > 0) {
      console.log(`[preloadPhotosToStore] ✅ 从 Supabase 预热 ${synced.length} 张照片`)
      setPhotos(synced)
      return { success: true, count: synced.length, source: 'supabase' }
    }

    console.log('[preloadPhotosToStore] ⚠️ 没有照片数据')
    return { success: true, count: 0, source: null }

  } catch (err) {
    const message = err instanceof Error ? err.message : '预加载失败'
    console.error('[preloadPhotosToStore] ❌ 预加载失败:', err)
    return { success: false, count: 0, source: null, error: message }
  }
}

