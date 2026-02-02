/**
 * 图片压缩工具函数
 * Epic: 11 - 照片云存储
 * Story: 11.2 - 照片上传服务
 * 
 * 功能:
 * - 将图片压缩为 WebP 格式
 * - 支持自定义尺寸和质量
 * - 保持宽高比
 */

/**
 * 将图片压缩为 WebP 格式
 * @param file 原始文件
 * @param maxSize 最大尺寸（宽或高）
 * @param quality 压缩质量 (0-1)
 * @returns WebP Blob
 */
export async function compressImageToWebP(
  file: File,
  maxSize: number = 1920,
  quality: number = 0.85
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      const img = new Image();

      img.onload = () => {
        try {
          // 计算缩放后的尺寸
          let width = img.width;
          let height = img.height;

          // 保持宽高比，缩放到 maxSize
          if (width > height) {
            if (width > maxSize) {
              height = (height * maxSize) / width;
              width = maxSize;
            }
          } else {
            if (height > maxSize) {
              width = (width * maxSize) / height;
              height = maxSize;
            }
          }

          // 创建 Canvas
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext('2d');
          if (!ctx) {
            reject(new Error('无法获取 Canvas 上下文'));
            return;
          }

          // 绘制图片
          ctx.drawImage(img, 0, 0, width, height);

          // 转换为 WebP Blob
          canvas.toBlob(
            (blob) => {
              if (blob) {
                resolve(blob);
              } else {
                reject(new Error('无法生成 WebP Blob'));
              }
            },
            'image/webp',
            quality
          );
        } catch (error) {
          reject(error);
        }
      };

      img.onerror = () => {
        reject(new Error('图片加载失败'));
      };

      img.src = e.target?.result as string;
    };

    reader.onerror = () => {
      reject(new Error('文件读取失败'));
    };

    reader.readAsDataURL(file);
  });
}

/**
 * 将 Base64 图片压缩为 WebP 格式
 * @param base64 Base64 图片字符串
 * @param maxSize 最大尺寸（宽或高）
 * @param quality 压缩质量 (0-1)
 * @returns WebP Blob
 */
export async function compressBase64ToWebP(
  base64: string,
  maxSize: number = 1920,
  quality: number = 0.85
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();

    img.onload = () => {
      try {
        // 计算缩放后的尺寸
        let width = img.width;
        let height = img.height;

        // 保持宽高比，缩放到 maxSize
        if (width > height) {
          if (width > maxSize) {
            height = (height * maxSize) / width;
            width = maxSize;
          }
        } else {
          if (height > maxSize) {
            width = (width * maxSize) / height;
            height = maxSize;
          }
        }

        // 创建 Canvas
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('无法获取 Canvas 上下文'));
          return;
        }

        // 绘制图片
        ctx.drawImage(img, 0, 0, width, height);

        // 转换为 WebP Blob
        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(blob);
            } else {
              reject(new Error('无法生成 WebP Blob'));
            }
          },
          'image/webp',
          quality
        );
      } catch (error) {
        reject(error);
      }
    };

    img.onerror = () => {
      reject(new Error('图片加载失败'));
    };

    img.src = base64;
  });
}

/**
 * 获取 WebP 格式支持情况
 * @returns 是否支持 WebP
 */
export function isWebPSupported(): boolean {
  const canvas = document.createElement('canvas');
  canvas.width = 1;
  canvas.height = 1;
  
  // 检查 toDataURL 是否支持 WebP
  return canvas.toDataURL('image/webp').indexOf('data:image/webp') === 0;
}

/**
 * 估算压缩后的文件大小
 * @param originalSize 原始文件大小（字节）
 * @param quality 压缩质量 (0-1)
 * @returns 估算的压缩后大小（字节）
 */
export function estimateCompressedSize(
  originalSize: number,
  quality: number = 0.85
): number {
  // WebP 通常能减少 30-50% 的文件大小
  // 根据质量参数调整估算
  const compressionRatio = 0.5 + (1 - quality) * 0.3;
  return Math.floor(originalSize * compressionRatio);
}

