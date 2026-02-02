/**
 * useAgentContext Hook
 * @description 获取当前应用上下文，供 AI 助手使用
 * @version 2.0.0 - 移除 Photo 相关依赖
 */

import { useMemo } from 'react'
import { useLocation } from 'react-router-dom'
import { useAgentStore } from '@/stores/useAgentStore'
import type { AgentContext } from '@/types/agent'

// 重新导出类型以保持向后兼容
export type { AgentContext } from '@/types/agent'

/**
 * 确定当前页面类型
 */
function useCurrentPage(): AgentContext['currentPage'] {
  const location = useLocation()
  const pathname = location.pathname

  return useMemo(() => {
    if (pathname === '/' || pathname.includes('/dashboard')) return 'dashboard'
    if (pathname.includes('/persons')) return 'persons'
    if (pathname.includes('/profile')) return 'profile'
    if (pathname.includes('/settings/cloud-storage')) return 'cloud-storage'
    if (pathname.includes('/settings')) return 'settings'
    return 'other'
  }, [pathname])
}

/**
 * useAgentContext Hook
 * @description 综合获取当前应用上下文
 * @returns AgentContext 对象
 */
export function useAgentContext(): AgentContext {
  const currentPage = useCurrentPage()

  return useMemo(
    () => ({
      currentPage,
      selectedPhotos: [],
      editingState: undefined,
      currentAlbum: undefined,
      viewContext: {
        viewMode: 'mine' as const,
        teamId: null,
        teamName: null,
      },
    }),
    [currentPage]
  )
}

/**
 * useAgentContextSync Hook
 * @description 自动同步上下文到 Agent Store
 */
export function useAgentContextSync(): void {
  const context = useAgentContext()
  const { setContext } = useAgentStore()

  // 当上下文变化时自动同步
  useMemo(() => {
    setContext(context)
  }, [context, setContext])
}

/**
 * 生成上下文摘要（用于发送给 AI）
 */
export function generateContextSummary(context: AgentContext): string {
  const parts: string[] = []

  // 当前页面
  const pageNames: Record<AgentContext['currentPage'], string> = {
    dashboard: '首页',
    persons: '组织管理',
    profile: '个人中心',
    settings: '系统设置',
    'cloud-storage': '云存储设置',
    other: '其他页面',
  }
  parts.push(`当前页面: ${pageNames[context.currentPage]}`)

  return parts.join('\n')
}
