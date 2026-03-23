/**
 * imageProcessor 图片处理工具函数测试
 */
import { describe, it, expect } from 'vitest'
import { isImageFile, validateImageSize } from '../imageProcessor'

describe('imageProcessor', () => {
  describe('isImageFile', () => {
    it('应该识别 JPEG 文件', () => {
      const file = new File([''], 'test.jpg', { type: 'image/jpeg' })
      expect(isImageFile(file)).toBe(true)
    })

    it('应该识别 PNG 文件', () => {
      const file = new File([''], 'test.png', { type: 'image/png' })
      expect(isImageFile(file)).toBe(true)
    })

    it('应该识别 GIF 文件', () => {
      const file = new File([''], 'test.gif', { type: 'image/gif' })
      expect(isImageFile(file)).toBe(true)
    })

    it('应该识别 WebP 文件', () => {
      const file = new File([''], 'test.webp', { type: 'image/webp' })
      expect(isImageFile(file)).toBe(true)
    })

    it('应该拒绝非图片文件', () => {
      const file = new File([''], 'test.txt', { type: 'text/plain' })
      expect(isImageFile(file)).toBe(false)
    })

    it('应该拒绝 PDF 文件', () => {
      const file = new File([''], 'test.pdf', { type: 'application/pdf' })
      expect(isImageFile(file)).toBe(false)
    })

    it('应该拒绝无类型文件', () => {
      const file = new File([''], 'test', { type: '' })
      expect(isImageFile(file)).toBe(false)
    })
  })

  describe('validateImageSize', () => {
    it('应该通过小于限制的文件', () => {
      const file = new File(['x'.repeat(1000)], 'test.jpg', { type: 'image/jpeg' })
      expect(validateImageSize(file, 10)).toBe(true)
    })

    it('应该拒绝超过默认 10MB 限制的文件', () => {
      // 创建一个大文件对象 (模拟)
      const content = new ArrayBuffer(11 * 1024 * 1024)
      const file = new File([content], 'large.jpg', { type: 'image/jpeg' })
      expect(validateImageSize(file)).toBe(false)
    })

    it('应该使用自定义大小限制', () => {
      const content = new ArrayBuffer(3 * 1024 * 1024) // 3MB
      const file = new File([content], 'test.jpg', { type: 'image/jpeg' })
      expect(validateImageSize(file, 5)).toBe(true)
      expect(validateImageSize(file, 2)).toBe(false)
    })

    it('应该允许恰好等于限制大小的文件', () => {
      const content = new ArrayBuffer(10 * 1024 * 1024) // exactly 10MB
      const file = new File([content], 'test.jpg', { type: 'image/jpeg' })
      expect(validateImageSize(file, 10)).toBe(true)
    })

    it('应该处理空文件', () => {
      const file = new File([], 'empty.jpg', { type: 'image/jpeg' })
      expect(validateImageSize(file, 10)).toBe(true)
    })
  })
})
