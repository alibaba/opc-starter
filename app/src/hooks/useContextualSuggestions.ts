/**
 * useContextualSuggestions Hook
 * @description 根据当前页面和上下文状态生成智能推荐
 * @version 1.0.0
 */

import { useMemo } from 'react';
import { useAgentContext } from './useAgentContext';
import {
  getContextualSuggestions,
  type SuggestionItem,
} from '@/config/agentSuggestions';

/**
 * 带导航提示的推荐项
 */
export interface ContextualSuggestion extends SuggestionItem {
  /** 导航提示（如果需要前往其他页面或选择照片） */
  navigationHint?: string;
  /** 是否可直接执行 */
  canExecute: boolean;
}

/**
 * Hook 返回值
 */
export interface UseContextualSuggestionsReturn {
  /** 推荐列表 */
  suggestions: ContextualSuggestion[];
  /** 空状态提示（当没有可直接执行的操作时） */
  emptyStateHint?: string;
  /** 上下文描述信息 */
  contextInfo: string;
  /** 当前页面 */
  currentPage: string;
  /** 是否有选中的照片 */
  hasSelectedPhotos: boolean;
  /** 选中照片数量 */
  selectedPhotoCount: number;
  /** 是否有正在编辑的照片 */
  hasEditingPhoto: boolean;
}

/**
 * 根据上下文生成智能推荐
 */
export function useContextualSuggestions(): UseContextualSuggestionsReturn {
  const context = useAgentContext();

  return useMemo(() => {
    const { suggestions, emptyStateHint, contextInfo } =
      getContextualSuggestions(context);

    // 转换为 ContextualSuggestion 格式
    const contextualSuggestions: ContextualSuggestion[] = suggestions.map(
      (suggestion) => ({
        ...suggestion,
        canExecute: !('navigationHint' in suggestion && suggestion.navigationHint),
      })
    );

    return {
      suggestions: contextualSuggestions,
      emptyStateHint,
      contextInfo,
      currentPage: context.currentPage,
      hasSelectedPhotos: context.selectedPhotos.length > 0,
      selectedPhotoCount: context.selectedPhotos.length,
      hasEditingPhoto: !!context.editingState?.photoId,
    };
  }, [context]);
}
