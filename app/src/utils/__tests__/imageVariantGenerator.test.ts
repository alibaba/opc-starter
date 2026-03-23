/**
 * imageVariantGenerator 图片变体生成器测试
 */
import { describe, it, expect } from 'vitest'
import { ImageVariantGenerator } from '../imageVariantGenerator'

describe('ImageVariantGenerator', () => {
  const generator = new ImageVariantGenerator()

  describe('validateImage', () => {
    it('应该接受 JPEG 文件', () => {
      const file = new File([''], 'test.jpg', { type: 'image/jpeg' })
      const result = generator.validateImage(file)
      expect(result.valid).toBe(true)
      expect(result.error).toBeUndefined()
    })

    it('应该接受 PNG 文件', () => {
      const file = new File([''], 'test.png', { type: 'image/png' })
      expect(generator.validateImage(file).valid).toBe(true)
    })

    it('应该接受 WebP 文件', () => {
      const file = new File([''], 'test.webp', { type: 'image/webp' })
      expect(generator.validateImage(file).valid).toBe(true)
    })

    it('应该接受 HEIC 文件', () => {
      const file = new File([''], 'test.heic', { type: 'image/heic' })
      expect(generator.validateImage(file).valid).toBe(true)
    })

    it('应该接受 HEIF 文件', () => {
      const file = new File([''], 'test.heif', { type: 'image/heif' })
      expect(generator.validateImage(file).valid).toBe(true)
    })

    it('应该拒绝不支持的文件类型', () => {
      const file = new File([''], 'test.bmp', { type: 'image/bmp' })
      const result = generator.validateImage(file)
      expect(result.valid).toBe(false)
      expect(result.error).toContain('Unsupported image type')
    })

    it('应该拒绝非图片文件', () => {
      const file = new File([''], 'test.txt', { type: 'text/plain' })
      const result = generator.validateImage(file)
      expect(result.valid).toBe(false)
      expect(result.error).toContain('Unsupported image type')
    })

    it('应该拒绝超过 50MB 的文件', () => {
      const content = new ArrayBuffer(51 * 1024 * 1024)
      const file = new File([content], 'huge.jpg', { type: 'image/jpeg' })
      const result = generator.validateImage(file)
      expect(result.valid).toBe(false)
      expect(result.error).toContain('File too large')
      expect(result.error).toContain('50MB')
    })

    it('应该允许恰好 50MB 的文件', () => {
      const content = new ArrayBuffer(50 * 1024 * 1024)
      const file = new File([content], 'big.jpg', { type: 'image/jpeg' })
      const result = generator.validateImage(file)
      expect(result.valid).toBe(true)
    })
  })
})
