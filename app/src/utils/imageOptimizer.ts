/**
 * Image Optimizer for AI Services
 *
 * 自动优化图片以符合 AI 服务要求：
 * - 调整尺寸到符合限制
 * - 压缩文件大小到 <10MB
 * - 转换格式为支持的类型
 * - 保持图片主要元素和宽高比
 *
 * @version 2.0.0 - 内联 AI 服务约束定义
 */

/**
 * AI 服务类型
 */
export type AIServiceType = 'i2v-single' | 'i2v-multi' | 'kf2v' | 'emo' | 'fusion'

/**
 * AI 服务约束配置
 */
interface AIServiceConstraint {
  minWidth?: number
  minHeight?: number
  maxWidth?: number
  maxHeight?: number
  minDimension?: number
  maxDimension?: number
  maxFileSize?: number
  supportedFormats?: string[]
}

/**
 * AI 服务约束配置
 */
export const AI_SERVICE_CONSTRAINTS: Record<AIServiceType, AIServiceConstraint> = {
  'i2v-single': {
    minDimension: 300,
    maxDimension: 2048,
    maxFileSize: 10 * 1024 * 1024,
    supportedFormats: ['image/jpeg', 'image/png', 'image/webp'],
  },
  'i2v-multi': {
    minDimension: 300,
    maxDimension: 2048,
    maxFileSize: 10 * 1024 * 1024,
    supportedFormats: ['image/jpeg', 'image/png', 'image/webp'],
  },
  kf2v: {
    minDimension: 300,
    maxDimension: 2048,
    maxFileSize: 10 * 1024 * 1024,
    supportedFormats: ['image/jpeg', 'image/png', 'image/webp'],
  },
  emo: {
    minDimension: 256,
    maxDimension: 1024,
    maxFileSize: 5 * 1024 * 1024,
    supportedFormats: ['image/jpeg', 'image/png'],
  },
  fusion: {
    minDimension: 256,
    maxDimension: 2048,
    maxFileSize: 10 * 1024 * 1024,
    supportedFormats: ['image/jpeg', 'image/png', 'image/webp'],
  },
}

export interface OptimizationOptions {
  serviceType: AIServiceType
  targetFormat?: 'webp' | 'jpeg' | 'png'
  quality?: number
  preserveAspectRatio?: boolean
}

export interface OptimizationResult {
  success: boolean
  blob?: Blob
  base64?: string
  width: number
  height: number
  fileSize: number
  format: string
  optimizations: string[]
  error?: string
}

export class ImageOptimizer {
  /**
   * 从 File 或 Base64 加载图片
   */
  private async loadImage(source: File | string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const img = new Image()

      // CORS: 允许跨域图片导出到 Canvas
      if (
        typeof source === 'string' &&
        (source.startsWith('http://') || source.startsWith('https://'))
      ) {
        img.crossOrigin = 'anonymous'
      }

      img.onload = () => {
        if (source instanceof File) {
          URL.revokeObjectURL(img.src)
        }
        resolve(img)
      }

      img.onerror = () => {
        if (source instanceof File) {
          URL.revokeObjectURL(img.src)
        }
        reject(new Error('Failed to load image'))
      }

      if (source instanceof File) {
        img.src = URL.createObjectURL(source)
      } else {
        img.src = source
      }
    })
  }

  /**
   * 计算优化后的尺寸
   */
  private calculateOptimizedDimensions(
    originalWidth: number,
    originalHeight: number,
    constraints: (typeof AI_SERVICE_CONSTRAINTS)[AIServiceType]
  ): { width: number; height: number; needsResize: boolean } {
    let width = originalWidth
    let height = originalHeight
    let needsResize = false

    const minDim =
      constraints.minDimension || Math.min(constraints.minWidth || 0, constraints.minHeight || 0)
    const maxDim =
      constraints.maxDimension ||
      Math.max(constraints.maxWidth || 9999, constraints.maxHeight || 9999)

    const currentMaxDim = Math.max(width, height)
    const currentMinDim = Math.min(width, height)

    if (currentMaxDim > maxDim) {
      const ratio = maxDim / currentMaxDim
      width = Math.round(width * ratio)
      height = Math.round(height * ratio)
      needsResize = true
    }

    if (currentMinDim < minDim) {
      const ratio = minDim / currentMinDim
      width = Math.round(width * ratio)
      height = Math.round(height * ratio)
      needsResize = true
    }

    width = Math.round(width / 16) * 16
    height = Math.round(height / 16) * 16

    return { width, height, needsResize }
  }

  /**
   * 使用 Canvas 渲染优化后的图片
   */
  private async renderOptimizedImage(
    img: HTMLImageElement,
    width: number,
    height: number,
    format: 'webp' | 'jpeg' | 'png',
    quality: number
  ): Promise<Blob> {
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height

    const ctx = canvas.getContext('2d', { alpha: format === 'png' })
    if (!ctx) {
      throw new Error('Failed to get canvas context')
    }

    if (format === 'jpeg') {
      ctx.fillStyle = '#FFFFFF'
      ctx.fillRect(0, 0, width, height)
    }

    ctx.imageSmoothingEnabled = true
    ctx.imageSmoothingQuality = 'high'

    ctx.drawImage(img, 0, 0, width, height)

    const mimeType = `image/${format}`
    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (b) => {
          if (b) resolve(b)
          else reject(new Error('Failed to create blob'))
        },
        mimeType,
        quality
      )
    })

    return blob
  }

  /**
   * 优化图片以符合 AI 服务要求
   */
  async optimize(source: File | string, options: OptimizationOptions): Promise<OptimizationResult> {
    const { serviceType, targetFormat = 'webp', quality: initialQuality = 0.85 } = options

    const optimizations: string[] = []

    try {
      const img = await this.loadImage(source)
      const constraints = AI_SERVICE_CONSTRAINTS[serviceType]

      const originalWidth = img.width
      const originalHeight = img.height

      const { width, height, needsResize } = this.calculateOptimizedDimensions(
        originalWidth,
        originalHeight,
        constraints
      )

      if (needsResize) {
        optimizations.push(`调整尺寸: ${originalWidth}x${originalHeight} → ${width}x${height}`)
      }

      let currentQuality = initialQuality
      let blob: Blob
      let attempts = 0
      const maxAttempts = 5
      const maxFileSize = constraints.maxFileSize || 10 * 1024 * 1024

      do {
        blob = await this.renderOptimizedImage(img, width, height, targetFormat, currentQuality)
        attempts++

        if (blob.size > maxFileSize && attempts < maxAttempts) {
          const reductionRatio = Math.sqrt(maxFileSize / blob.size) * 0.95
          currentQuality *= reductionRatio
          optimizations.push(`压缩质量调整: ${(currentQuality * 100).toFixed(0)}%`)
        } else {
          break
        }
      } while (attempts < maxAttempts)

      if (blob.size > maxFileSize) {
        return {
          success: false,
          width,
          height,
          fileSize: blob.size,
          format: targetFormat,
          optimizations,
          error: `无法将文件压缩到 ${(maxFileSize / 1024 / 1024).toFixed(1)}MB 以下 (当前: ${(blob.size / 1024 / 1024).toFixed(1)}MB)`,
        }
      }

      if (targetFormat !== 'png') {
        optimizations.push(`格式转换: → ${targetFormat.toUpperCase()}`)
      }

      optimizations.push(`文件大小: ${(blob.size / 1024 / 1024).toFixed(2)}MB`)

      const reader = new FileReader()
      const base64 = await new Promise<string>((resolve, reject) => {
        reader.onload = () => resolve(reader.result as string)
        reader.onerror = () => reject(new Error('Failed to read blob'))
        reader.readAsDataURL(blob)
      })

      return {
        success: true,
        blob,
        base64,
        width,
        height,
        fileSize: blob.size,
        format: targetFormat,
        optimizations,
      }
    } catch (error) {
      return {
        success: false,
        width: 0,
        height: 0,
        fileSize: 0,
        format: targetFormat,
        optimizations,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  }

  /**
   * 批量优化多张图片
   */
  async optimizeBatch(
    sources: (File | string)[],
    options: OptimizationOptions,
    onProgress?: (current: number, total: number) => void
  ): Promise<OptimizationResult[]> {
    const results: OptimizationResult[] = []

    for (let i = 0; i < sources.length; i++) {
      onProgress?.(i + 1, sources.length)
      const result = await this.optimize(sources[i], options)
      results.push(result)
    }

    return results
  }

  /**
   * 预览优化效果
   */
  async previewOptimization(
    source: File | string,
    options: OptimizationOptions
  ): Promise<{
    original: { width: number; height: number; size: number }
    optimized: { width: number; height: number; size: number }
    savings: number
  }> {
    const img = await this.loadImage(source)
    const originalSize = source instanceof File ? source.size : 0

    const result = await this.optimize(source, options)

    if (!result.success || !result.blob) {
      throw new Error(result.error || 'Optimization failed')
    }

    const savings = originalSize > 0 ? ((originalSize - result.blob.size) / originalSize) * 100 : 0

    return {
      original: {
        width: img.width,
        height: img.height,
        size: originalSize,
      },
      optimized: {
        width: result.width,
        height: result.height,
        size: result.blob.size,
      },
      savings,
    }
  }
}

export const imageOptimizer = new ImageOptimizer()
