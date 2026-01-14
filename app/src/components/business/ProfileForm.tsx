/**
 * ProfileForm Component
 * 个人信息表单组件 - 使用 react-hook-form + Zod 验证
 */

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { format } from 'date-fns';
import { Loader2, Edit, Save, X } from 'lucide-react';
import { useProfileStore } from '@/stores/useProfileStore';
import { profileSchema, type ProfileFormData } from '@/types/validation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useUIStore } from '@/stores/useUIStore';

interface ProfileFormProps {
  className?: string;
}

export function ProfileForm({ className = '' }: ProfileFormProps) {
  const { profile, isEditing, isLoading, updateProfile, setEditing } = useProfileStore();
  const { showToast } = useUIStore();

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
  });

  // 当 profile 加载完成后，更新表单默认值
  useEffect(() => {
    if (profile) {
      reset({
        fullName: profile.fullName,
        nickname: profile.nickname || '',
        gender: profile.gender,
        team: profile.team || '',
        bio: profile.bio || '',
      });
    }
  }, [profile, reset]);

  /**
   * 处理表单提交
   */
  const onSubmit = async (data: ProfileFormData) => {
    try {
      await updateProfile(data);
      showToast('个人信息更新成功', 'success');
      setEditing(false);
    } catch (error) {
      showToast(error instanceof Error ? error.message : '更新失败', 'error');
    }
  };

  /**
   * 处理取消编辑
   */
  const handleCancel = () => {
    reset();
    setEditing(false);
  };

  /**
   * 处理进入编辑模式
   */
  const handleEdit = () => {
    setEditing(true);
  };

  if (!profile) {
    return (
      <div className={`flex items-center justify-center p-8 ${className}`}>
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className={`bg-card rounded-lg shadow-sm border p-6 ${className}`}>
      {/* 表单头部 */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold">个人信息</h2>
        {!isEditing && (
          <Button onClick={handleEdit} variant="outline" size="sm">
            <Edit className="w-4 h-4 mr-2" />
            编辑
          </Button>
        )}
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* 邮箱（只读） */}
        <div>
          <label className="block text-sm font-medium text-foreground mb-2">
            邮箱
          </label>
          <Input
            value={profile.email}
            disabled
            className="bg-muted"
          />
          <p className="text-xs text-muted-foreground mt-1">邮箱不可修改</p>
        </div>

        {/* 注册时间（只读） */}
        <div>
          <label className="block text-sm font-medium text-foreground mb-2">
            注册时间
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
            真实姓名 <span className="text-destructive">*</span>
          </label>
          <Input
            {...register('fullName')}
            disabled={!isEditing}
            placeholder="请输入真实姓名"
            className={!isEditing ? 'bg-muted' : ''}
          />
          {errors.fullName && (
            <p className="text-sm text-destructive mt-1">{errors.fullName.message}</p>
          )}
        </div>

        {/* 花名（可选） */}
        <div>
          <label className="block text-sm font-medium text-foreground mb-2">
            花名
          </label>
          <Input
            {...register('nickname')}
            disabled={!isEditing}
            placeholder="请输入花名"
            className={!isEditing ? 'bg-muted' : ''}
          />
          {errors.nickname && (
            <p className="text-sm text-destructive mt-1">{errors.nickname.message}</p>
          )}
        </div>

        {/* 性别（可选） */}
        <div>
          <label className="block text-sm font-medium text-foreground mb-2">
            性别
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
              <span className={!isEditing ? 'text-muted-foreground' : ''}>男</span>
            </label>
            <label className="flex items-center">
              <input
                type="radio"
                value="female"
                {...register('gender')}
                disabled={!isEditing}
                className="mr-2"
              />
              <span className={!isEditing ? 'text-muted-foreground' : ''}>女</span>
            </label>
            <label className="flex items-center">
              <input
                type="radio"
                value="other"
                {...register('gender')}
                disabled={!isEditing}
                className="mr-2"
              />
              <span className={!isEditing ? 'text-muted-foreground' : ''}>其他</span>
            </label>
          </div>
          {errors.gender && (
            <p className="text-sm text-destructive mt-1">{errors.gender.message}</p>
          )}
        </div>

        {/* 所在团队（可选） */}
        <div>
          <label className="block text-sm font-medium text-foreground mb-2">
            所在团队
          </label>
          <Input
            {...register('team')}
            disabled={!isEditing}
            placeholder="请输入所在团队"
            className={!isEditing ? 'bg-muted' : ''}
          />
          {errors.team && (
            <p className="text-sm text-destructive mt-1">{errors.team.message}</p>
          )}
        </div>

        {/* 个人简介（可选） */}
        <div>
          <label className="block text-sm font-medium text-foreground mb-2">
            个人简介
          </label>
          <Textarea
            {...register('bio')}
            disabled={!isEditing}
            placeholder="请输入个人简介（最多200字）"
            rows={4}
            className={!isEditing ? 'bg-muted' : ''}
          />
          {errors.bio && (
            <p className="text-sm text-destructive mt-1">{errors.bio.message}</p>
          )}
        </div>

        {/* 操作按钮 */}
        {isEditing && (
          <div className="flex gap-3 pt-4">
            <Button
              type="submit"
              disabled={isLoading || !isDirty}
              className="flex-1"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  保存中...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  保存
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
              取消
            </Button>
          </div>
        )}
      </form>
    </div>
  );
}
