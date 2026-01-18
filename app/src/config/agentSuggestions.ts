/**
 * Agent 上下文感知推荐配置
 * @description 根据用户当前页面和上下文状态提供智能推荐
 * @version 2.0.0 - 适配 OPC-Starter 简化页面类型
 */

import type { AgentContext } from '@/hooks/useAgentContext'

// 页面类型（与 useAgentContext 保持一致）
type PageType = AgentContext['currentPage']

/**
 * 推荐操作项
 */
export interface SuggestionItem {
  /** 显示文本 */
  text: string
  /** 图标 emoji */
  icon: string
  /** 可选：需要导航到的目标页面（如果当前页面不支持该操作） */
  requiresPage?: PageType
  /** 可选：是否需要选中照片 */
  requiresSelectedPhotos?: boolean
  /** 可选：最小选中照片数量 */
  minPhotos?: number
  /** 可选：是否需要正在编辑的照片 */
  requiresEditingPhoto?: boolean
}

/**
 * 页面特定推荐配置
 */
export interface PageSuggestions {
  /** 该页面下的推荐操作 */
  suggestions: SuggestionItem[]
  /** 无上下文时的提示（如需要先选择照片） */
  emptyStateHint?: string
}

/**
 * 全局推荐（所有页面通用）
 */
export const GLOBAL_SUGGESTIONS: SuggestionItem[] = [
  {
    text: '搜索照片',
    icon: '🔍',
  },
  {
    text: '查看我的相册',
    icon: '📁',
  },
]

/**
 * 页面特定推荐配置
 */
export const PAGE_SUGGESTIONS: Record<PageType, PageSuggestions> = {
  dashboard: {
    suggestions: [
      {
        text: '带我去组织管理',
        icon: '👥',
      },
      {
        text: '查看我的个人信息',
        icon: '👤',
      },
      {
        text: '管理云存储设置',
        icon: '☁️',
      },
      {
        text: '帮我了解这个系统',
        icon: '❓',
      },
    ],
  },

  persons: {
    suggestions: [
      {
        text: '创建新的组织',
        icon: '🏢',
      },
      {
        text: '添加团队成员',
        icon: '➕',
      },
      {
        text: '查看组织架构',
        icon: '📊',
      },
      {
        text: '回到首页',
        icon: '🏠',
      },
    ],
  },

  profile: {
    suggestions: [
      {
        text: '更新我的个人信息',
        icon: '✏️',
      },
      {
        text: '修改我的头像',
        icon: '📷',
      },
      {
        text: '查看我的团队',
        icon: '👥',
      },
      {
        text: '回到首页',
        icon: '🏠',
      },
    ],
  },

  settings: {
    suggestions: [
      {
        text: '打开云存储设置',
        icon: '☁️',
      },
      {
        text: '查看系统信息',
        icon: 'ℹ️',
      },
      {
        text: '回到首页',
        icon: '🏠',
      },
    ],
  },

  'cloud-storage': {
    suggestions: [
      {
        text: '查看存储空间使用情况',
        icon: '📊',
      },
      {
        text: '管理同步设置',
        icon: '🔄',
      },
      {
        text: '回到设置页',
        icon: '⚙️',
      },
      {
        text: '回到首页',
        icon: '🏠',
      },
    ],
  },

  other: {
    suggestions: [
      {
        text: '回到首页',
        icon: '🏠',
      },
      {
        text: '打开组织管理',
        icon: '👥',
      },
      {
        text: '查看个人中心',
        icon: '👤',
      },
    ],
  },
}

/**
 * 导航提示模板
 */
export const NAVIGATION_HINTS: Record<PageType, string> = {
  dashboard: '📍 前往首页',
  persons: '📍 前往组织管理',
  profile: '📍 前往个人中心',
  settings: '📍 前往系统设置',
  'cloud-storage': '📍 前往云存储设置',
  other: '📍 前往其他页面',
}

/**
 * 根据上下文获取智能推荐
 * @param context Agent 上下文
 * @returns 过滤后的推荐列表和提示信息
 */
export function getContextualSuggestions(context: AgentContext): {
  suggestions: Array<SuggestionItem & { navigationHint?: string }>
  emptyStateHint?: string
  contextInfo: string
} {
  const pageConfig = PAGE_SUGGESTIONS[context.currentPage]

  // 生成上下文描述
  const contextInfo = `当前页面: ${context.currentPage}`

  // 简化推荐处理（OPC-Starter 不需要照片选择逻辑）
  const filteredSuggestions = pageConfig.suggestions.map((suggestion) => {
    // 检查是否需要特定页面
    if (suggestion.requiresPage && suggestion.requiresPage !== context.currentPage) {
      return {
        ...suggestion,
        navigationHint: NAVIGATION_HINTS[suggestion.requiresPage],
      }
    }
    return suggestion
  })

  return {
    suggestions: filteredSuggestions,
    emptyStateHint: pageConfig.emptyStateHint,
    contextInfo,
  }
}
