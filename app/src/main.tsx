import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { startMSW } from './mocks/browser'
import { initMockData } from './mocks/data/initMockData'
import { GlobalConfirmDialog } from './components/ui/confirm-dialog'
import { Toaster } from './components/ui/toaster'
import { useAuthStore } from './stores/useAuthStore'
import { usePhotoStore } from './stores/usePhotoStore'
import { dataService } from './services/data'
import { preloadPhotosToStore } from './hooks/useEnsurePhotosLoaded'
import { initializeTheme } from './hooks/useTheme'

/**
 * 应用初始化
 */
async function initApp() {
  // 0. 初始化主题（防止闪烁）
  initializeTheme()

  // 1. 初始化认证系统
  await useAuthStore.getState().initialize()

  // 2. 根据环境变量决定是否启动MSW
  const enableMSW = import.meta.env.VITE_ENABLE_MSW === 'true'
  
  console.log('[Init] Environment:', {
    DEV: import.meta.env.DEV,
    MODE: import.meta.env.MODE,
    VITE_ENABLE_MSW: import.meta.env.VITE_ENABLE_MSW,
    enableMSW,
  })
  
  if (import.meta.env.DEV && enableMSW) {
    console.log('[Init] 🚀 开发环境 + MSW启用，准备启动 MSW...')
    await startMSW()
    // 3. 初始化Mock数据到IndexedDB（仅在MSW模式下）
    await initMockData()
    console.log('[Init] ✅ MSW Mock 模式已启动')
  } else if (import.meta.env.DEV) {
    console.log('[Init] 🔗 开发环境，MSW已关闭，直接连接 Supabase 后端')
    
    // 清理 IndexedDB 中的 Mock 数据（通过 isMockData 标记识别）
    try {
      const clearedCount = await dataService.clearMockPhotos()
      if (clearedCount > 0) {
        console.log(`[Init] 🧹 清理 ${clearedCount} 条 Mock 数据...`)
        console.log('[Init] ✅ Mock 数据清理完成')
      } else {
        console.log('[Init] 🔍 未发现 Mock 数据，无需清理')
      }
    } catch (error) {
      console.warn('[Init] ⚠️  清理 Mock 数据失败:', error)
    }
  }

  // 4. 启动数据服务（仅在非MSW模式下）
  if (!enableMSW) {
    console.log('[Init] 🔄 启动数据服务...')
    
    // 4.1 初始同步（从 Supabase 拉取数据到 IndexedDB）
    try {
      await dataService.initialSync()
      console.log('[Init] ✅ 初始同步完成')
    } catch (error) {
      console.error('[Init] ⚠️  初始同步失败:', error)
    }
    
    // 4.2 预热 Zustand Store（从 IndexedDB 加载到内存）
    try {
      const preloadResult = await preloadPhotosToStore()
      if (preloadResult.success && preloadResult.count > 0) {
        console.log(`[Init] ✅ Store 预热完成: ${preloadResult.count} 张照片 (来源: ${preloadResult.source})`)
      } else if (preloadResult.error) {
        console.warn('[Init] ⚠️  Store 预热失败:', preloadResult.error)
      }
    } catch (error) {
      console.warn('[Init] ⚠️  Store 预热失败:', error)
    }
    
    // 4.3 订阅 Supabase Realtime（自动更新 IndexedDB 和 Store）
    dataService.subscribePhotos((event) => {
      console.log('[Init] Realtime 事件:', event.type, event.data.id)
      
      // 实时更新 Zustand Store
      const { photos, setPhotos } = usePhotoStore.getState()
      
      switch (event.type) {
        case 'INSERT':
          // 新照片添加到列表开头
          setPhotos([event.data, ...photos.filter(p => p.id !== event.data.id)])
          break
        case 'UPDATE':
          // 更新现有照片
          setPhotos(photos.map(p => p.id === event.data.id ? event.data : p))
          break
        case 'DELETE':
          // 删除照片
          if (event.old) {
            setPhotos(photos.filter(p => p.id !== event.old!.id))
          }
          break
      }
    })
    console.log('[Init] ✅ Realtime 订阅已启动')
  }

  // 5. 渲染React应用
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
      <GlobalConfirmDialog />
      <Toaster />
    </StrictMode>,
  )
}

// 启动应用
initApp().catch(console.error)
