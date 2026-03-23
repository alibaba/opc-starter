/**
 * 表单验证 Schema 测试
 */
import { describe, it, expect } from 'vitest'
import {
  profileSchema,
  avatarValidation,
  validateAvatarFile,
  validateImageDimensions,
} from '../validation'

describe('types/validation', () => {
  describe('profileSchema', () => {
    it('应该验证有效的 profile 数据', () => {
      const validData = {
        fullName: '张三',
        nickname: '小张',
        gender: 'male' as const,
        team: '技术部',
        bio: '这是一个简介',
      }

      const result = profileSchema.safeParse(validData)
      expect(result.success).toBe(true)
    })

    it('应该拒绝姓名字符过少', () => {
      const invalidData = {
        fullName: '张',
      }

      const result = profileSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })

    it('应该拒绝姓名字符过多', () => {
      const invalidData = {
        fullName: '张'.repeat(51),
      }

      const result = profileSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })

    it('应该允许空可选字段', () => {
      const data = {
        fullName: '张三',
        nickname: '',
        bio: '',
      }

      const result = profileSchema.safeParse(data)
      expect(result.success).toBe(true)
    })

    it('应该验证性别枚举值', () => {
      const validGenders = ['male', 'female', 'other']

      for (const gender of validGenders) {
        const result = profileSchema.safeParse({
          fullName: '张三',
          gender,
        })
        expect(result.success).toBe(true)
      }
    })

    it('应该拒绝无效的性别值', () => {
      const result = profileSchema.safeParse({
        fullName: '张三',
        gender: 'invalid',
      })
      expect(result.success).toBe(false)
    })
  })

  describe('avatarValidation', () => {
    it('应该有正确的配置值', () => {
      expect(avatarValidation.maxSize).toBe(5 * 1024 * 1024) // 5MB
      expect(avatarValidation.minDimension).toBe(200)
      expect(avatarValidation.allowedTypes).toContain('image/jpeg')
      expect(avatarValidation.allowedTypes).toContain('image/png')
      expect(avatarValidation.allowedTypes).toContain('image/webp')
    })

    it('应该包含正确的扩展名', () => {
      expect(avatarValidation.allowedExtensions).toContain('.jpg')
      expect(avatarValidation.allowedExtensions).toContain('.jpeg')
      expect(avatarValidation.allowedExtensions).toContain('.png')
      expect(avatarValidation.allowedExtensions).toContain('.webp')
    })
  })

  describe('validateAvatarFile', () => {
    it('应该接受有效的头像文件', () => {
      const file = new File([''], 'avatar.jpg', { type: 'image/jpeg' })
      Object.defineProperty(file, 'size', { value: 1024 * 1024 }) // 1MB

      const result = validateAvatarFile(file)
      expect(result.valid).toBe(true)
      expect(result.error).toBeUndefined()
    })

    it('应该拒绝无效的文件类型', () => {
      const file = new File([''], 'avatar.gif', { type: 'image/gif' })

      const result = validateAvatarFile(file)
      expect(result.valid).toBe(false)
      expect(result.error).toContain('JPG、PNG、WebP')
    })

    it('应该拒绝过大的文件', () => {
      const file = new File([''], 'avatar.jpg', { type: 'image/jpeg' })
      Object.defineProperty(file, 'size', { value: 10 * 1024 * 1024 }) // 10MB

      const result = validateAvatarFile(file)
      expect(result.valid).toBe(false)
      expect(result.error).toContain('不能超过')
    })

    it('应该接受 PNG 文件', () => {
      const file = new File([''], 'avatar.png', { type: 'image/png' })
      Object.defineProperty(file, 'size', { value: 1024 * 1024 })

      const result = validateAvatarFile(file)
      expect(result.valid).toBe(true)
    })

    it('应该接受 WebP 文件', () => {
      const file = new File([''], 'avatar.webp', { type: 'image/webp' })
      Object.defineProperty(file, 'size', { value: 1024 * 1024 })

      const result = validateAvatarFile(file)
      expect(result.valid).toBe(true)
    })
  })

  describe('validateImageDimensions', () => {
    it('应该接受有效的尺寸', () => {
      const result = validateImageDimensions(500, 500)
      expect(result.valid).toBe(true)
      expect(result.error).toBeUndefined()
    })

    it('应该接受最小尺寸', () => {
      const result = validateImageDimensions(200, 200)
      expect(result.valid).toBe(true)
    })

    it('应该拒绝过小的宽度', () => {
      const result = validateImageDimensions(100, 500)
      expect(result.valid).toBe(false)
      expect(result.error).toContain('200')
    })

    it('应该拒绝过小的高度', () => {
      const result = validateImageDimensions(500, 100)
      expect(result.valid).toBe(false)
      expect(result.error).toContain('200')
    })

    it('应该拒绝过小的宽高', () => {
      const result = validateImageDimensions(100, 100)
      expect(result.valid).toBe(false)
    })
  })
})
