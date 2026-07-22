/**
 * 表单验证 Schema
 * 使用 Zod 进行类型安全的表单验证
 */

import { z } from 'zod'
import type { TFunction } from 'i18next'
import i18n from '@/lib/i18n'

/**
 * Profile 表单验证 Schema
 */
export function createProfileSchema(t: TFunction<'components'>) {
  return z.object({
    fullName: z.string().min(2, t('validation.fullNameMin')).max(50, t('validation.fullNameMax')),
    nickname: z
      .string()
      .min(2, t('validation.nicknameMin'))
      .max(20, t('validation.nicknameMax'))
      .optional()
      .or(z.literal('')),
    gender: z.enum(['male', 'female', 'other']).optional(),
    team: z
      .string()
      .min(2, t('validation.teamMin'))
      .max(50, t('validation.teamMax'))
      .optional()
      .or(z.literal('')),
    bio: z.string().max(200, t('validation.bioMax')).optional().or(z.literal('')),
  })
}

export type ProfileFormData = z.infer<ReturnType<typeof createProfileSchema>>

/**
 * 头像上传验证
 */
export const avatarValidation = {
  maxSize: 5 * 1024 * 1024, // 5MB
  minDimension: 200, // 最小 200x200px
  allowedTypes: ['image/jpeg', 'image/png', 'image/webp'],
  allowedExtensions: ['.jpg', '.jpeg', '.png', '.webp'],
}

/**
 * 验证头像文件
 */
export function validateAvatarFile(file: File): {
  valid: boolean
  error?: string
} {
  // 检查文件类型
  if (!avatarValidation.allowedTypes.includes(file.type)) {
    return {
      valid: false,
      error: i18n.t('validation.avatarType', { ns: 'components' }),
    }
  }

  // 检查文件大小
  if (file.size > avatarValidation.maxSize) {
    return {
      valid: false,
      error: i18n.t('validation.avatarSize', {
        ns: 'components',
        size: avatarValidation.maxSize / 1024 / 1024,
      }),
    }
  }

  return { valid: true }
}

/**
 * 验证图片尺寸
 */
export function validateImageDimensions(
  width: number,
  height: number
): {
  valid: boolean
  error?: string
} {
  if (width < avatarValidation.minDimension || height < avatarValidation.minDimension) {
    return {
      valid: false,
      error: i18n.t('validation.avatarDimension', {
        ns: 'components',
        size: avatarValidation.minDimension,
      }),
    }
  }

  return { valid: true }
}
