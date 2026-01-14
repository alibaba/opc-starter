/**
 * Agent 上下文感知推荐配置测试
 * @description 测试根据页面和上下文状态生成智能推荐的逻辑
 */

import { describe, it, expect } from 'vitest';
import {
  getContextualSuggestions,
  PAGE_SUGGESTIONS,
  GLOBAL_SUGGESTIONS,
} from '../agentSuggestions';
import type { AgentContext, SelectedPhoto } from '@/types/agent';

// 创建测试用的 SelectedPhoto
function createMockPhoto(id: string): SelectedPhoto {
  return {
    id,
    url: `https://example.com/${id}.jpg`,
    thumbnail: `https://example.com/${id}_thumb.jpg`,
    width: 800,
    height: 600,
  };
}

// 创建基础上下文
function createBaseContext(
  currentPage: AgentContext['currentPage'],
  overrides: Partial<AgentContext> = {}
): AgentContext {
  return {
    currentPage,
    selectedPhotos: [],
    ...overrides,
  };
}

describe('agentSuggestions', () => {
  describe('PAGE_SUGGESTIONS 配置', () => {
    it('应该为每个页面类型定义推荐配置', () => {
      const expectedPages: AgentContext['currentPage'][] = [
        'timeline',
        'album',
        'editor',
        'ai-studio',
        'search',
        'persons',
      ];

      expectedPages.forEach((page) => {
        expect(PAGE_SUGGESTIONS[page]).toBeDefined();
        expect(PAGE_SUGGESTIONS[page].suggestions).toBeInstanceOf(Array);
        expect(PAGE_SUGGESTIONS[page].suggestions.length).toBeGreaterThan(0);
      });
    });

    it('timeline 页面应该有编辑、融合、视频等推荐', () => {
      const timelineSuggestions = PAGE_SUGGESTIONS.timeline.suggestions;
      
      const hasEditSuggestion = timelineSuggestions.some((s) => s.text.includes('编辑'));
      const hasFusionSuggestion = timelineSuggestions.some((s) => s.text.includes('融合'));
      const hasVideoSuggestion = timelineSuggestions.some((s) => s.text.includes('视频'));
      
      expect(hasEditSuggestion).toBe(true);
      expect(hasFusionSuggestion).toBe(true);
      expect(hasVideoSuggestion).toBe(true);
    });

    it('editor 页面的推荐应该需要正在编辑的照片', () => {
      const editorSuggestions = PAGE_SUGGESTIONS.editor.suggestions;
      
      // 编辑器页面的主要操作都需要 editingPhoto
      const requiresEditing = editorSuggestions.filter((s) => s.requiresEditingPhoto);
      expect(requiresEditing.length).toBeGreaterThan(0);
    });
  });

  describe('getContextualSuggestions', () => {
    describe('timeline 页面', () => {
      it('无选中照片时应该返回导航提示', () => {
        const context = createBaseContext('timeline');
        const result = getContextualSuggestions(context);

        // 需要选中照片的推荐应该有导航提示
        const editSuggestion = result.suggestions.find((s) => s.text.includes('编辑'));
        expect(editSuggestion?.navigationHint).toBeDefined();
        expect(editSuggestion?.navigationHint).toContain('选择');
      });

      it('有选中照片时应该可以直接编辑', () => {
        const context = createBaseContext('timeline', {
          selectedPhotos: [createMockPhoto('photo1')],
        });
        const result = getContextualSuggestions(context);

        // 编辑推荐应该没有导航提示（可直接执行）
        const editSuggestion = result.suggestions.find((s) => s.text.includes('编辑'));
        expect(editSuggestion).toBeDefined();
        expect(editSuggestion?.navigationHint).toBeUndefined();
      });

      it('选中 1 张照片时融合推荐应该有提示（需要至少 2 张）', () => {
        const context = createBaseContext('timeline', {
          selectedPhotos: [createMockPhoto('photo1')],
        });
        const result = getContextualSuggestions(context);

        const fusionSuggestion = result.suggestions.find((s) => s.text.includes('融合'));
        expect(fusionSuggestion?.navigationHint).toBeDefined();
        expect(fusionSuggestion?.navigationHint).toContain('2');
      });

      it('选中 2+ 张照片时融合推荐应该可直接执行', () => {
        const context = createBaseContext('timeline', {
          selectedPhotos: [createMockPhoto('photo1'), createMockPhoto('photo2')],
        });
        const result = getContextualSuggestions(context);

        const fusionSuggestion = result.suggestions.find((s) => s.text.includes('融合'));
        expect(fusionSuggestion).toBeDefined();
        expect(fusionSuggestion?.navigationHint).toBeUndefined();
      });

      it('contextInfo 应该反映选中照片数量', () => {
        const context = createBaseContext('timeline', {
          selectedPhotos: [createMockPhoto('photo1'), createMockPhoto('photo2')],
        });
        const result = getContextualSuggestions(context);

        expect(result.contextInfo).toContain('2 张照片');
      });
    });

    describe('editor 页面', () => {
      it('无编辑中照片时应该显示空状态提示', () => {
        const context = createBaseContext('editor');
        const result = getContextualSuggestions(context);

        // 编辑器页面没有照片时应该有提示
        expect(result.emptyStateHint).toBeDefined();
      });

      it('有编辑中照片时应该可以执行编辑操作', () => {
        const context = createBaseContext('editor', {
          editingState: {
            photoId: 'photo1',
            hasUnsavedChanges: false,
          },
        });
        const result = getContextualSuggestions(context);

        // 旋转等操作应该没有导航提示
        const rotateSuggestion = result.suggestions.find((s) => s.text.includes('旋转'));
        expect(rotateSuggestion).toBeDefined();
        expect(rotateSuggestion?.navigationHint).toBeUndefined();
      });

      it('有选中照片但无编辑中照片时应该可以自动加载', () => {
        const context = createBaseContext('editor', {
          selectedPhotos: [createMockPhoto('photo1')],
        });
        const result = getContextualSuggestions(context);

        // 有选中照片时，编辑操作应该可用（会自动加载）
        const rotateSuggestion = result.suggestions.find((s) => s.text.includes('旋转'));
        expect(rotateSuggestion).toBeDefined();
        // 不需要导航提示，因为可以自动加载选中的照片
        expect(rotateSuggestion?.navigationHint).toBeUndefined();
      });

      it('contextInfo 应该包含正在编辑的信息', () => {
        const context = createBaseContext('editor', {
          editingState: {
            photoId: 'photo1',
            hasUnsavedChanges: true,
          },
        });
        const result = getContextualSuggestions(context);

        expect(result.contextInfo).toContain('编辑');
      });
    });

    describe('ai-studio 页面', () => {
      it('无选中照片时融合推荐应该提示去时间线选择', () => {
        const context = createBaseContext('ai-studio');
        const result = getContextualSuggestions(context);

        const fusionSuggestion = result.suggestions.find((s) => s.text.includes('融合'));
        expect(fusionSuggestion?.navigationHint).toBeDefined();
        expect(fusionSuggestion?.navigationHint).toContain('时间线');
      });
    });

    describe('album 页面', () => {
      it('应该包含相册信息在上下文中', () => {
        const context = createBaseContext('album', {
          currentAlbum: {
            id: 'album1',
            name: '旅行相册',
            photoCount: 10,
          },
        });
        const result = getContextualSuggestions(context);

        expect(result.contextInfo).toContain('旅行相册');
      });
    });

    describe('推荐排序', () => {
      it('应该优先显示可直接执行的推荐', () => {
        const context = createBaseContext('timeline', {
          selectedPhotos: [createMockPhoto('photo1')],
        });
        const result = getContextualSuggestions(context);

        // 可直接执行的推荐应该排在前面
        const firstSuggestion = result.suggestions[0];
        expect(firstSuggestion.navigationHint).toBeUndefined();

        // 需要更多照片的推荐（如融合需要 2 张）应该排在后面
        const lastWithHint = result.suggestions.findIndex((s) => s.navigationHint);
        const firstWithoutHint = result.suggestions.findIndex((s) => !s.navigationHint);
        
        if (lastWithHint !== -1 && firstWithoutHint !== -1) {
          // 所有无提示的应该在有提示的前面
          const allWithoutHint = result.suggestions.filter((s) => !s.navigationHint);
          const allWithHint = result.suggestions.filter((s) => s.navigationHint);
          
          allWithoutHint.forEach((item) => {
            const idx = result.suggestions.indexOf(item);
            allWithHint.forEach((hintItem) => {
              const hintIdx = result.suggestions.indexOf(hintItem);
              expect(idx).toBeLessThan(hintIdx);
            });
          });
        }
      });
    });
  });

  describe('GLOBAL_SUGGESTIONS', () => {
    it('应该包含通用推荐', () => {
      expect(GLOBAL_SUGGESTIONS.length).toBeGreaterThan(0);
      expect(GLOBAL_SUGGESTIONS.some((s) => s.text.includes('搜索'))).toBe(true);
    });
  });
});
