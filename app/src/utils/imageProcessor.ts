/**
 * 图片处理工具函数
 */

/**
 * 压缩图片到指定尺寸和质量
 * @param file 原始文件
 * @param maxWidth 最大宽度
 * @param quality 压缩质量（0-1）
 * @returns Base64字符串
 */
export async function compressImage(
  file: File,
  maxWidth: number = 1920,
  quality: number = 0.8
): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      const img = new Image();
      
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        
        // 计算缩放比例
        if (width > maxWidth) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        }
        
        canvas.width = width;
        canvas.height = height;
        
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('无法获取Canvas上下文'));
          return;
        }
        
        // 绘制图片
        ctx.drawImage(img, 0, 0, width, height);
        
        // 转换为Base64
        const base64 = canvas.toDataURL('image/jpeg', quality);
        resolve(base64);
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
 * 将文件转换为Base64
 * @param file 文件对象
 * @returns Base64字符串
 */
export async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = () => {
      resolve(reader.result as string);
    };
    
    reader.onerror = () => {
      reject(new Error('文件读取失败'));
    };
    
    reader.readAsDataURL(file);
  });
}

/**
 * 生成缩略图
 * @param base64 原始Base64图片
 * @param size 缩略图尺寸（正方形）
 * @returns 缩略图Base64
 */
export async function generateThumbnail(
  base64: string,
  size: number = 200
): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = size;
      canvas.height = size;
      
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('无法获取Canvas上下文'));
        return;
      }
      
      // 计算裁剪区域（居中裁剪）
      const sourceSize = Math.min(img.width, img.height);
      const sourceX = (img.width - sourceSize) / 2;
      const sourceY = (img.height - sourceSize) / 2;
      
      // 绘制缩略图
      ctx.drawImage(
        img,
        sourceX,
        sourceY,
        sourceSize,
        sourceSize,
        0,
        0,
        size,
        size
      );
      
      const thumbnail = canvas.toDataURL('image/jpeg', 0.7);
      resolve(thumbnail);
    };
    
    img.onerror = () => {
      reject(new Error('图片加载失败'));
    };
    
    img.src = base64;
  });
}

/**
 * 获取图片元数据
 * @param base64 Base64图片
 * @returns 元数据对象
 */
export async function getImageMetadata(base64: string): Promise<{
  width: number;
  height: number;
  size: number;
  format: string;
}> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    
    img.onload = () => {
      // 计算Base64字符串大小（字节）
      const base64Length = base64.split(',')[1]?.length || 0;
      const size = Math.floor((base64Length * 3) / 4);
      
      // 从Base64提取格式
      const formatMatch = base64.match(/data:image\/([a-zA-Z]+);base64/);
      const format = formatMatch ? formatMatch[1] : 'jpeg';
      
      resolve({
        width: img.width,
        height: img.height,
        size,
        format,
      });
    };
    
    img.onerror = () => {
      reject(new Error('图片加载失败'));
    };
    
    img.src = base64;
  });
}

/**
 * 验证文件是否为图片
 * @param file 文件对象
 * @returns 是否为图片
 */
export function isImageFile(file: File): boolean {
  const imageTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
  return imageTypes.includes(file.type);
}

/**
 * 验证图片文件大小
 * @param file 文件对象
 * @param maxSizeMB 最大文件大小（MB）
 * @returns 是否符合大小限制
 */
export function validateImageSize(file: File, maxSizeMB: number = 10): boolean {
  const maxSizeBytes = maxSizeMB * 1024 * 1024;
  return file.size <= maxSizeBytes;
}
