/**
 * imageCompressor 图片压缩工具测试
 * 注：compressImageToWebP 和 compressBase64ToWebP 依赖浏览器 API，此处仅测试纯函数
 */
import { describe, it, expect, vi } from 'vitest'
import { isWebPSupported, estimateCompressedSize } from '../imageCompressor'

describe('imageCompressor', () => {
  describe('isWebPSupported', () => {
    it('应该检测 WebP 支持', () => {
      // Mock canvas.toDataURL
      const mockToDataURL = vi.fn().mockReturnValue('data:image/webp;base64,xxx')
      const mockCanvas = {
        width: 0,
        height: 0,
        toDataURL: mockToDataURL,
      }
      vi.spyOn(document, 'createElement').mockReturnValue(
        mockCanvas as unknown as HTMLCanvasElement
      )

      const result = isWebPSupported()
      expect(typeof result).toBe('boolean')
      expect(result).toBe(true)
    })

    it('应该返回 false 当浏览器不支持 WebP', () => {
      // Mock canvas.toDataURL 返回非 WebP 格式
      const mockToDataURL = vi.fn().mockReturnValue('data:image/png;base64,xxx')
      const mockCanvas = {
        width: 0,
        height: 0,
        toDataURL: mockToDataURL,
      }
      vi.spyOn(document, 'createElement').mockReturnValue(
        mockCanvas as unknown as HTMLCanvasElement
      )

      const result = isWebPSupported()
      expect(result).toBe(false)
    })
  })

  describe('estimateCompressedSize', () => {
    it('应该估算压缩后大小', () => {
      const originalSize = 1000000 // 1MB
      const estimated = estimateCompressedSize(originalSize, 0.85)

      expect(estimated).toBeLessThan(originalSize)
      expect(estimated).toBeGreaterThan(0)
    })

    it('应该根据质量调整估算', () => {
      const originalSize = 1000000
      const highQuality = estimateCompressedSize(originalSize, 0.9)
      const lowQuality = estimateCompressedSize(originalSize, 0.5)

      // 高质量压缩比更高（文件更小），低质量压缩比更低（文件更大）
      // quality=0.9: ratio = 0.5 + 0.1 * 0.3 = 0.53
      // quality=0.5: ratio = 0.5 + 0.5 * 0.3 = 0.65
      expect(highQuality).toBeLessThan(lowQuality)
    })

    it('应该处理默认质量参数', () => {
      const originalSize = 1000000
      const estimated = estimateCompressedSize(originalSize)

      expect(estimated).toBeGreaterThan(0)
      expect(estimated).toBeLessThan(originalSize)
    })

    it('应该处理零大小', () => {
      const estimated = estimateCompressedSize(0, 0.85)
      expect(estimated).toBe(0)
    })

    it('应该处理不同原始大小', () => {
      const small = estimateCompressedSize(1000, 0.85)
      const large = estimateCompressedSize(10000000, 0.85)

      expect(small).toBeLessThan(large)
    })
  })
})
