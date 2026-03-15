/**
 * Supabase 客户端初始化
 *
 * MSW Mock 模式下禁用 autoRefreshToken，避免客户端在 Service Worker
 * 就绪前向 placeholder 域名发起真实网络请求导致白屏。
 */
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY
const isMSWMode = import.meta.env.VITE_ENABLE_MSW === 'true'

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Missing Supabase environment variables. Auth features will be disabled.')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: !isMSWMode,
    detectSessionInUrl: !isMSWMode,
    storage: localStorage,
  },
})
