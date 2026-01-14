/**
 * 照片下载 Hook
 * Epic: 11 - 照片云存储
 * Story: 11.5 - 下载和缓存管理
 * 
 * 功能:
 * - 智能分级加载（缩略图 → 压缩图 → 原图）
 * - 自动降级到本地
 * - 缓存管理
 */

import { useState, useEffect, useCallback } from 'react';
import { downloadService, type PhotoType } from '@/services/cloud/downloadService';
import { useAuthStore } from '@/stores/useAuthStore';

/**
 * 照片下载状态
 */
export interface PhotoDownloadState {
  /** 当前显示的 URL */
  url: string | null;
  /** 是否正在加载 */
  isLoading: boolean;
  /** 错误信息 */
  error: string | null;
  /** 当前加载的类型 */
  loadedType: PhotoType | null;
  /** 是否来自本地降级 */
  isLocal: boolean;
}

/**
 * Hook 选项
 */
export interface UsePhotoDownloadOptions {
  /** 照片ID */
  photoId: string;
  /** 初始 URL（本地 Base64） */
  initialUrl?: string;
  /** 是否启用云端下载 */
  enableCloudDownload?: boolean;
  /** 是否自动加载 */
  autoLoad?: boolean;
  /** 初始加载类型 */
  initialType?: PhotoType;
}

/**
 * 照片下载 Hook
 */
export function usePhotoDownload(options: UsePhotoDownloadOptions) {
  const {
    photoId,
    initialUrl,
    enableCloudDownload = true,
    autoLoad = true,
    initialType = 'thumbnail',
  } = options;

  const { user } = useAuthStore();

  const [state, setState] = useState<PhotoDownloadState>({
    url: initialUrl || null,
    isLoading: false,
    error: null,
    loadedType: null,
    isLocal: !!initialUrl,
  });

  /**
   * 加载照片
   */
  const loadPhoto = useCallback(
    async (type: PhotoType = initialType) => {
      // 如果没有用户或未启用云端下载，使用本地 URL
      if (!user || !enableCloudDownload) {
        if (initialUrl) {
          setState({
            url: initialUrl,
            isLoading: false,
            error: null,
            loadedType: type,
            isLocal: true,
          });
        }
        return;
      }

      setState((prev) => ({ ...prev, isLoading: true, error: null }));

      try {
        // 注意：第二个参数是 ossUrl，不是 userId
        // 如果 initialUrl 是有效的 OSS URL（以 http 开头），则使用它
        const ossUrl = initialUrl?.startsWith('http') ? initialUrl : undefined;
        
        const url = await downloadService.getPhotoUrl(
          photoId,
          ossUrl,  // 传递 OSS URL 或 undefined
          type,
          {
            useCache: true,
            fallbackToLocal: true,
            timeout: 10000,
          }
        );

        setState({
          url,
          isLoading: false,
          error: null,
          loadedType: type,
          isLocal: url.startsWith('data:'), // Base64 表示本地
        });
      } catch (error) {
        console.error(`Failed to load photo ${photoId}:`, error);
        
        // 降级到初始 URL
        setState({
          url: initialUrl || null,
          isLoading: false,
          error: error instanceof Error ? error.message : 'Failed to load photo',
          loadedType: null,
          isLocal: true,
        });
      }
    },
    [photoId, user, enableCloudDownload, initialUrl, initialType]
  );

  /**
   * 升级到更高质量
   */
  const upgradeQuality = useCallback(
    async (targetType: PhotoType) => {
      // 只在当前类型低于目标类型时升级
      const typeOrder: PhotoType[] = ['thumbnail', 'compressed', 'original'];
      const currentIndex = state.loadedType ? typeOrder.indexOf(state.loadedType) : -1;
      const targetIndex = typeOrder.indexOf(targetType);

      if (currentIndex >= targetIndex) {
        return; // 已经是目标质量或更高
      }

      await loadPhoto(targetType);
    },
    [state.loadedType, loadPhoto]
  );

  /**
   * 重试加载
   */
  const retry = useCallback(() => {
    loadPhoto(state.loadedType || initialType);
  }, [loadPhoto, state.loadedType, initialType]);

  /**
   * 清除并重新加载
   */
  const clearAndReload = useCallback(() => {
    setState({
      url: null,
      isLoading: false,
      error: null,
      loadedType: null,
      isLocal: false,
    });
    loadPhoto();
  }, [loadPhoto]);

  // 自动加载
  useEffect(() => {
    if (autoLoad && !state.url) {
      loadPhoto();
    }
  }, [autoLoad, loadPhoto, state.url]);

  // 监听缓存清除事件
  useEffect(() => {
    const handleCacheCleared = () => {
      console.log(`Cache cleared event received for photo ${photoId}`);
      clearAndReload();
    };

    window.addEventListener('cache-cleared', handleCacheCleared);
    
    return () => {
      window.removeEventListener('cache-cleared', handleCacheCleared);
    };
  }, [photoId, clearAndReload]);

  return {
    ...state,
    loadPhoto,
    upgradeQuality,
    retry,
    clearAndReload,
  };
}

