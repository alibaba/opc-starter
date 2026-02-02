/**
 * Canvas 旋转工具函数
 * Epic: 8 - 照片编辑
 * Story: 8.2 - 照片旋转功能
 */

/**
 * 旋转图像
 * @param imageSrc - 图像源 (base64 或 URL)
 * @param degrees - 旋转角度 (0, 90, 180, 270)
 * @param quality - 输出质量 (0-1)
 * @returns Promise<string> - 旋转后的 base64 图像
 */
export async function rotateImage(
  imageSrc: string,
  degrees: number,
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
        
        // 将角度转换为弧度
        const radians = (degrees * Math.PI) / 180;
        
        // 计算旋转后的画布尺寸
        const sin = Math.abs(Math.sin(radians));
        const cos = Math.abs(Math.cos(radians));
        
        const newWidth = image.width * cos + image.height * sin;
        const newHeight = image.width * sin + image.height * cos;
        
        canvas.width = newWidth;
        canvas.height = newHeight;
        
        // 移动到画布中心
        ctx.translate(newWidth / 2, newHeight / 2);
        
        // 旋转
        ctx.rotate(radians);
        
        // 绘制图像（从中心点开始）
        ctx.drawImage(image, -image.width / 2, -image.height / 2);
        
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
 * 翻转图像
 * @param imageSrc - 图像源 (base64 或 URL)
 * @param direction - 翻转方向 ('horizontal' | 'vertical')
 * @param quality - 输出质量 (0-1)
 * @returns Promise<string> - 翻转后的 base64 图像
 */
export async function flipImage(
  imageSrc: string,
  direction: 'horizontal' | 'vertical',
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
        
        // 保存当前状态
        ctx.save();
        
        if (direction === 'horizontal') {
          // 水平翻转
          ctx.scale(-1, 1);
          ctx.drawImage(image, -image.width, 0);
        } else {
          // 垂直翻转
          ctx.scale(1, -1);
          ctx.drawImage(image, 0, -image.height);
        }
        
        // 恢复状态
        ctx.restore();
        
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
 * 快速旋转（90° 增量）
 * @param imageSrc - 图像源
 * @param times - 旋转次数（1=90°, 2=180°, 3=270°）
 * @param quality - 输出质量
 * @returns Promise<string> - 旋转后的 base64 图像
 */
export async function rotateBy90(
  imageSrc: string,
  times: number,
  quality: number = 0.95
): Promise<string> {
  const degrees = (times % 4) * 90;
  return rotateImage(imageSrc, degrees, quality);
}

