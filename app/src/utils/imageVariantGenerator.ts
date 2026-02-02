/**
 * Image Variant Generator
 * Epic-17: Multi-format Image Storage
 * 
 * Generates multiple image variants:
 * - Original: Keep as-is (for user download)
 * - Thumbnail: 200x200 WebP (for list display)
 * - Compressed: 1920px max WebP (for default display and AI processing)
 */

export interface ImageVariant {
  type: 'original' | 'thumbnail' | 'compressed';
  blob: Blob;
  width: number;
  height: number;
  size: number;
}

export interface ImageVariants {
  original: ImageVariant;
  thumbnail: ImageVariant;
  compressed: ImageVariant;
}

const VARIANT_CONFIG = {
  thumbnail: {
    maxDimension: 200,
    quality: 0.8,
    format: 'image/webp' as const,
  },
  compressed: {
    maxDimension: 1920,
    quality: 0.85,
    format: 'image/webp' as const,
  },
  // Epic-17: 百炼专用格式（符合阿里云限制）
  bailian: {
    maxDimension: 1920,      // 最大 2000px
    minDimension: 400,       // 最小 360px（保留余量）
    quality: 0.8,            // 降低质量确保 <10MB
    format: 'image/jpeg' as const,  // 使用 JPEG 更稳定
    maxFileSize: 10 * 1024 * 1024,  // 10MB 限制
  },
};

export class ImageVariantGenerator {
  /**
   * Load image from file
   */
  private async loadImage(file: File): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const url = URL.createObjectURL(file);
      
      img.onload = () => {
        URL.revokeObjectURL(url);
        resolve(img);
      };
      
      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error('Failed to load image'));
      };
      
      img.src = url;
    });
  }

  /**
   * Resize image using canvas
   */
  private async resizeImage(
    img: HTMLImageElement,
    maxDimension: number,
    quality: number,
    format: 'image/webp' | 'image/jpeg'
  ): Promise<{ blob: Blob; width: number; height: number }> {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    if (!ctx) {
      throw new Error('Failed to get canvas context');
    }

    let { width, height } = img;
    
    if (width > maxDimension || height > maxDimension) {
      if (width > height) {
        height = Math.round((height * maxDimension) / width);
        width = maxDimension;
      } else {
        width = Math.round((width * maxDimension) / height);
        height = maxDimension;
      }
    }

    canvas.width = width;
    canvas.height = height;

    ctx.drawImage(img, 0, 0, width, height);

    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (b) => {
          if (b) resolve(b);
          else reject(new Error('Failed to create blob'));
        },
        format,
        quality
      );
    });

    return { blob, width, height };
  }

  /**
   * Generate thumbnail variant (200x200 WebP)
   */
  async generateThumbnail(img: HTMLImageElement): Promise<ImageVariant> {
    const config = VARIANT_CONFIG.thumbnail;
    const { blob, width, height } = await this.resizeImage(
      img,
      config.maxDimension,
      config.quality,
      config.format
    );

    return {
      type: 'thumbnail',
      blob,
      width,
      height,
      size: blob.size,
    };
  }

  /**
   * Generate compressed variant (1920px WebP)
   */
  async generateCompressed(img: HTMLImageElement): Promise<ImageVariant> {
    const config = VARIANT_CONFIG.compressed;
    const { blob, width, height } = await this.resizeImage(
      img,
      config.maxDimension,
      config.quality,
      config.format
    );

    return {
      type: 'compressed',
      blob,
      width,
      height,
      size: blob.size,
    };
  }

  /**
   * Generate original variant (keep file as-is)
   */
  async generateOriginal(file: File): Promise<ImageVariant> {
    const img = await this.loadImage(file);
    
    return {
      type: 'original',
      blob: file,
      width: img.width,
      height: img.height,
      size: file.size,
    };
  }

  /**
   * Generate all variants for a given file
   * @param file Original image file
   * @param onProgress Progress callback (0-100)
   */
  async generateAllVariants(
    file: File,
    onProgress?: (progress: number) => void
  ): Promise<ImageVariants> {
    onProgress?.(0);

    const img = await this.loadImage(file);
    onProgress?.(25);

    const original = await this.generateOriginal(file);
    onProgress?.(40);

    const thumbnail = await this.generateThumbnail(img);
    onProgress?.(70);

    const compressed = await this.generateCompressed(img);
    onProgress?.(100);

    console.log('✅ Image variants generated:', {
      original: { size: original.size, dimensions: `${original.width}x${original.height}` },
      thumbnail: { size: thumbnail.size, dimensions: `${thumbnail.width}x${thumbnail.height}` },
      compressed: { size: compressed.size, dimensions: `${compressed.width}x${compressed.height}` },
      compressionRatio: ((1 - (thumbnail.size + compressed.size) / original.size) * 100).toFixed(1) + '%',
    });

    return {
      original,
      thumbnail,
      compressed,
    };
  }

  /**
   * Validate if file is a supported image
   */
  validateImage(file: File): { valid: boolean; error?: string } {
    const supportedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/heic', 'image/heif'];
    
    if (!supportedTypes.includes(file.type.toLowerCase())) {
      return {
        valid: false,
        error: `Unsupported image type: ${file.type}. Supported: JPEG, PNG, WebP, HEIC`,
      };
    }

    const maxSize = 50 * 1024 * 1024;
    if (file.size > maxSize) {
      return {
        valid: false,
        error: `File too large: ${(file.size / 1024 / 1024).toFixed(1)}MB. Max: 50MB`,
      };
    }

    return { valid: true };
  }
}

export const imageVariantGenerator = new ImageVariantGenerator();
