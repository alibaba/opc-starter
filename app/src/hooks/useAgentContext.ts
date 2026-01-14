/**
 * useAgentContext Hook
 * @description 获取当前应用上下文，供 AI 助手使用
 * @version 1.0.0
 * @see STORY-23-007
 */

import { useMemo } from 'react';
import { useLocation, useParams } from 'react-router-dom';
import { usePhotoStore } from '@/stores/usePhotoStore';
import { useBatchSelectionStore } from '@/stores/useBatchSelectionStore';
import { usePhotoEditorStore } from '@/stores/usePhotoEditorStore';
import { useAlbumStore } from '@/stores/useAlbumStore';
import { useViewContextStore } from '@/stores/useViewContextStore';
import type { AgentContext, SelectedPhoto, EditingState, ViewContext } from '@/types/agent';

/**
 * 确定当前页面类型
 */
function useCurrentPage(): AgentContext['currentPage'] {
  const location = useLocation();
  const pathname = location.pathname;

  return useMemo(() => {
    if (pathname.includes('/editor')) return 'editor';
    if (pathname.includes('/album')) return 'album';
    if (pathname.includes('/ai-studio')) return 'ai-studio';
    if (pathname.includes('/search')) return 'search';
    if (pathname.includes('/persons')) return 'persons';
    return 'timeline';
  }, [pathname]);
}

/**
 * 获取选中的照片详情
 */
function useSelectedPhotos(): SelectedPhoto[] {
  const { photos } = usePhotoStore();
  const { selectedPhotoIds } = useBatchSelectionStore();

  return useMemo(() => {
    const selectedIds = Array.from(selectedPhotoIds);

    return selectedIds
      .map((id) => {
        const photo = photos.find((p) => p.id === id);
        if (!photo) return null;

        const selectedPhoto: SelectedPhoto = {
          id: photo.id,
          url: photo.oss_url || photo.oss_original_url || photo.base64,
          thumbnail: photo.oss_thumbnail_url || photo.thumbnail || undefined,
          width: photo.width,
          height: photo.height,
          metadata: {
            takenAt: photo.takenAt ? new Date(photo.takenAt) : undefined,
            tags: photo.tags || [],
          },
        };
        return selectedPhoto;
      })
      .filter((p): p is SelectedPhoto => p !== null);
  }, [photos, selectedPhotoIds]);
}

/**
 * 获取编辑器状态
 */
function useEditingState(): EditingState | undefined {
  const { originalPhoto, currentImage, activeTool, brightness, contrast } =
    usePhotoEditorStore();

  return useMemo(() => {
    if (!originalPhoto) return undefined;

    // 检查是否有未保存的更改
    const hasUnsavedChanges = currentImage !== originalPhoto.base64;

    return {
      photoId: originalPhoto.id,
      hasUnsavedChanges,
      currentTool: activeTool || undefined,
      adjustments: {
        brightness,
        contrast,
      },
    } satisfies EditingState;
  }, [originalPhoto, currentImage, activeTool, brightness, contrast]);
}

/**
 * 获取当前相册信息
 */
function useCurrentAlbum(): AgentContext['currentAlbum'] {
  const params = useParams<{ albumId?: string }>();
  const { albums } = useAlbumStore();

  return useMemo(() => {
    if (!params.albumId) return undefined;

    const album = albums.find((a) => a.id === params.albumId);
    if (!album) return undefined;

    return {
      id: album.id,
      name: album.title,
      photoCount: album.photoIds.length,
    };
  }, [params.albumId, albums]);
}

/**
 * 获取视图上下文
 * @description 获取当前视图模式和团队信息
 */
function useViewContext(): ViewContext | undefined {
  const { viewMode, selectedOrgId, selectedOrgName } = useViewContextStore();

  return useMemo(() => {
    // 只在团队视图下且有选中组织时返回视图上下文
    if (viewMode !== 'team') {
      return {
        viewMode,
        teamId: null,
        teamName: null,
      };
    }

    return {
      viewMode,
      teamId: selectedOrgId,
      teamName: selectedOrgName,
    };
  }, [viewMode, selectedOrgId, selectedOrgName]);
}

/**
 * useAgentContext Hook
 * @description 综合获取当前应用上下文
 * @returns AgentContext 对象
 */
export function useAgentContext(): AgentContext {
  const currentPage = useCurrentPage();
  const selectedPhotos = useSelectedPhotos();
  const editingState = useEditingState();
  const currentAlbum = useCurrentAlbum();
  const viewContext = useViewContext();

  return useMemo(
    () => ({
      currentPage,
      selectedPhotos,
      editingState,
      currentAlbum,
      viewContext,
    }),
    [currentPage, selectedPhotos, editingState, currentAlbum, viewContext]
  );
}

/**
 * useAgentContextSync Hook
 * @description 自动同步上下文到 Agent Store
 */
export function useAgentContextSync(): void {
  const context = useAgentContext();
  const { setContext } = useAgentStore();

  // 当上下文变化时自动同步
  useMemo(() => {
    setContext(context);
  }, [context, setContext]);
}

// 避免循环依赖，在这里导入
import { useAgentStore } from '@/stores/useAgentStore';

/**
 * 生成上下文摘要（用于发送给 AI）
 */
export function generateContextSummary(context: AgentContext): string {
  const parts: string[] = [];

  // 当前页面
  const pageNames: Record<AgentContext['currentPage'], string> = {
    timeline: '时间线',
    album: '相册详情',
    editor: '照片编辑器',
    'ai-studio': 'AI 工作室',
    search: '搜索',
    persons: '人物',
  };
  parts.push(`当前页面: ${pageNames[context.currentPage]}`);

  // 视图上下文
  if (context.viewContext) {
    const viewModeNames: Record<string, string> = {
      mine: '我的照片',
      team: '团队视角',
      persons: '人物视角',
    };
    parts.push(`视图模式: ${viewModeNames[context.viewContext.viewMode] || context.viewContext.viewMode}`);
    if (context.viewContext.teamId && context.viewContext.teamName) {
      parts.push(`当前团队: ${context.viewContext.teamName}`);
    }
  }

  // 选中照片
  if (context.selectedPhotos.length > 0) {
    parts.push(`已选择 ${context.selectedPhotos.length} 张照片`);
  }

  // 编辑状态
  if (context.editingState) {
    parts.push(`正在编辑照片: ${context.editingState.photoId}`);
    if (context.editingState.currentTool) {
      parts.push(`当前工具: ${context.editingState.currentTool}`);
    }
    if (context.editingState.hasUnsavedChanges) {
      parts.push('有未保存的更改');
    }
  }

  // 当前相册
  if (context.currentAlbum) {
    parts.push(`当前相册: ${context.currentAlbum.name}`);
  }

  return parts.join('\n');
}
