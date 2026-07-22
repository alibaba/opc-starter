/**
 * ProfileForm Component
 * 个人信息表单组件 - 使用 react-hook-form + Zod 验证
 */

import { useEffect, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { format } from 'date-fns'
import { Loader2, Edit, Save, X } from 'lucide-react'
import { useProfileStore } from '@/stores/useProfileStore'
import { createProfileSchema, type ProfileFormData } from '@/types/validation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { useUIStore } from '@/stores/useUIStore'

interface ProfileFormProps {
  className?: string
}

export function ProfileForm({ className = '' }: ProfileFormProps) {
  const { t, i18n } = useTranslation('components')
  const { t: tCommon } = useTranslation('common')
  const { profile, isEditing, isLoading, updateProfile, setEditing } = useProfileStore()
  const { showToast } = useUIStore()

  // 依赖 i18n.language：语言切换时重建 schema，保证校验错误文案跟随语言
  const profileSchema = useMemo(() => createProfileSchema(t), [t, i18n.language])

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      fullName: profile?.fullName || '',
      nickname: profile?.nickname || '',
      gender: profile?.gender,
      team: profile?.team || '',
      bio: profile?.bio || '',
    },
  })

  // 当 profile 加载完成后，更新表单默认值
  useEffect(() => {
    if (profile) {
      reset({
        fullName: profile.fullName,
        nickname: profile.nickname || '',
        gender: profile.gender,
        team: profile.team || '',
        bio: profile.bio || '',
      })
    }
  }, [profile, reset])

  /**
   * 处理表单提交
   */
  const onSubmit = async (data: ProfileFormData) => {
    try {
      await updateProfile(data)
      showToast(t('profileForm.updateSuccess'), 'success')
      setEditing(false)
    } catch (error) {
      showToast(error instanceof Error ? error.message : t('profileForm.updateFailed'), 'error')
    }
  }

  /**
   * 处理取消编辑
   */
  const handleCancel = () => {
    reset()
    setEditing(false)
  }

  /**
   * 处理进入编辑模式
   */
  const handleEdit = () => {
    setEditing(true)
  }

  if (!profile) {
    return (
      <div className={`flex items-center justify-center p-8 ${className}`}>
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className={`bg-card rounded-lg shadow-sm border p-6 ${className}`}>
      {/* 表单头部 */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold">{t('profileForm.title')}</h2>
        {!isEditing && (
          <Button onClick={handleEdit} variant="outline" size="sm">
            <Edit className="w-4 h-4 mr-2" />
            {t('profileForm.edit')}
          </Button>
        )}
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* 邮箱（只读） */}
        <div>
          <label className="block text-sm font-medium text-foreground mb-2">
            {t('profileForm.email')}
          </label>
          <Input value={profile.email} disabled className="bg-muted" />
          <p className="text-xs text-muted-foreground mt-1">{t('profileForm.emailReadonly')}</p>
        </div>

        {/* 注册时间（只读） */}
        <div>
          <label className="block text-sm font-medium text-foreground mb-2">
            {t('profileForm.registeredAt')}
          </label>
          <Input
            value={format(profile.createdAt, 'yyyy-MM-dd HH:mm:ss')}
            disabled
            className="bg-muted"
          />
        </div>

        {/* 真实姓名（必填） */}
        <div>
          <label className="block text-sm font-medium text-foreground mb-2">
            {t('profileForm.fullNameRequired')}
          </label>
          <Input
            {...register('fullName')}
            disabled={!isEditing}
            placeholder={t('profileForm.fullNamePlaceholder')}
            className={!isEditing ? 'bg-muted' : ''}
          />
          {errors.fullName && (
            <p className="text-sm text-destructive mt-1">{errors.fullName.message}</p>
          )}
        </div>

        {/* 花名（可选） */}
        <div>
          <label className="block text-sm font-medium text-foreground mb-2">
            {t('profileForm.nickname')}
          </label>
          <Input
            {...register('nickname')}
            disabled={!isEditing}
            placeholder={t('profileForm.nicknamePlaceholder')}
            className={!isEditing ? 'bg-muted' : ''}
          />
          {errors.nickname && (
            <p className="text-sm text-destructive mt-1">{errors.nickname.message}</p>
          )}
        </div>

        {/* 性别（可选） */}
        <div>
          <label className="block text-sm font-medium text-foreground mb-2">
            {t('profileForm.gender')}
          </label>
          <div className="flex gap-4">
            <label className="flex items-center">
              <input
                type="radio"
                value="male"
                {...register('gender')}
                disabled={!isEditing}
                className="mr-2"
              />
              <span className={!isEditing ? 'text-muted-foreground' : ''}>
                {t('profileForm.genderMale')}
              </span>
            </label>
            <label className="flex items-center">
              <input
                type="radio"
                value="female"
                {...register('gender')}
                disabled={!isEditing}
                className="mr-2"
              />
              <span className={!isEditing ? 'text-muted-foreground' : ''}>
                {t('profileForm.genderFemale')}
              </span>
            </label>
            <label className="flex items-center">
              <input
                type="radio"
                value="other"
                {...register('gender')}
                disabled={!isEditing}
                className="mr-2"
              />
              <span className={!isEditing ? 'text-muted-foreground' : ''}>
                {t('profileForm.genderOther')}
              </span>
            </label>
          </div>
          {errors.gender && (
            <p className="text-sm text-destructive mt-1">{errors.gender.message}</p>
          )}
        </div>

        {/* 所在团队（可选） */}
        <div>
          <label className="block text-sm font-medium text-foreground mb-2">
            {t('profileForm.team')}
          </label>
          <Input
            {...register('team')}
            disabled={!isEditing}
            placeholder={t('profileForm.teamPlaceholder')}
            className={!isEditing ? 'bg-muted' : ''}
          />
          {errors.team && <p className="text-sm text-destructive mt-1">{errors.team.message}</p>}
        </div>

        {/* 个人简介（可选） */}
        <div>
          <label className="block text-sm font-medium text-foreground mb-2">
            {t('profileForm.bio')}
          </label>
          <Textarea
            {...register('bio')}
            disabled={!isEditing}
            placeholder={t('profileForm.bioPlaceholder')}
            rows={4}
            className={!isEditing ? 'bg-muted' : ''}
          />
          {errors.bio && <p className="text-sm text-destructive mt-1">{errors.bio.message}</p>}
        </div>

        {/* 操作按钮 */}
        {isEditing && (
          <div className="flex gap-3 pt-4">
            <Button type="submit" disabled={isLoading || !isDirty} className="flex-1">
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {t('profileForm.saving')}
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  {t('profileForm.save')}
                </>
              )}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={handleCancel}
              disabled={isLoading}
              className="flex-1"
            >
              <X className="w-4 h-4 mr-2" />
              {tCommon('cancel')}
            </Button>
          </div>
        )}
      </form>
    </div>
  )
}
