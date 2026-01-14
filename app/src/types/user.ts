/**
 * 用户相关类型定义
 */

export interface UserProfile {
  id: string;                    // UUID from auth.users
  email: string;                 // 邮箱（来自 auth.users）
  fullName: string;              // 真实姓名
  nickname?: string;             // 花名
  gender?: 'male' | 'female' | 'other';  // 性别
  team?: string;                 // 所在团队
  avatarUrl?: string;            // 头像 URL
  bio?: string;                  // 个人简介
  createdAt: Date;               // 注册时间
  updatedAt: Date;               // 更新时间
}

export interface ProfileUpdateInput {
  fullName: string;
  nickname?: string;
  gender?: 'male' | 'female' | 'other';
  team?: string;
  bio?: string;
}

export interface AvatarUploadResult {
  url: string;                   // 头像 URL
  path: string;                  // Storage 路径
}

export interface UserPreferences {
  theme: 'light' | 'dark' | 'auto';
  language: string;
  enableNotifications: boolean;
}

