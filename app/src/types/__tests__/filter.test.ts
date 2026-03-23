/**
 * Filter 类型定义测试
 */
import { describe, it, expect } from 'vitest'
import { FILTERS, type FilterType, type FilterConfig } from '../filter'

describe('types/filter', () => {
  describe('FILTERS', () => {
    it('应该包含所有滤镜类型', () => {
      const expectedFilters: FilterType[] = [
        'original',
        'grayscale',
        'sepia',
        'vintage',
        'warm',
        'cool',
        'film',
        'dramatic',
        'fade',
        'invert',
        'high-contrast',
        'vibrant',
      ]

      expect(FILTERS).toHaveLength(expectedFilters.length)

      for (const filter of FILTERS) {
        expect(expectedFilters).toContain(filter.id)
      }
    })

    it('每个滤镜应该有正确的结构', () => {
      for (const filter of FILTERS) {
        expect(filter).toHaveProperty('id')
        expect(filter).toHaveProperty('name')
        expect(filter).toHaveProperty('cssFilter')
        expect(typeof filter.id).toBe('string')
        expect(typeof filter.name).toBe('string')
        expect(typeof filter.cssFilter).toBe('string')
      }
    })

    it('原图滤镜应该无效果', () => {
      const original = FILTERS.find((f) => f.id === 'original')
      expect(original).toBeDefined()
      expect(original?.cssFilter).toBe('none')
      expect(original?.name).toBe('原图')
    })

    it('黑白滤镜应该使用 grayscale', () => {
      const grayscale = FILTERS.find((f) => f.id === 'grayscale')
      expect(grayscale).toBeDefined()
      expect(grayscale?.cssFilter).toContain('grayscale')
    })

    it('怀旧滤镜应该使用 sepia', () => {
      const sepia = FILTERS.find((f) => f.id === 'sepia')
      expect(sepia).toBeDefined()
      expect(sepia?.cssFilter).toContain('sepia')
    })

    it('反色滤镜应该使用 invert', () => {
      const invert = FILTERS.find((f) => f.id === 'invert')
      expect(invert).toBeDefined()
      expect(invert?.cssFilter).toContain('invert')
    })

    it('高对比滤镜应该使用 contrast', () => {
      const highContrast = FILTERS.find((f) => f.id === 'high-contrast')
      expect(highContrast).toBeDefined()
      expect(highContrast?.cssFilter).toContain('contrast')
    })

    it('鲜艳滤镜应该使用 saturate', () => {
      const vibrant = FILTERS.find((f) => f.id === 'vibrant')
      expect(vibrant).toBeDefined()
      expect(vibrant?.cssFilter).toContain('saturate')
    })

    it('暖色滤镜应该使用 hue-rotate', () => {
      const warm = FILTERS.find((f) => f.id === 'warm')
      expect(warm).toBeDefined()
      expect(warm?.cssFilter).toContain('hue-rotate')
    })

    it('冷色滤镜应该使用 hue-rotate', () => {
      const cool = FILTERS.find((f) => f.id === 'cool')
      expect(cool).toBeDefined()
      expect(cool?.cssFilter).toContain('hue-rotate')
    })
  })

  describe('FilterConfig 类型', () => {
    it('应该允许创建有效的滤镜配置', () => {
      const config: FilterConfig = {
        id: 'original',
        name: '测试滤镜',
        cssFilter: 'brightness(150%)',
        icon: 'test-icon',
      }

      expect(config.id).toBe('original')
      expect(config.name).toBe('测试滤镜')
      expect(config.cssFilter).toBe('brightness(150%)')
      expect(config.icon).toBe('test-icon')
    })

    it('icon 应该是可选的', () => {
      const config: FilterConfig = {
        id: 'original',
        name: '测试滤镜',
        cssFilter: 'none',
      }

      expect(config.icon).toBeUndefined()
    })
  })
})
