/**
 * 认证状态管理 Store
 */
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { authService } from '@/lib/supabase/auth';
import type { User } from '@supabase/supabase-js';
import type { AuthError } from '@/types/auth';

interface AuthState {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  error: AuthError | null;

  // Actions
  signUp: (email: string, password: string, displayName?: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  initialize: () => Promise<void>;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isLoading: true,
      isAuthenticated: false,
      error: null,

      /**
       * 初始化认证状态
       */
      initialize: async () => {
        try {
          set({ isLoading: true });
          const user = await authService.getCurrentUser();
          set({
            user,
            isAuthenticated: !!user,
            isLoading: false,
          });

          // 监听认证状态变化
          authService.onAuthStateChange((user) => {
            set({
              user,
              isAuthenticated: !!user,
            });
          });
        } catch {
          set({
            error: {
              message: '初始化认证失败',
            },
            isLoading: false,
          });
        }
      },

      /**
       * 用户注册
       */
      signUp: async (email, password, displayName) => {
        try {
          set({ isLoading: true, error: null });
          const { user, error } = await authService.signUp({
            email,
            password,
            displayName,
          });

          if (error) {
            set({
              error: { message: error.message, code: error.code },
              isLoading: false,
            });
            return;
          }

          set({
            user,
            isAuthenticated: !!user,
            isLoading: false,
          });
        } catch {
          set({
            error: {
              message: '注册过程中发生意外错误',
            },
            isLoading: false,
          });
        }
      },

      /**
       * 用户登录
       */
      signIn: async (email, password) => {
        try {
          set({ isLoading: true, error: null });
          const { user, error } = await authService.signIn({ email, password });

          if (error) {
            set({
              error: { message: error.message, code: error.code },
              isLoading: false,
            });
            return;
          }

          set({
            user,
            isAuthenticated: !!user,
            isLoading: false,
          });
        } catch {
          set({
            error: {
              message: '登录过程中发生意外错误',
            },
            isLoading: false,
          });
        }
      },

      /**
       * 用户登出
       */
      signOut: async () => {
        try {
          set({ isLoading: true, error: null });
          const { error } = await authService.signOut();

          if (error) {
            set({
              error: { message: error.message },
              isLoading: false,
            });
            return;
          }

          set({
            user: null,
            isAuthenticated: false,
            isLoading: false,
          });
        } catch {
          set({
            error: {
              message: '登出过程中发生意外错误',
            },
            isLoading: false,
          });
        }
      },

      /**
       * 清除错误信息
       */
      clearError: () => set({ error: null }),
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);