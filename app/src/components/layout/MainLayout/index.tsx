import { useEffect, useRef, useState, useCallback } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from '../Sidebar';
import { Header } from '../Header';
import { dataService } from '@/services/data/DataService';
import { useSyncStatus } from '@/hooks/useSyncStatus';
import { Loader2 } from 'lucide-react';
import { AgentWindow } from '@/components/agent/AgentWindow';
import { useAgentStore } from '@/stores/useAgentStore';
import { A2UIPortalContainer } from '@/components/agent/a2ui/A2UIPortalContainer';

// localStorage key for sidebar collapsed state
const SIDEBAR_COLLAPSED_KEY = 'photo-wall:sidebar-collapsed';

/**
 * 首次同步加载组件 (Epic-18: S18-2)
 */
function InitialSyncLoader() {
  const { isSyncing, progress, hasInitialSynced } = useSyncStatus();

  // 如果已完成首次同步，不显示加载器
  if (hasInitialSynced || !isSyncing) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
      <div className="flex flex-col items-center gap-4 p-4 md:p-8 rounded-xl bg-card shadow-lg border mx-4">
        <Loader2 className="w-8 h-8 md:w-10 md:h-10 text-primary animate-spin" />
        <div className="text-center">
          <h3 className="text-base md:text-lg font-semibold">正在同步数据</h3>
          {progress && (
            <p className="text-xs md:text-sm text-muted-foreground mt-1">
              {progress.message || `同步 ${progress.table}... (${progress.current}/${progress.total})`}
            </p>
          )}
        </div>
        {progress && (
          <div className="w-40 md:w-48 h-2 bg-muted rounded-full overflow-hidden">
            <div 
              className="h-full bg-primary transition-all duration-300"
              style={{ width: `${(progress.current / progress.total) * 100}%` }}
            />
          </div>
        )}
      </div>
    </div>
  );
}

export function MainLayout() {
  const hasInitialized = useRef(false);
  // 移动端侧边栏展开状态
  const [sidebarOpen, setSidebarOpen] = useState(false);
  // 桌面端侧边栏折叠状态（从 localStorage 读取初始值）
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    try {
      return localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === 'true';
    } catch {
      return false;
    }
  });
  
  // Agent 窗口状态
  const isPanelOpen = useAgentStore((state) => state.isPanelOpen);
  const togglePanel = useAgentStore((state) => state.togglePanel);

  // 切换侧边栏折叠状态
  const handleToggleCollapse = useCallback(() => {
    setSidebarCollapsed((prev) => {
      const newValue = !prev;
      try {
        localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(newValue));
      } catch {
        // localStorage 不可用时忽略
      }
      return newValue;
    });
  }, []);

  // 初始化数据同步 (Epic-18: S18-2)
  useEffect(() => {
    // 防止 React 18 Strict Mode 下的重复调用
    if (hasInitialized.current) {
      return;
    }
    hasInitialized.current = true;

    console.log('[MainLayout] 启动数据同步...');
    
    // 启动初始同步
    dataService.initialSync().catch((error) => {
      console.error('[MainLayout] 初始同步失败:', error);
    });

    // 清理函数：组件卸载时清理订阅
    return () => {
      console.log('[MainLayout] 清理数据服务订阅');
      dataService.cleanup();
    };
  }, []);

  return (
    <div className="flex h-screen overflow-hidden">
      {/* 首次同步加载遮罩 */}
      <InitialSyncLoader />

      {/* 左侧Sidebar - 移动端通过 state 控制显示，桌面端支持折叠 */}
      <Sidebar 
        isOpen={sidebarOpen} 
        onClose={() => setSidebarOpen(false)}
        isCollapsed={sidebarCollapsed}
        onToggleCollapse={handleToggleCollapse}
      />

      {/* 右侧主内容区 - 移动端占满宽度 */}
      <div className="flex-1 flex flex-col overflow-hidden w-full">
        {/* 顶部Header */}
        <Header onMenuClick={() => setSidebarOpen(true)} />

        {/* 主内容区域 - Mobile First: 更小的 padding */}
        {/* STORY-23-012: 添加 relative 定位以支持 Portal main-area 模式 */}
        <main className="flex-1 overflow-auto bg-background p-3 md:p-6 relative">
          <Outlet />

          {/* A2UI Portal 挂载点 (STORY-23-012) */}
          <A2UIPortalContainer />
        </main>
      </div>

      {/* AI 助手悬浮窗口 */}
      <AgentWindow isOpen={isPanelOpen} onClose={togglePanel} />
    </div>
  );
}
