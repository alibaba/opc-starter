/**
 * Agent 上下文感知推荐配置
 * @description 根据用户当前页面和上下文状态提供智能推荐
 * @version 2.0.0 - 适配 OPC-Starter 简化页面类型
 */

import i18n from '@/lib/i18n'
import type { AgentContext } from '@/hooks/useAgentContext'

// 页面类型（与 useAgentContext 保持一致）
type PageType = AgentContext['currentPage']

/**
 * 推荐操作项
 */
export interface SuggestionItem {
  /** i18n key（components.agentSuggestions.*） */
  textKey: string
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
  emptyStateHintKey?: string
}

/**
 * 全局推荐（所有页面通用）
 */
export const GLOBAL_SUGGESTIONS: SuggestionItem[] = [
  {
    textKey: 'searchPhotos',
    icon: '🔍',
  },
  {
    textKey: 'viewAlbums',
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
        textKey: 'goOrgManagement',
        icon: '👥',
      },
      {
        textKey: 'viewProfile',
        icon: '👤',
      },
      {
        textKey: 'manageCloudStorage',
        icon: '☁️',
      },
      {
        textKey: 'learnSystem',
        icon: '❓',
      },
    ],
  },

  persons: {
    suggestions: [
      {
        textKey: 'createOrg',
        icon: '🏢',
      },
      {
        textKey: 'addMember',
        icon: '➕',
      },
      {
        textKey: 'viewOrgStructure',
        icon: '📊',
      },
      {
        textKey: 'goHome',
        icon: '🏠',
      },
    ],
  },

  profile: {
    suggestions: [
      {
        textKey: 'updateInfo',
        icon: '✏️',
      },
      {
        textKey: 'changeAvatar',
        icon: '📷',
      },
      {
        textKey: 'viewTeam',
        icon: '👥',
      },
      {
        textKey: 'goHome',
        icon: '🏠',
      },
    ],
  },

  settings: {
    suggestions: [
      {
        textKey: 'openCloudStorage',
        icon: '☁️',
      },
      {
        textKey: 'viewSystemInfo',
        icon: 'ℹ️',
      },
      {
        textKey: 'goHome',
        icon: '🏠',
      },
    ],
  },

  'cloud-storage': {
    suggestions: [
      {
        textKey: 'viewStorageUsage',
        icon: '📊',
      },
      {
        textKey: 'manageSyncSettings',
        icon: '🔄',
      },
      {
        textKey: 'goSettings',
        icon: '⚙️',
      },
      {
        textKey: 'goHome',
        icon: '🏠',
      },
    ],
  },

  other: {
    suggestions: [
      {
        textKey: 'goHome',
        icon: '🏠',
      },
      {
        textKey: 'openOrgManagement',
        icon: '👥',
      },
      {
        textKey: 'viewProfileCenter',
        icon: '👤',
      },
    ],
  },
}

/**
 * 导航提示模板 key
 */
export const NAVIGATION_HINT_KEYS: Record<PageType, string> = {
  dashboard: 'navDashboard',
  persons: 'navPersons',
  profile: 'navProfile',
  settings: 'navSettings',
  'cloud-storage': 'navCloudStorage',
  other: 'navOther',
}

function translateSuggestionKey(textKey: string): string {
  return i18n.t(`agentSuggestions.${textKey}`, { ns: 'components' })
}

/**
 * 根据上下文获取智能推荐
 * @param context Agent 上下文
 * @returns 过滤后的推荐列表和提示信息
 */
export function getContextualSuggestions(context: AgentContext): {
  suggestions: Array<SuggestionItem & { text: string; navigationHint?: string }>
  emptyStateHint?: string
  contextInfo: string
} {
  const pageConfig = PAGE_SUGGESTIONS[context.currentPage]

  // 生成上下文描述
  const contextInfo = i18n.t('agentSuggestions.contextInfo', {
    ns: 'components',
    page: context.currentPage,
  })

  // 简化推荐处理（OPC-Starter 不需要照片选择逻辑）
  const filteredSuggestions = pageConfig.suggestions.map((suggestion) => {
    const text = translateSuggestionKey(suggestion.textKey)

    // 检查是否需要特定页面
    if (suggestion.requiresPage && suggestion.requiresPage !== context.currentPage) {
      return {
        ...suggestion,
        text,
        navigationHint: translateSuggestionKey(NAVIGATION_HINT_KEYS[suggestion.requiresPage]),
      }
    }
    return { ...suggestion, text }
  })

  return {
    suggestions: filteredSuggestions,
    emptyStateHint: pageConfig.emptyStateHintKey
      ? translateSuggestionKey(pageConfig.emptyStateHintKey)
      : undefined,
    contextInfo,
  }
}
