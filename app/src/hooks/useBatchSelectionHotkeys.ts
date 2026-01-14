import { useEffect } from 'react';
import { useBatchSelectionStore } from '@/stores/useBatchSelectionStore';

/**
 * 批量选择键盘快捷键 Hook
 * 
 * 支持的快捷键：
 * - Ctrl/Cmd + A: 全选
 * - Ctrl/Cmd + D: 取消全选
 * - Ctrl/Cmd + I: 反选
 * - Escape: 退出批量选择模式
 * 
 * @param photoIds - 当前页面的所有照片 ID
 * @param enabled - 是否启用快捷键（默认：true）
 */
export function useBatchSelectionHotkeys(
  photoIds: string[],
  enabled: boolean = true
) {
  const {
    isSelectionMode,
    selectAll,
    deselectAll,
    invertSelection,
    exitSelectionMode,
  } = useBatchSelectionStore();

  useEffect(() => {
    // 只在批量选择模式下启用快捷键
    if (!enabled || !isSelectionMode) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const modifierKey = isMac ? e.metaKey : e.ctrlKey;

      // Ctrl/Cmd + A: 全选
      if (modifierKey && e.key.toLowerCase() === 'a') {
        e.preventDefault();
        selectAll(photoIds);
        return;
      }

      // Ctrl/Cmd + D: 取消全选
      if (modifierKey && e.key.toLowerCase() === 'd') {
        e.preventDefault();
        deselectAll();
        return;
      }

      // Ctrl/Cmd + I: 反选
      if (modifierKey && e.key.toLowerCase() === 'i') {
        e.preventDefault();
        invertSelection(photoIds);
        return;
      }

      // Escape: 退出批量选择模式
      if (e.key === 'Escape') {
        e.preventDefault();
        exitSelectionMode();
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [
    enabled,
    isSelectionMode,
    photoIds,
    selectAll,
    deselectAll,
    invertSelection,
    exitSelectionMode,
  ]);
}

