/**
 * Profile 状态管理 Store
 * 管理用户个人信息和头像
 */

import { create } from 'zustand';
import { profileService } from '@/services/api/profileService';
import type { UserProfile, ProfileUpdateInput } from '@/types/user';

interface ProfileState {
  // 状态
  profile: UserProfile | null;
  isLoading: boolean;
  isEditing: boolean;
  error: string | null;
  uploadProgress: number;

  // Actions
  loadProfile: () => Promise<void>;
  updateProfile: (data: ProfileUpdateInput) => Promise<void>;
  uploadAvatar: (file: File) => Promise<void>;
  deleteAvatar: () => Promise<void>;
  setEditing: (isEditing: boolean) => void;
  clearError: () => void;
  reset: () => void;
}

const initialState = {
  profile: null,
  isLoading: false,
  isEditing: false,
  error: null,
  uploadProgress: 0,
};

export const useProfileStore = create<ProfileState>((set, get) => ({
  ...initialState,

  /**
   * 加载用户 profile
   */
  loadProfile: async () => {
    try {
      set({ isLoading: true, error: null });
      const profile = await profileService.getProfile();
      set({ profile, isLoading: false });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '加载个人信息失败';
      set({ error: errorMessage, isLoading: false });
      console.error('Failed to load profile:', error);
    }
  },

  /**
   * 更新用户 profile
   * 使用乐观更新提升用户体验
   */
  updateProfile: async (data: ProfileUpdateInput) => {
    const { profile } = get();
    if (!profile) {
      set({ error: '请先加载个人信息' });
      return;
    }

    // 乐观更新：立即更新 UI
    const optimisticProfile: UserProfile = {
      ...profile,
      ...data,
      updatedAt: new Date(),
    };

    set({ profile: optimisticProfile, isLoading: true, error: null });

    try {
      // 调用 API 更新
      const updatedProfile = await profileService.updateProfile(data);
      set({
        profile: updatedProfile,
        isLoading: false,
        isEditing: false,
      });
    } catch (error) {
      // 更新失败，回滚到原始数据
      set({
        profile,
        isLoading: false,
        error: error instanceof Error ? error.message : '更新个人信息失败',
      });
      console.error('Failed to update profile:', error);
      throw error;
    }
  },

  /**
   * 上传头像
   */
  uploadAvatar: async (file: File) => {
    const { profile } = get();
    if (!profile) {
      set({ error: '请先加载个人信息' });
      return;
    }

    try {
      set({ isLoading: true, error: null, uploadProgress: 0 });

      // 模拟上传进度（实际进度由 Storage API 提供）
      const progressInterval = setInterval(() => {
        set((state) => ({
          uploadProgress: Math.min(state.uploadProgress + 10, 90),
        }));
      }, 200);

      // 上传头像
      const result = await profileService.uploadAvatar(file);

      clearInterval(progressInterval);

      // 更新 profile 中的头像 URL
      const updatedProfile: UserProfile = {
        ...profile,
        avatarUrl: result.url,
        updatedAt: new Date(),
      };

      set({
        profile: updatedProfile,
        isLoading: false,
        uploadProgress: 100,
      });

      // 重置进度
      setTimeout(() => {
        set({ uploadProgress: 0 });
      }, 1000);
    } catch (error) {
      set({
        isLoading: false,
        uploadProgress: 0,
        error: error instanceof Error ? error.message : '头像上传失败',
      });
      console.error('Failed to upload avatar:', error);
      throw error;
    }
  },

  /**
   * 删除头像
   */
  deleteAvatar: async () => {
    const { profile } = get();
    if (!profile) {
      set({ error: '请先加载个人信息' });
      return;
    }

    try {
      set({ isLoading: true, error: null });

      // 调用 API 删除
      await profileService.deleteAvatar();

      // 更新 profile，清空头像 URL
      const updatedProfile: UserProfile = {
        ...profile,
        avatarUrl: undefined,
        updatedAt: new Date(),
      };

      set({
        profile: updatedProfile,
        isLoading: false,
      });
    } catch (error) {
      set({
        isLoading: false,
        error: error instanceof Error ? error.message : '删除头像失败',
      });
      console.error('Failed to delete avatar:', error);
      throw error;
    }
  },

  /**
   * 设置编辑模式
   */
  setEditing: (isEditing: boolean) => {
    set({ isEditing, error: null });
  },

  /**
   * 清除错误信息
   */
  clearError: () => {
    set({ error: null });
  },

  /**
   * 重置状态
   */
  reset: () => {
    set(initialState);
  },
}));

