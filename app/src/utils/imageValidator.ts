/**
 * AI 服务图片验证工具
 * Epic-17: 前置 AI 服务限制，避免运行时错误
 * 
 * 功能:
 * - 验证图片是否符合阿里云百炼各 API 的限制
 * - 提供详细的错误提示
 * - 支持多种 AI 服务类型
 */

import type { Photo } from '@/types/photo';

/**
 * AI 服务类型
 */
export type AIServiceType = 'i2v-single' | 'i2v-keyframe' | 'emo' | 'liveportrait' | 'general';

/**
 * 验证结果
 */
export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * 图片约束配置
 */
export interface ImageConstraints {
  /** 最小宽度 (px) */
  minWidth?: number;
  /** 最大宽度 (px) */
  maxWidth?: number;
  /** 最小高度 (px) */
  minHeight?: number;
  /** 最大高度 (px) */
  maxHeight?: number;
  /** 最小维度（宽或高的最小值） */
  minDimension?: number;
  /** 最大维度（宽或高的最大值） */
  maxDimension?: number;
  /** 最大宽高比 (width/height) */
  maxAspectRatio?: number;
  /** 最小宽高比 (width/height) */
  minAspectRatio?: number;
  /** 最大文件大小 (bytes) */
  maxFileSize?: number;
  /** 支持的格式 */
  allowedFormats?: string[];
  /** 服务名称（用于错误提示） */
  serviceName?: string;
}

/**
 * 阿里云百炼各服务的图片限制
 * 参考: https://help.aliyun.com/zh/model-studio/
 */
export const AI_SERVICE_CONSTRAINTS: Record<AIServiceType, ImageConstraints> = {
  // 图生视频 - 单图
  'i2v-single': {
    minDimension: 360,
    maxDimension: 2000,
    minAspectRatio: 1 / 200,
    maxAspectRatio: 200,
    maxFileSize: 10 * 1024 * 1024, // 10MB
    allowedFormats: ['image/jpeg', 'image/jpg', 'image/png', 'image/bmp', 'image/webp'],
    serviceName: '图生视频',
  },
  
  // 图生视频 - 关键帧
  'i2v-keyframe': {
    minDimension: 360,
    maxDimension: 2000,
    minAspectRatio: 1 / 200,
    maxAspectRatio: 200,
    maxFileSize: 10 * 1024 * 1024, // 10MB
    allowedFormats: ['image/jpeg', 'image/jpg', 'image/png', 'image/bmp', 'image/webp'],
    serviceName: '照片故事',
  },
  
  // EMO 声动视频
  'emo': {
    minWidth: 256,
    minHeight: 256,
    maxWidth: 5760,
    maxHeight: 3240,
    maxFileSize: 10 * 1024 * 1024, // 10MB
    allowedFormats: ['image/jpeg', 'image/jpg', 'image/png', 'image/bmp', 'image/webp'],
    serviceName: 'EMO声动视频',
  },
  
  // LivePortrait
  'liveportrait': {
    minDimension: 256,
    maxDimension: 2048,
    maxFileSize: 10 * 1024 * 1024, // 10MB
    allowedFormats: ['image/jpeg', 'image/jpg', 'image/png', 'image/bmp', 'image/webp'],
    serviceName: 'LivePortrait',
  },
  
  // 通用限制（最宽松）
  'general': {
    minDimension: 10,
    maxDimension: 7000,
    minAspectRatio: 1 / 200,
    maxAspectRatio: 200,
    maxFileSize: 20 * 1024 * 1024, // 20MB
    allowedFormats: ['image/jpeg', 'image/jpg', 'image/png', 'image/bmp', 'image/webp'],
    serviceName: '通用',
  },
};

/**
 * 图片验证器类
 */
export class ImageValidator {
  /**
   * 验证图片是否符合 AI 服务限制
   */
  validate(photo: Photo, serviceType: AIServiceType): ValidationResult {
    const constraints = AI_SERVICE_CONSTRAINTS[serviceType];
    const errors: string[] = [];
    const warnings: string[] = [];

    // 1. 检查图片元数据是否存在（降级兼容：优先使用顶层字段，回退到 metadata）
    const width = photo.width || photo.metadata?.width;
    const height = photo.height || photo.metadata?.height;
    
    if (!width || !height) {
      console.warn('[ImageValidator] 图片缺少尺寸信息:', {
        photoId: photo.id,
        topLevel: { width: photo.width, height: photo.height },
        metadata: { width: photo.metadata?.width, height: photo.metadata?.height }
      });
      errors.push('图片缺少尺寸信息');
      return { valid: false, errors, warnings };
    }

    // 2. 检查文件大小（降级兼容）
    const fileSize = photo.file_size || photo.metadata?.size || 0;
    if (constraints.maxFileSize && fileSize > 0 && fileSize > constraints.maxFileSize) {
      const maxSizeMB = (constraints.maxFileSize / 1024 / 1024).toFixed(1);
      const actualSizeMB = (fileSize / 1024 / 1024).toFixed(1);
      errors.push(`文件过大 (${actualSizeMB}MB > ${maxSizeMB}MB)`);
    }

    // 3. 检查宽度限制
    if (constraints.minWidth && width < constraints.minWidth) {
      errors.push(`宽度过小 (${width}px < ${constraints.minWidth}px)`);
    }
    if (constraints.maxWidth && width > constraints.maxWidth) {
      errors.push(`宽度过大 (${width}px > ${constraints.maxWidth}px)`);
    }

    // 4. 检查高度限制
    if (constraints.minHeight && height < constraints.minHeight) {
      errors.push(`高度过小 (${height}px < ${constraints.minHeight}px)`);
    }
    if (constraints.maxHeight && height > constraints.maxHeight) {
      errors.push(`高度过大 (${height}px > ${constraints.maxHeight}px)`);
    }

    // 5. 检查最小维度（宽或高）
    if (constraints.minDimension) {
      const minSide = Math.min(width, height);
      if (minSide < constraints.minDimension) {
        errors.push(`最小边过小 (${minSide}px < ${constraints.minDimension}px)`);
      }
    }

    // 6. 检查最大维度（宽或高）
    if (constraints.maxDimension) {
      const maxSide = Math.max(width, height);
      if (maxSide > constraints.maxDimension) {
        errors.push(`最大边过大 (${maxSide}px > ${constraints.maxDimension}px)`);
      }
    }

    // 7. 检查宽高比
    const aspectRatio = width / height;
    if (constraints.minAspectRatio && aspectRatio < constraints.minAspectRatio) {
      errors.push(`宽高比过小 (${aspectRatio.toFixed(2)} < ${constraints.minAspectRatio})`);
    }
    if (constraints.maxAspectRatio && aspectRatio > constraints.maxAspectRatio) {
      errors.push(`宽高比过大 (${aspectRatio.toFixed(2)} > ${constraints.maxAspectRatio})`);
    }

    // 8. 检查格式（降级兼容）
    const mimeType = (photo.mime_type || photo.metadata?.format || '').toLowerCase();
    if (constraints.allowedFormats && mimeType) {
      const isAllowed = constraints.allowedFormats.some(format => {
        const formatLower = format.toLowerCase();
        return mimeType.includes(formatLower.replace('image/', '')) || 
               mimeType === formatLower;
      });
      
      if (!isAllowed) {
        errors.push(`格式不支持 (${mimeType})`);
      }
    }

    // 9. 警告：建议使用压缩图
    const compressedUrl = (photo as Photo & {oss_compressed_url?: string}).oss_compressed_url;
    if (!compressedUrl && fileSize > 5 * 1024 * 1024) {
      warnings.push('建议使用压缩图以提高处理速度');
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * 批量验证照片
   */
  validateBatch(photos: Photo[], serviceType: AIServiceType): Map<string, ValidationResult> {
    const results = new Map<string, ValidationResult>();
    
    for (const photo of photos) {
      results.set(photo.id, this.validate(photo, serviceType));
    }
    
    return results;
  }

  /**
   * 获取验证通过的照片列表
   */
  filterValidPhotos(photos: Photo[], serviceType: AIServiceType): Photo[] {
    return photos.filter(photo => this.validate(photo, serviceType).valid);
  }

  /**
   * 获取服务约束的可读描述
   */
  getConstraintsDescription(serviceType: AIServiceType): string[] {
    const constraints = AI_SERVICE_CONSTRAINTS[serviceType];
    const descriptions: string[] = [];

    if (constraints.minDimension || constraints.maxDimension) {
      const min = constraints.minDimension || 0;
      const max = constraints.maxDimension || '不限';
      descriptions.push(`📐 尺寸: ${min}px - ${max}px`);
    }

    if (constraints.minWidth && constraints.maxWidth) {
      descriptions.push(`↔️ 宽度: ${constraints.minWidth}px - ${constraints.maxWidth}px`);
    }

    if (constraints.minHeight && constraints.maxHeight) {
      descriptions.push(`↕️ 高度: ${constraints.minHeight}px - ${constraints.maxHeight}px`);
    }

    if (constraints.maxFileSize) {
      const maxSizeMB = (constraints.maxFileSize / 1024 / 1024).toFixed(0);
      descriptions.push(`💾 大小: ≤ ${maxSizeMB}MB`);
    }

    if (constraints.allowedFormats && constraints.allowedFormats.length > 0) {
      const formats = constraints.allowedFormats.map(f => f.replace('image/', '').toUpperCase()).join(', ');
      descriptions.push(`📄 格式: ${formats}`);
    }

    if (constraints.minAspectRatio && constraints.maxAspectRatio) {
      descriptions.push(`📊 宽高比: ${constraints.minAspectRatio} - ${constraints.maxAspectRatio}`);
    }

    return descriptions;
  }
}

// 导出单例
export const imageValidator = new ImageValidator();

/**
 * 便捷函数：验证照片是否可用于特定服务
 */
export function canUseForAI(photo: Photo, serviceType: AIServiceType): boolean {
  return imageValidator.validate(photo, serviceType).valid;
}

/**
 * 便捷函数：获取验证错误信息
 */
export function getValidationErrors(photo: Photo, serviceType: AIServiceType): string[] {
  return imageValidator.validate(photo, serviceType).errors;
}

/**
 * 便捷函数：获取服务约束描述
 */
export function getServiceConstraints(serviceType: AIServiceType): string[] {
  return imageValidator.getConstraintsDescription(serviceType);
}
