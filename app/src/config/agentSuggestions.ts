/**
 * Agent 上下文感知推荐配置
 * @description 根据用户当前页面和上下文状态提供智能推荐
 * @version 1.0.0
 */

import type { AgentContext } from '@/types/agent';

/**
 * 推荐操作项
 */
export interface SuggestionItem {
  /** 显示文本 */
  text: string;
  /** 图标 emoji */
  icon: string;
  /** 可选：需要导航到的目标页面（如果当前页面不支持该操作） */
  requiresPage?: AgentContext['currentPage'];
  /** 可选：是否需要选中照片 */
  requiresSelectedPhotos?: boolean;
  /** 可选：最小选中照片数量 */
  minPhotos?: number;
  /** 可选：是否需要正在编辑的照片 */
  requiresEditingPhoto?: boolean;
}

/**
 * 页面特定推荐配置
 */
export interface PageSuggestions {
  /** 该页面下的推荐操作 */
  suggestions: SuggestionItem[];
  /** 无上下文时的提示（如需要先选择照片） */
  emptyStateHint?: string;
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
];

/**
 * 页面特定推荐配置
 */
export const PAGE_SUGGESTIONS: Record<AgentContext['currentPage'], PageSuggestions> = {
  timeline: {
    suggestions: [
      {
        text: '帮我编辑选中的照片',
        icon: '✨',
        requiresSelectedPhotos: true,
        minPhotos: 1,
      },
      {
        text: '将这些照片融合成一张',
        icon: '🎨',
        requiresSelectedPhotos: true,
        minPhotos: 2,
      },
      {
        text: '用这些照片生成视频',
        icon: '🎬',
        requiresSelectedPhotos: true,
        minPhotos: 2,
      },
      {
        text: '创建新相册',
        icon: '📁',
      },
    ],
    emptyStateHint: '💡 先在时间线选择一些照片，我可以帮你编辑或创作',
  },

  album: {
    suggestions: [
      {
        text: '帮我编辑相册中的照片',
        icon: '✨',
        requiresSelectedPhotos: true,
        minPhotos: 1,
      },
      {
        text: '将相册照片融合成一张',
        icon: '🎨',
        requiresSelectedPhotos: true,
        minPhotos: 2,
      },
      {
        text: '为相册生成封面',
        icon: '🖼️',
      },
      {
        text: '分享这个相册',
        icon: '🔗',
      },
    ],
    emptyStateHint: '💡 选择相册中的照片，我可以帮你编辑或创作',
  },

  editor: {
    suggestions: [
      {
        text: '旋转照片 90 度',
        icon: '🔄',
        requiresEditingPhoto: true,
      },
      {
        text: '添加滤镜效果',
        icon: '🎨',
        requiresEditingPhoto: true,
      },
      {
        text: '调整亮度和对比度',
        icon: '☀️',
        requiresEditingPhoto: true,
      },
      {
        text: '裁剪成 1:1 正方形',
        icon: '✂️',
        requiresEditingPhoto: true,
      },
    ],
    emptyStateHint: '💡 请先加载一张照片到编辑器',
  },

  'ai-studio': {
    suggestions: [
      {
        text: '开始新的图片融合',
        icon: '🎨',
        requiresPage: 'timeline',
        requiresSelectedPhotos: true,
        minPhotos: 2,
      },
      {
        text: '从照片生成视频',
        icon: '🎬',
        requiresPage: 'timeline',
        requiresSelectedPhotos: true,
        minPhotos: 1,
      },
      {
        text: '查看历史任务',
        icon: '📋',
      },
    ],
    emptyStateHint: '💡 前往时间线选择照片，然后回来创建 AI 任务',
  },

  search: {
    suggestions: [
      {
        text: '搜索风景照片',
        icon: '🏞️',
      },
      {
        text: '搜索人物照片',
        icon: '👤',
      },
      {
        text: '编辑搜索结果中的照片',
        icon: '✨',
        requiresSelectedPhotos: true,
        minPhotos: 1,
      },
    ],
  },

  persons: {
    suggestions: [
      {
        text: '查看某个人物的所有照片',
        icon: '👤',
      },
      {
        text: '编辑选中的人物照片',
        icon: '✨',
        requiresSelectedPhotos: true,
        minPhotos: 1,
      },
    ],
  },
};

/**
 * 导航提示模板
 */
export const NAVIGATION_HINTS: Record<AgentContext['currentPage'], string> = {
  timeline: '📍 前往时间线页面',
  album: '📍 前往相册页面',
  editor: '📍 前往照片编辑器',
  'ai-studio': '📍 前往 AI 工作室',
  search: '📍 前往搜索页面',
  persons: '📍 前往人物页面',
};

/**
 * 根据上下文获取智能推荐
 * @param context Agent 上下文
 * @returns 过滤后的推荐列表和提示信息
 */
export function getContextualSuggestions(context: AgentContext): {
  suggestions: Array<SuggestionItem & { navigationHint?: string }>;
  emptyStateHint?: string;
  contextInfo: string;
} {
  const pageConfig = PAGE_SUGGESTIONS[context.currentPage];
  const selectedCount = context.selectedPhotos.length;
  const hasEditingPhoto = !!context.editingState?.photoId;

  // 生成上下文描述
  const contextParts: string[] = [];
  if (selectedCount > 0) {
    contextParts.push(`已选择 ${selectedCount} 张照片`);
  }
  if (hasEditingPhoto) {
    contextParts.push('正在编辑照片');
  }
  if (context.currentAlbum) {
    contextParts.push(`在相册「${context.currentAlbum.name}」中`);
  }

  const contextInfo = contextParts.length > 0
    ? contextParts.join('，')
    : '无特定上下文';

  // 过滤满足条件的推荐
  const filteredSuggestions = pageConfig.suggestions
    .map((suggestion) => {
      // 检查是否需要选中照片
      if (suggestion.requiresSelectedPhotos) {
        const minPhotos = suggestion.minPhotos || 1;
        if (selectedCount < minPhotos) {
          // 需要导航到时间线选择照片
          if (context.currentPage !== 'timeline') {
            return {
              ...suggestion,
              navigationHint: `需要先在时间线选择至少 ${minPhotos} 张照片`,
            };
          } else {
            return {
              ...suggestion,
              navigationHint: `请先选择至少 ${minPhotos} 张照片`,
            };
          }
        }
      }

      // 检查是否需要正在编辑的照片
      if (suggestion.requiresEditingPhoto && !hasEditingPhoto) {
        if (context.currentPage !== 'editor') {
          return {
            ...suggestion,
            navigationHint: '需要先在编辑器中加载照片',
          };
        } else if (selectedCount > 0) {
          // 有选中的照片，可以自动加载
          return suggestion;
        } else {
          return {
            ...suggestion,
            navigationHint: '请先加载一张照片到编辑器',
          };
        }
      }

      // 检查是否需要特定页面
      if (suggestion.requiresPage && suggestion.requiresPage !== context.currentPage) {
        return {
          ...suggestion,
          navigationHint: NAVIGATION_HINTS[suggestion.requiresPage],
        };
      }

      return suggestion;
    })
    // 优先显示无导航提示的（可直接执行的）
    .sort((a, b) => {
      const aHasHint = 'navigationHint' in a && a.navigationHint;
      const bHasHint = 'navigationHint' in b && b.navigationHint;
      if (aHasHint && !bHasHint) return 1;
      if (!aHasHint && bHasHint) return -1;
      return 0;
    });

  // 确定是否显示空状态提示
  const hasDirectActions = filteredSuggestions.some(
    (s) => !('navigationHint' in s && s.navigationHint)
  );

  return {
    suggestions: filteredSuggestions,
    emptyStateHint: hasDirectActions ? undefined : pageConfig.emptyStateHint,
    contextInfo,
  };
}
