/**
 * Supabase 相关类型定义
 */
import type { User } from '@supabase/supabase-js';

export interface AuthUser extends User {
  display_name?: string;
}

export interface AuthState {
  user: AuthUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

