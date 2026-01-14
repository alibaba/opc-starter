/**
 * 工具测试模板
 * @description 复制此文件到新工具目录并修改
 * @see STORY-24-009
 *
 * 使用方法:
 * 1. 复制此文件到新工具目录 (如 tools/myTool/index.test.ts)
 * 2. 替换所有 `myTool` 为实际工具名
 * 3. 根据工具功能添加/修改测试用例
 * 4. 运行: npm run test -- tools/myTool
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { myTool } from './index';

vi.mock('@/stores/usePhotoEditorStore', () => ({
  usePhotoEditorStore: Object.assign(() => ({}), {
    getState: vi.fn(() => ({
      currentImage: 'data:image/png;base64,mockImage',
      originalPhoto: { id: 'test-photo-1' },
      rotation: 0,
      filter: 'original',
      brightness: 0,
      contrast: 0,
      saturation: 0,
      applyCrop: vi.fn(),
      applyRotation: vi.fn(),
      applyFilter: vi.fn(),
      applyAdjust: vi.fn(),
      setActiveTool: vi.fn(),
      loadPhoto: vi.fn(),
    })),
  }),
}));

vi.mock('@/stores/useBatchSelectionStore', () => ({
  useBatchSelectionStore: {
    getState: vi.fn(() => ({
      getSelectedPhotos: vi.fn(() => []),
      selectedPhotoIds: new Set(),
    })),
  },
}));

vi.mock('@/stores/usePhotoStore', () => ({
  usePhotoStore: {
    getState: vi.fn(() => ({
      photos: [
        {
          id: 'test-photo-1',
          oss_url: 'https://example.com/photo1.jpg',
          width: 1920,
          height: 1080,
        },
      ],
    })),
  },
}));

describe('myTool', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('成功路径', () => {
    it('should execute successfully with valid params', async () => {
      const result = await myTool.execute({
        param1: 'test-value',
        param2: 42,
      });

      expect(result.success).toBe(true);
      expect(result.message).toContain('test-value');
      expect(result.data?.result).toBe(42);
    });

    it('should handle optional params', async () => {
      const result = await myTool.execute({
        param1: 'test-value',
      });

      expect(result.success).toBe(true);
      expect(result.data?.result).toBe(0);
    });
  });

  describe('失败路径', () => {
    it('should reject invalid params via validateAndExecute', async () => {
      const result = await myTool.validateAndExecute({
        invalidParam: 'wrong',
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('参数验证失败');
    });

    it('should reject missing required params', async () => {
      const result = await myTool.validateAndExecute({});

      expect(result.success).toBe(false);
      expect(result.error).toContain('参数验证失败');
    });
  });

  describe('边界情况', () => {
    it('should handle empty string param', async () => {
      const result = await myTool.execute({
        param1: '',
      });

      expect(result.success).toBe(true);
    });

    it('should handle zero as param2', async () => {
      const result = await myTool.execute({
        param1: 'test',
        param2: 0,
      });

      expect(result.data?.result).toBe(0);
    });
  });

  describe('OpenAI Schema', () => {
    it('should have correct tool definition structure', () => {
      expect(myTool.definition.type).toBe('function');
      expect(myTool.definition.function.name).toBe('myToolName');
      expect(myTool.definition.function.description).toBeDefined();
      expect(myTool.definition.function.parameters).toBeDefined();
    });

    it('should have valid JSON schema parameters', () => {
      const params = myTool.definition.function.parameters;
      expect(params).toBeDefined();
    });
  });

  describe('A2UI 响应', () => {
    it('should return UI component when successful', async () => {
      const result = await myTool.execute({
        param1: 'test',
      });

      expect(result.ui).toBeDefined();
      expect(result.ui?.id).toContain('my-ui-');
      expect(result.ui?.type).toBe('photo-preview');
    });
  });
});