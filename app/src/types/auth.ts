/**
 * 认证相关类型定义
 */

export interface LoginFormData {
  email: string;
  password: string;
}

export interface RegisterFormData {
  email: string;
  password: string;
  confirmPassword: string;
  displayName: string;
}

export interface AuthError {
  message: string;
  code?: string;
}

