/**
 * Canvas 裁剪工具函数
 * Epic: 8 - 照片编辑
 * Story: 8.1 - 照片裁剪功能
 */

import type { CropArea } from '@/types/editor';

/**
 * 裁剪图像
 * @param imageSrc - 图像源 (base64 或 URL)
 * @param cropArea - 裁剪区域
 * @param quality - 输出质量 (0-1)
 * @returns Promise<string> - 裁剪后的 base64 图像
 */
export async function cropImage(
  imageSrc: string,
  cropArea: CropArea,
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
        
        // 设置 canvas 尺寸为裁剪区域尺寸
        canvas.width = cropArea.width;
        canvas.height = cropArea.height;
        
        // 绘制裁剪后的图像
        ctx.drawImage(
          image,
          cropArea.x,
          cropArea.y,
          cropArea.width,
          cropArea.height,
          0,
          0,
          cropArea.width,
          cropArea.height
        );
        
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
 * 从 react-easy-crop 的像素裁剪区域创建裁剪区域对象
 * @param croppedAreaPixels - react-easy-crop 返回的像素裁剪区域
 * @returns CropArea
 */
export function createCropArea(croppedAreaPixels: {
  x: number;
  y: number;
  width: number;
  height: number;
}): CropArea {
  return {
    x: Math.round(croppedAreaPixels.x),
    y: Math.round(croppedAreaPixels.y),
    width: Math.round(croppedAreaPixels.width),
    height: Math.round(croppedAreaPixels.height),
  };
}

/**
 * 计算裁剪后的图像尺寸
 * @param originalWidth - 原始宽度
 * @param originalHeight - 原始高度
 * @param aspect - 目标宽高比
 * @returns { width: number; height: number }
 */
export function calculateCropDimensions(
  originalWidth: number,
  originalHeight: number,
  aspect?: number
): { width: number; height: number } {
  if (!aspect) {
    return { width: originalWidth, height: originalHeight };
  }
  
  const originalAspect = originalWidth / originalHeight;
  
  if (originalAspect > aspect) {
    // 原始图像更宽，以高度为基准
    const height = originalHeight;
    const width = height * aspect;
    return { width, height };
  } else {
    // 原始图像更高，以宽度为基准
    const width = originalWidth;
    const height = width / aspect;
    return { width, height };
  }
}

