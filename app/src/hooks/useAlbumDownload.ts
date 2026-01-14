import { useState, useCallback } from 'react';
import JSZip from 'jszip';
import type { Photo } from '@/types/photo';
import { downloadBlob } from '@/utils/downloadHelper';
import { useUIStore } from '@/stores/useUIStore';

interface UseAlbumDownloadResult {
  isDownloading: boolean;
  downloadProgress: number;
  downloadAlbum: (albumTitle: string, photos: Photo[]) => Promise<void>;
}

/**
 * 相册下载Hook（使用JSZip打包）
 */
export function useAlbumDownload(): UseAlbumDownloadResult {
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const { showToast } = useUIStore();

  /**
   * 下载相册
   */
  const downloadAlbum = useCallback(
    async (albumTitle: string, photos: Photo[]) => {
      if (photos.length === 0) {
        showToast('相册中没有照片', 'error');
        return;
      }

      setIsDownloading(true);
      setDownloadProgress(0);

      try {
        const zip = new JSZip();
        const photoFolder = zip.folder('photos');

        if (!photoFolder) {
          throw new Error('创建文件夹失败');
        }

        // 添加照片到ZIP
        for (let i = 0; i < photos.length; i++) {
          const photo = photos[i];
          const progress = ((i + 1) / photos.length) * 90; // 90%用于添加文件
          setDownloadProgress(Math.floor(progress));

          // 提取Base64数据（移除前缀）
          const base64Data = photo.base64.split(',')[1];
          if (!base64Data) {
            console.warn(`照片 ${photo.id} Base64数据无效，跳过`);
            continue;
          }

          // 生成文件名
          const fileName = `photo_${i + 1}.jpg`;
          photoFolder.file(fileName, base64Data, { base64: true });
        }

        // 生成ZIP文件
        setDownloadProgress(95);
        const blob = await zip.generateAsync({ type: 'blob' });

        // 下载
        setDownloadProgress(100);
        const filename = `${albumTitle.replace(/[^a-zA-Z0-9\u4e00-\u9fa5]/g, '_')}_${Date.now()}.zip`;
        downloadBlob(blob, filename);

        showToast('相册下载成功！', 'success');
      } catch (error) {
        console.error('下载相册失败:', error);
        showToast('下载相册失败', 'error');
      } finally {
        setIsDownloading(false);
        setDownloadProgress(0);
      }
    },
    [showToast]
  );

  return {
    isDownloading,
    downloadProgress,
    downloadAlbum,
  };
}
