/**
 * Profile Service
 * 用户个人信息管理服务
 */

import { supabase } from '@/lib/supabase/client'
import { authService } from '@/lib/supabase/auth'
import type { UserProfile, ProfileUpdateInput, AvatarUploadResult } from '@/types/user'
import { compressImageToWebP } from '@/utils/imageCompressor'

/**
 * 获取当前用户的 profile
 */
export async function getProfile(): Promise<UserProfile | null> {
  try {
    // 获取当前用户
    const user = await authService.getCurrentUser()

    if (!user) {
      console.error('Failed to get current user')
      return null
    }

    // 从 profiles 表获取用户信息
    // 使用 maybeSingle() 避免在记录不存在时返回 406 错误
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .maybeSingle()

    if (error) {
      console.error('Failed to get profile:', error)
      return null
    }

    // 如果 profile 不存在，创建一个默认的
    if (!data) {
      const defaultProfile: Partial<UserProfile> = {
        id: user.id,
        email: user.email || '',
        fullName: user.user_metadata?.full_name || user.email?.split('@')[0] || 'User',
        createdAt: new Date(user.created_at),
        updatedAt: new Date(),
      }

      const { data: newProfile, error: insertError } = await supabase
        .from('profiles')
        .insert({
          id: user.id,
          email: user.email,
          full_name: defaultProfile.fullName,
          created_at: defaultProfile.createdAt,
          updated_at: defaultProfile.updatedAt,
        })
        .select()
        .single()

      if (insertError) {
        // 如果插入失败且是主键冲突（23505），说明记录已存在，重新查询
        if (insertError.code === '23505') {
          console.warn('Profile already exists, refetching...')
          const { data: existingProfile, error: refetchError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .maybeSingle()

          if (refetchError || !existingProfile) {
            console.error('Failed to refetch profile after conflict:', refetchError)
            return null
          }

          return mapDatabaseToProfile(existingProfile)
        }

        console.error('Failed to create default profile:', insertError)
        return null
      }

      return mapDatabaseToProfile(newProfile)
    }

    return mapDatabaseToProfile(data)
  } catch (error) {
    console.error('Error in getProfile:', error)
    return null
  }
}

/**
 * 更新用户 profile
 */
export async function updateProfile(input: ProfileUpdateInput): Promise<UserProfile> {
  try {
    // 获取当前用户
    const user = await authService.getCurrentUser()
    if (!user) {
      throw new Error('未登录或用户不存在')
    }

    // 更新 profiles 表
    const { data, error } = await supabase
      .from('profiles')
      .update({
        full_name: input.fullName,
        nickname: input.nickname || null,
        gender: input.gender || null,
        team: input.team || null,
        bio: input.bio || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', user.id)
      .select()
      .single()

    if (error) {
      console.error('Failed to update profile:', error)
      throw new Error('更新个人信息失败')
    }

    const profile = mapDatabaseToProfile(data)

    // 同步到 persons 表（用于人脸识别）
    await syncToPersons(profile).catch((err) => {
      console.warn('Failed to sync to persons table:', err)
      // 不阻塞主流程
    })

    return profile
  } catch (error) {
    console.error('Error in updateProfile:', error)
    throw error
  }
}

/**
 * 上传头像（使用 Supabase Storage）
 */
export async function uploadAvatar(file: File): Promise<AvatarUploadResult> {
  try {
    // 获取当前用户
    const user = await authService.getCurrentUser()
    if (!user) {
      throw new Error('未登录或用户不存在')
    }

    // 压缩图片到 400x400px WebP 格式
    const compressedBlob = await compressImageToWebP(file, 400, 0.85)

    // 转换为 File 对象
    const avatarFile = new File([compressedBlob], 'avatar.webp', {
      type: 'image/webp',
      lastModified: Date.now(),
    })

    // 上传到 Supabase Storage
    const { storageService } = await import('@/services/storage/supabaseStorage')
    const avatarPath = `${user.id}/avatar-${Date.now()}.webp`

    const result = await storageService.upload(avatarFile, avatarPath, 'avatars')

    if (!result.success || !result.publicUrl) {
      throw new Error(result.error || '上传头像失败')
    }

    console.log('✅ 头像上传成功:', result)

    // 更新 profiles 表中的 avatar_url
    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        avatar_url: result.publicUrl,
        updated_at: new Date().toISOString(),
      })
      .eq('id', user.id)

    if (updateError) {
      console.error('Failed to update avatar_url:', updateError)
      throw new Error('更新头像 URL 失败')
    }

    // 同步到 persons 表
    const profile = await getProfile()
    if (profile) {
      await syncToPersons(profile).catch((err) => {
        console.warn('Failed to sync avatar to persons table:', err)
      })
    }

    return {
      url: result.publicUrl,
      path: result.path || avatarPath,
    }
  } catch (error) {
    console.error('Error in uploadAvatar:', error)
    throw error
  }
}

/**
 * 删除头像（使用 Supabase Storage）
 */
export async function deleteAvatar(): Promise<void> {
  try {
    // 获取当前用户
    const user = await authService.getCurrentUser()
    if (!user) {
      throw new Error('未登录或用户不存在')
    }

    // 获取当前头像 URL，提取存储路径
    const profile = await getProfile()
    if (profile?.avatarUrl) {
      try {
        // 从 avatar_url 中提取存储路径
        // 示例: https://xxx.supabase.co/storage/v1/object/public/avatars/userId/avatar-123.webp
        const url = new URL(profile.avatarUrl)
        const pathMatch = url.pathname.match(/\/avatars\/(.+)$/)
        if (pathMatch) {
          const storagePath = pathMatch[1]
          const { storageService } = await import('@/services/storage/supabaseStorage')
          await storageService.delete([storagePath], 'avatars')
          console.log('✅ 已删除头像文件:', storagePath)
        }
      } catch (error) {
        console.warn('Failed to delete avatar from storage:', error)
        // 不阻塞主流程
      }
    }

    // 更新 profiles 表，清空 avatar_url
    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        avatar_url: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', user.id)

    if (updateError) {
      console.error('Failed to clear avatar_url:', updateError)
      throw new Error('删除头像失败')
    }

    // 同步到 persons 表
    const updatedProfile = await getProfile()
    if (updatedProfile) {
      await syncToPersons(updatedProfile).catch((err) => {
        console.warn('Failed to sync avatar deletion to persons table:', err)
      })
    }
  } catch (error) {
    console.error('Error in deleteAvatar:', error)
    throw error
  }
}

/**
 * 同步到 persons 表（用于人脸识别）
 */
export async function syncToPersons(profile: UserProfile): Promise<void> {
  try {
    // 检查是否存在 person 记录（通过 user_id 和 is_self）
    const { data: existingPerson, error: selectError } = await supabase
      .from('persons')
      .select('*')
      .eq('user_id', profile.id)
      .eq('is_self', true)
      .maybeSingle()

    if (selectError) {
      console.error('Failed to check existing person:', selectError)
      throw selectError
    }

    // 准备 person 数据
    const personData = {
      user_id: profile.id,
      name: profile.fullName,
      avatar: profile.avatarUrl || null,
      department: profile.team || 'Unknown',
      joined_at: profile.createdAt.toISOString(),
      is_self: true,
      updated_at: new Date().toISOString(),
    }

    if (existingPerson) {
      // 更新现有记录
      const { error: updateError } = await supabase
        .from('persons')
        .update(personData)
        .eq('id', existingPerson.id)

      if (updateError) {
        console.error('Failed to update person:', updateError)
        throw updateError
      }
    } else {
      // 创建新记录
      const { error: insertError } = await supabase.from('persons').insert({
        ...personData,
        created_at: new Date().toISOString(),
      })

      if (insertError) {
        console.error('Failed to create person:', insertError)
        throw insertError
      }
    }
  } catch (error) {
    console.error('Error in syncToPersons:', error)
    throw error
  }
}

/**
 * 将数据库记录映射为 UserProfile 类型
 */
function mapDatabaseToProfile(data: Record<string, unknown>): UserProfile {
  return {
    id: String(data.id ?? ''),
    email: String(data.email ?? ''),
    fullName: String(data.full_name ?? ''),
    nickname: data.nickname ? String(data.nickname) : undefined,
    gender: (data.gender as UserProfile['gender']) ?? undefined,
    team: data.team ? String(data.team) : undefined,
    avatarUrl: data.avatar_url ? String(data.avatar_url) : undefined,
    bio: data.bio ? String(data.bio) : undefined,
    createdAt: new Date(String(data.created_at)),
    updatedAt: new Date(String(data.updated_at)),
  }
}

/**
 * Profile Service 导出
 */
export const profileService = {
  getProfile,
  updateProfile,
  uploadAvatar,
  deleteAvatar,
  syncToPersons,
}
