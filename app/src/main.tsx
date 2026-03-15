/**
 * 应用入口 - 初始化主题、认证、MSW、数据服务并挂载 React 根组件
 */
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { startMSW } from './mocks/browser'
import { initMockData } from './mocks/data/initMockData'
import { GlobalConfirmDialog } from './components/ui/confirm-dialog'
import { Toaster } from './components/ui/toaster'
import { useAuthStore } from './stores/useAuthStore'
import { dataService } from './services/data'
import { initializeTheme } from './hooks/useTheme'

/**
 * 应用初始化
 *
 * 启动顺序：主题 → MSW（mock 模式）→ 认证 → 数据服务 → 渲染
 * MSW 必须先于认证初始化，否则 Supabase 客户端会向 placeholder 域名
 * 发起真实请求导致白屏。
 */
async function initApp() {
  // 0. 初始化主题（防止闪烁）
  initializeTheme()

  const enableMSW = import.meta.env.VITE_ENABLE_MSW === 'true'

  console.log('[Init] Environment:', {
    DEV: import.meta.env.DEV,
    MODE: import.meta.env.MODE,
    VITE_ENABLE_MSW: import.meta.env.VITE_ENABLE_MSW,
    enableMSW,
  })

  // 1. MSW 必须最先启动，确保后续所有 Supabase 请求都被拦截
  if (import.meta.env.DEV && enableMSW) {
    console.log('[Init] 🚀 开发环境 + MSW启用，准备启动 MSW...')
    await startMSW()
    await initMockData()
    console.log('[Init] ✅ MSW Mock 模式已启动')
  } else if (import.meta.env.DEV) {
    console.log('[Init] 🔗 开发环境，MSW已关闭，直接连接 Supabase 后端')
  }

  // 2. 初始化认证系统（MSW 已就绪，可安全调用 Supabase API）
  await useAuthStore.getState().initialize()

  // 3. 启动数据服务（仅在非MSW模式下）
  if (!enableMSW) {
    console.log('[Init] 🔄 启动数据服务...')

    try {
      await dataService.initialSync()
      console.log('[Init] ✅ 初始同步完成')
    } catch (error) {
      console.error('[Init] ⚠️  初始同步失败:', error)
    }

    dataService.subscribePersons((event) => {
      console.log('[Init] Realtime Person 事件:', event.type, event.data.id)
    })
    console.log('[Init] ✅ Realtime 订阅已启动')
  }

  // 4. 渲染React应用
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
      <GlobalConfirmDialog />
      <Toaster />
    </StrictMode>
  )
}

// 启动应用
initApp().catch(console.error)
