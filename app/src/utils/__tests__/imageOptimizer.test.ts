/**
 * imageOptimizer AI 服务约束配置测试
 */
import { describe, it, expect } from 'vitest'
import { AI_SERVICE_CONSTRAINTS, ImageOptimizer } from '../imageOptimizer'

describe('imageOptimizer', () => {
  describe('AI_SERVICE_CONSTRAINTS', () => {
    it('应该有 5 种服务类型', () => {
      const serviceTypes = Object.keys(AI_SERVICE_CONSTRAINTS)
      expect(serviceTypes).toHaveLength(5)
      expect(serviceTypes).toContain('i2v-single')
      expect(serviceTypes).toContain('i2v-multi')
      expect(serviceTypes).toContain('kf2v')
      expect(serviceTypes).toContain('emo')
      expect(serviceTypes).toContain('fusion')
    })

    it('i2v-single 约束应该正确', () => {
      const c = AI_SERVICE_CONSTRAINTS['i2v-single']
      expect(c.minDimension).toBe(300)
      expect(c.maxDimension).toBe(2048)
      expect(c.maxFileSize).toBe(10 * 1024 * 1024)
      expect(c.supportedFormats).toContain('image/jpeg')
      expect(c.supportedFormats).toContain('image/png')
      expect(c.supportedFormats).toContain('image/webp')
    })

    it('emo 约束应该更严格', () => {
      const c = AI_SERVICE_CONSTRAINTS['emo']
      expect(c.minDimension).toBe(256)
      expect(c.maxDimension).toBe(1024) // 比其他服务小
      expect(c.maxFileSize).toBe(5 * 1024 * 1024) // 5MB
      expect(c.supportedFormats).not.toContain('image/webp') // 不支持 webp
    })

    it('所有服务都应该有 maxFileSize', () => {
      for (const [, constraint] of Object.entries(AI_SERVICE_CONSTRAINTS)) {
        expect(constraint.maxFileSize).toBeGreaterThan(0)
      }
    })

    it('所有服务都应该有 supportedFormats', () => {
      for (const [, constraint] of Object.entries(AI_SERVICE_CONSTRAINTS)) {
        expect(constraint.supportedFormats!.length).toBeGreaterThan(0)
      }
    })

    it('fusion 约束应该正确', () => {
      const c = AI_SERVICE_CONSTRAINTS['fusion']
      expect(c.minDimension).toBe(256)
      expect(c.maxDimension).toBe(2048)
      expect(c.maxFileSize).toBe(10 * 1024 * 1024)
    })
  })

  describe('ImageOptimizer 类', () => {
    it('应该能创建实例', () => {
      const optimizer = new ImageOptimizer()
      expect(optimizer).toBeDefined()
      expect(typeof optimizer.optimize).toBe('function')
      expect(typeof optimizer.optimizeBatch).toBe('function')
      expect(typeof optimizer.previewOptimization).toBe('function')
    })
  })

  describe('optimize 错误处理', () => {
    it('应该在图片加载失败时返回错误结果', async () => {
      const optimizer = new ImageOptimizer()

      // Mock Image to trigger onerror immediately
      const OriginalImage = globalThis.Image
      globalThis.Image = class MockImage {
        crossOrigin = ''
        onload: (() => void) | null = null
        onerror: (() => void) | null = null
        private _src = ''
        get src() {
          return this._src
        }
        set src(val: string) {
          this._src = val
          // Trigger error asynchronously
          setTimeout(() => this.onerror?.(), 0)
        }
        get width() {
          return 0
        }
        get height() {
          return 0
        }
      } as unknown as typeof Image

      try {
        const result = await optimizer.optimize('invalid-source', {
          serviceType: 'i2v-single',
        })
        expect(result.success).toBe(false)
        expect(result.error).toBeDefined()
      } finally {
        globalThis.Image = OriginalImage
      }
    })
  })
})
