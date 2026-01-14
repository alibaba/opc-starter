/**
 * 表单验证 Schema
 * 使用 Zod 进行类型安全的表单验证
 */

import { z } from 'zod';

/**
 * Profile 表单验证 Schema
 */
export const profileSchema = z.object({
  fullName: z
    .string()
    .min(2, '姓名至少2个字符')
    .max(50, '姓名最多50个字符'),
  nickname: z
    .string()
    .min(2, '花名至少2个字符')
    .max(20, '花名最多20个字符')
    .optional()
    .or(z.literal('')),
  gender: z
    .enum(['male', 'female', 'other'])
    .optional(),
  team: z
    .string()
    .min(2, '团队名称至少2个字符')
    .max(50, '团队名称最多50个字符')
    .optional()
    .or(z.literal('')),
  bio: z
    .string()
    .max(200, '简介最多200个字符')
    .optional()
    .or(z.literal('')),
});

export type ProfileFormData = z.infer<typeof profileSchema>;

/**
 * 头像上传验证
 */
export const avatarValidation = {
  maxSize: 5 * 1024 * 1024, // 5MB
  minDimension: 200, // 最小 200x200px
  allowedTypes: ['image/jpeg', 'image/png', 'image/webp'],
  allowedExtensions: ['.jpg', '.jpeg', '.png', '.webp'],
};

/**
 * 验证头像文件
 */
export function validateAvatarFile(file: File): {
  valid: boolean;
  error?: string;
} {
  // 检查文件类型
  if (!avatarValidation.allowedTypes.includes(file.type)) {
    return {
      valid: false,
      error: '只支持 JPG、PNG、WebP 格式的图片',
    };
  }

  // 检查文件大小
  if (file.size > avatarValidation.maxSize) {
    return {
      valid: false,
      error: `文件大小不能超过 ${avatarValidation.maxSize / 1024 / 1024}MB`,
    };
  }

  return { valid: true };
}

/**
 * 验证图片尺寸
 */
export function validateImageDimensions(
  width: number,
  height: number
): {
  valid: boolean;
  error?: string;
} {
  if (width < avatarValidation.minDimension || height < avatarValidation.minDimension) {
    return {
      valid: false,
      error: `图片尺寸至少为 ${avatarValidation.minDimension}x${avatarValidation.minDimension}px`,
    };
  }

  return { valid: true };
}

