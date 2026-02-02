/**
 * Supabase 认证服务封装
 */
import { supabase } from './client';
import type { AuthError, User } from '@supabase/supabase-js';

// 简单的内存缓存，避免重复触发 /auth/v1/user
const CACHE_TTL_MS = 30_000;
let cachedUser: User | null = null;
let lastFetchedAt = 0;
let inflightPromise: Promise<User | null> | null = null;

export interface SignUpCredentials {
  email: string;
  password: string;
  displayName?: string;
}

export interface SignInCredentials {
  email: string;
  password: string;
}

export interface AuthResponse {
  user: User | null;
  error: AuthError | null;
}

export const authService = {
  /**
   * 用户注册
   */
  async signUp({ email, password, displayName }: SignUpCredentials): Promise<AuthResponse> {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          display_name: displayName,
        },
      },
    });

    return {
      user: data.user,
      error,
    };
  },

  /**
   * 用户登录
   */
  async signIn({ email, password }: SignInCredentials): Promise<AuthResponse> {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    return {
      user: data.user,
      error,
    };
  },

  /**
   * 用户登出
   */
  async signOut(): Promise<{ error: AuthError | null }> {
    const { error } = await supabase.auth.signOut();
    return { error };
  },

  /**
   * 获取当前用户
   */
  async getCurrentUser(forceRefresh = false): Promise<User | null> {
    const now = Date.now();

    if (!forceRefresh && cachedUser && now - lastFetchedAt < CACHE_TTL_MS) {
      return cachedUser;
    }

    if (!forceRefresh && inflightPromise) {
      return inflightPromise;
    }

    inflightPromise = supabase.auth.getUser().then(({ data }) => {
      cachedUser = data.user ?? null;
      lastFetchedAt = Date.now();
      inflightPromise = null;
      return cachedUser;
    }).catch((err) => {
      inflightPromise = null;
      throw err;
    });

    return inflightPromise;
  },

  /**
   * 获取当前会话
   */
  async getSession() {
    const { data } = await supabase.auth.getSession();
    return data.session;
  },

  /**
   * 监听认证状态变化
   */
  onAuthStateChange(callback: (user: User | null) => void) {
    return supabase.auth.onAuthStateChange((_event, session) => {
      callback(session?.user ?? null);
    });
  },
};

