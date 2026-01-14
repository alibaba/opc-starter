/**
 * Canvas 亮度对比度调整工具函数
 * Epic: 8 - 照片编辑
 * Story: 8.4 - 亮度对比度调整
 */

/**
 * 调整图像的亮度和对比度
 * @param imageSrc - 图像源 (base64 或 URL)
 * @param brightness - 亮度值 (-100 to 100)
 * @param contrast - 对比度值 (-100 to 100)
 * @param quality - 输出质量 (0-1)
 * @returns Promise<string> - 调整后的 base64 图像
 */
export async function adjustBrightnessContrast(
  imageSrc: string,
  brightness: number,
  contrast: number,
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
        
        // 绘制原始图像
        ctx.drawImage(image, 0, 0);
        
        // 获取图像数据
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;
        
        // 转换亮度和对比度为因子
        // 亮度: -100 to 100 → -255 to 255
        const brightnessFactor = brightness * 2.55;
        
        // 对比度: -100 to 100 → 0 to 2
        const contrastFactor = (contrast + 100) / 100;
        
        // 遍历每个像素
        for (let i = 0; i < data.length; i += 4) {
          let r = data[i];
          let g = data[i + 1];
          let b = data[i + 2];
          // Alpha channel (data[i + 3]) 保持不变
          
          // 应用对比度调整
          // 公式: newValue = (oldValue - 128) * contrastFactor + 128
          r = (r - 128) * contrastFactor + 128;
          g = (g - 128) * contrastFactor + 128;
          b = (b - 128) * contrastFactor + 128;
          
          // 应用亮度调整
          r += brightnessFactor;
          g += brightnessFactor;
          b += brightnessFactor;
          
          // 限制值在 0-255 范围内
          data[i] = Math.max(0, Math.min(255, r));
          data[i + 1] = Math.max(0, Math.min(255, g));
          data[i + 2] = Math.max(0, Math.min(255, b));
        }
        
        // 将调整后的数据放回 canvas
        ctx.putImageData(imageData, 0, 0);
        
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
 * 仅调整亮度
 * @param imageSrc - 图像源
 * @param brightness - 亮度值 (-100 to 100)
 * @param quality - 输出质量
 * @returns Promise<string> - 调整后的 base64 图像
 */
export async function adjustBrightness(
  imageSrc: string,
  brightness: number,
  quality: number = 0.95
): Promise<string> {
  return adjustBrightnessContrast(imageSrc, brightness, 0, quality);
}

/**
 * 仅调整对比度
 * @param imageSrc - 图像源
 * @param contrast - 对比度值 (-100 to 100)
 * @param quality - 输出质量
 * @returns Promise<string> - 调整后的 base64 图像
 */
export async function adjustContrast(
  imageSrc: string,
  contrast: number,
  quality: number = 0.95
): Promise<string> {
  return adjustBrightnessContrast(imageSrc, 0, contrast, quality);
}

/**
 * 生成 CSS 滤镜字符串（用于实时预览）
 * @param brightness - 亮度值 (-100 to 100)
 * @param contrast - 对比度值 (-100 to 100)
 * @returns CSS 滤镜字符串
 */
export function generateCSSFilter(brightness: number, contrast: number): string {
  const filters: string[] = [];
  
  // 亮度: -100 to 100 → 0% to 200%
  // 0 表示 100% (原始)
  const brightnessPercent = 100 + brightness;
  if (brightness !== 0) {
    filters.push(`brightness(${brightnessPercent}%)`);
  }
  
  // 对比度: -100 to 100 → 0% to 200%
  // 0 表示 100% (原始)
  const contrastPercent = 100 + contrast;
  if (contrast !== 0) {
    filters.push(`contrast(${contrastPercent}%)`);
  }
  
  return filters.length > 0 ? filters.join(' ') : 'none';
}

