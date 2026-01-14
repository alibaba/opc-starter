/**
 * Canvas 滤镜工具函数
 * Epic: 8 - 照片编辑
 * Story: 8.3 - 滤镜效果
 */

import { FILTERS, type FilterType } from '@/types/filter';

/**
 * 应用滤镜到图像
 * @param imageSrc - 图像源 (base64 或 URL)
 * @param filterType - 滤镜类型
 * @param quality - 输出质量 (0-1)
 * @returns Promise<string> - 应用滤镜后的 base64 图像
 */
export async function applyFilter(
  imageSrc: string,
  filterType: FilterType,
  quality: number = 0.95
): Promise<string> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    
    image.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        if (!ctx) {
          reject(new Error('Failed to get canvas context'));
          return;
        }
        
        canvas.width = image.width;
        canvas.height = image.height;
        
        // 查找滤镜配置
        const filterConfig = FILTERS.find(f => f.id === filterType);
        
        if (!filterConfig) {
          reject(new Error(`Filter not found: ${filterType}`));
          return;
        }
        
        // 应用 CSS 滤镜到 canvas context
        if (filterConfig.cssFilter !== 'none') {
          ctx.filter = filterConfig.cssFilter;
        }
        
        // 绘制图像
        ctx.drawImage(image, 0, 0);
        
        // 转换为 base64
        const base64 = canvas.toDataURL('image/jpeg', quality);
        resolve(base64);
      } catch (error) {
        reject(error);
      }
    };
    
    image.onerror = () => {
      reject(new Error('Failed to load image'));
    };
    
    image.src = imageSrc;
  });
}

/**
 * 生成滤镜缩略图
 * @param imageSrc - 图像源
 * @param filterType - 滤镜类型
 * @param size - 缩略图尺寸
 * @returns Promise<string> - 缩略图 base64
 */
export async function generateFilterThumbnail(
  imageSrc: string,
  filterType: FilterType,
  size: number = 100
): Promise<string> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    
    image.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        if (!ctx) {
          reject(new Error('Failed to get canvas context'));
          return;
        }
        
        // 计算缩略图尺寸（保持宽高比）
        let width = size;
        let height = size;
        
        if (image.width > image.height) {
          height = (size * image.height) / image.width;
        } else {
          width = (size * image.width) / image.height;
        }
        
        canvas.width = width;
        canvas.height = height;
        
        // 应用滤镜
        const filterConfig = FILTERS.find(f => f.id === filterType);
        if (filterConfig && filterConfig.cssFilter !== 'none') {
          ctx.filter = filterConfig.cssFilter;
        }
        
        // 绘制缩略图
        ctx.drawImage(image, 0, 0, width, height);
        
        // 转换为 base64
        const base64 = canvas.toDataURL('image/jpeg', 0.8);
        resolve(base64);
      } catch (error) {
        reject(error);
      }
    };
    
    image.onerror = () => {
      reject(new Error('Failed to load image'));
    };
    
    image.src = imageSrc;
  });
}

/**
 * 批量生成所有滤镜的缩略图
 * @param imageSrc - 图像源
 * @param size - 缩略图尺寸
 * @returns Promise<Map<FilterType, string>> - 滤镜类型到缩略图的映射
 */
export async function generateAllFilterThumbnails(
  imageSrc: string,
  size: number = 100
): Promise<Map<FilterType, string>> {
  const thumbnails = new Map<FilterType, string>();
  
  // 并行生成所有滤镜缩略图
  const promises = FILTERS.map(async (filter) => {
    try {
      const thumbnail = await generateFilterThumbnail(imageSrc, filter.id, size);
      thumbnails.set(filter.id, thumbnail);
    } catch (error) {
      console.error(`Failed to generate thumbnail for filter ${filter.id}:`, error);
    }
  });
  
  await Promise.all(promises);
  
  return thumbnails;
}

