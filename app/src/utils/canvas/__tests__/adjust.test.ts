/**
 * Canvas adjust 工具函数测试 - 纯函数 generateCSSFilter
 */
import { describe, it, expect } from 'vitest'
import { generateCSSFilter } from '../adjust'

describe('canvas/adjust', () => {
  describe('generateCSSFilter', () => {
    it('应该返回 "none" 当无调整', () => {
      expect(generateCSSFilter(0, 0)).toBe('none')
    })

    it('应该生成亮度滤镜', () => {
      expect(generateCSSFilter(50, 0)).toBe('brightness(150%)')
    })

    it('应该生成对比度滤镜', () => {
      expect(generateCSSFilter(0, 50)).toBe('contrast(150%)')
    })

    it('应该同时生成亮度和对比度滤镜', () => {
      const result = generateCSSFilter(50, 30)
      expect(result).toContain('brightness(150%)')
      expect(result).toContain('contrast(130%)')
    })

    it('应该处理负值', () => {
      expect(generateCSSFilter(-50, -50)).toBe('brightness(50%) contrast(50%)')
    })

    it('应该处理极限值', () => {
      expect(generateCSSFilter(100, 100)).toBe('brightness(200%) contrast(200%)')
      expect(generateCSSFilter(-100, -100)).toBe('brightness(0%) contrast(0%)')
    })
  })
})
