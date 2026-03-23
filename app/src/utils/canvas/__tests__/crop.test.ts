/**
 * Canvas crop 工具函数测试 - 纯函数
 */
import { describe, it, expect } from 'vitest'
import { createCropArea, calculateCropDimensions } from '../crop'

describe('canvas/crop', () => {
  describe('createCropArea', () => {
    it('应该四舍五入并创建裁剪区域', () => {
      const result = createCropArea({
        x: 10.6,
        y: 20.3,
        width: 100.7,
        height: 200.2,
      })

      expect(result.x).toBe(11)
      expect(result.y).toBe(20)
      expect(result.width).toBe(101)
      expect(result.height).toBe(200)
    })

    it('应该处理整数值', () => {
      const result = createCropArea({
        x: 0,
        y: 0,
        width: 500,
        height: 300,
      })

      expect(result).toEqual({ x: 0, y: 0, width: 500, height: 300 })
    })
  })

  describe('calculateCropDimensions', () => {
    it('无宽高比时返回原始尺寸', () => {
      const result = calculateCropDimensions(800, 600)
      expect(result).toEqual({ width: 800, height: 600 })
    })

    it('宽图裁剪为 1:1 时以高度为基准', () => {
      const result = calculateCropDimensions(800, 600, 1)
      expect(result.width).toBe(600)
      expect(result.height).toBe(600)
    })

    it('高图裁剪为 1:1 时以宽度为基准', () => {
      const result = calculateCropDimensions(600, 800, 1)
      expect(result.width).toBe(600)
      expect(result.height).toBe(600)
    })

    it('应该正确计算 16:9 裁剪', () => {
      const result = calculateCropDimensions(1920, 1080, 16 / 9)
      expect(result.width).toBe(1920)
      expect(result.height).toBe(1080)
    })

    it('应该正确计算 4:3 裁剪（宽图）', () => {
      const result = calculateCropDimensions(1920, 1080, 4 / 3)
      // 原始比例 > 4/3，以高度为基准
      expect(result.height).toBe(1080)
      expect(result.width).toBeCloseTo(1440, 0)
    })

    it('应该正确计算 3:4 裁剪（宽图）', () => {
      const result = calculateCropDimensions(1920, 1080, 3 / 4)
      // 原始比例 > 3/4，以高度为基准
      expect(result.height).toBe(1080)
      expect(result.width).toBeCloseTo(810, 0)
    })

    it('传入 undefined 宽高比时返回原始尺寸', () => {
      const result = calculateCropDimensions(800, 600, undefined)
      expect(result).toEqual({ width: 800, height: 600 })
    })
  })
})
