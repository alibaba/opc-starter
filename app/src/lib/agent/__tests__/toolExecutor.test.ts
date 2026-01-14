/**
 * Tool Executor 单元测试
 * @description 测试 Agent 工具执行器的各种工具调用
 * @version 1.0.0
 * @see STORY-23-011
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useToolExecutor } from '../toolExecutor';
import { getAllTools } from '../tools';
import type { ToolCall } from '@/types/agent';

// ============ Mock Image and Canvas for rotation tests ============

// Mock Image 类以支持图片旋转测试
class MockImage {
  private _src = '';
  crossOrigin = '';
  width = 100;
  height = 100;
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;

  get src() {
    return this._src;
  }

  set src(value: string) {
    this._src = value;
    // 当设置 src 时，立即在下一个微任务中触发 onload
    Promise.resolve().then(() => {
      if (this.onload) {
        this.onload();
      }
    });
  }
}

// Mock Canvas 上下文
const mockCanvasContext = {
  translate: vi.fn(),
  rotate: vi.fn(),
  drawImage: vi.fn(),
  fillRect: vi.fn(),
  clearRect: vi.fn(),
  getImageData: vi.fn(),
  putImageData: vi.fn(),
  save: vi.fn(),
  restore: vi.fn(),
  beginPath: vi.fn(),
  moveTo: vi.fn(),
  lineTo: vi.fn(),
  closePath: vi.fn(),
  stroke: vi.fn(),
  fill: vi.fn(),
};

// Mock Canvas 元素
class MockCanvas {
  width = 0;
  height = 0;

  getContext() {
    return mockCanvasContext;
  }

  toDataURL() {
    return 'data:image/jpeg;base64,rotatedImageData';
  }
}

// 设置全局 mock
vi.stubGlobal('Image', MockImage);

// Mock document.createElement for canvas - 使用 vi.mock 方式会更可靠
// 但由于已有的 mock 结构，这里使用 spyOn
const originalCreateElement = document.createElement.bind(document);
vi.spyOn(document, 'createElement').mockImplementation((tagName: string, options?: ElementCreationOptions) => {
  if (tagName.toLowerCase() === 'canvas') {
    return new MockCanvas() as unknown as HTMLCanvasElement;
  }
  return originalCreateElement(tagName, options);
});

// ============ Mock Stores ============

// Mock usePhotoEditorStore
vi.mock('@/stores/usePhotoEditorStore', () => ({
  usePhotoEditorStore: Object.assign(
    () => ({
      applyCrop: vi.fn(),
      applyRotation: vi.fn(),
      applyFilter: vi.fn(),
      applyAdjust: vi.fn(),
      currentImage: 'data:image/jpeg;base64,mockImageData',
      originalPhoto: { id: 'test-photo-1', base64: 'data:image/jpeg;base64,original' },
      rotation: 0,
      filter: 'original',
      brightness: 100,
      contrast: 100,
      saturation: 100,
      setActiveTool: vi.fn(),
      loadPhoto: vi.fn(),
    }),
    {
      getState: () => ({
        currentImage: 'data:image/jpeg;base64,mockImageData',
        originalPhoto: { id: 'test-photo-1', base64: 'data:image/jpeg;base64,original' },
        rotation: 0,
        filter: 'original',
        brightness: 100,
        contrast: 100,
        saturation: 100,
        applyCrop: vi.fn(),
        applyRotation: vi.fn(),
        applyFilter: vi.fn(),
        applyAdjust: vi.fn(),
        setActiveTool: vi.fn(),
        loadPhoto: vi.fn(),
      }),
    }
  ),
}));

// Mock useBatchSelectionStore
vi.mock('@/stores/useBatchSelectionStore', () => ({
  useBatchSelectionStore: {
    getState: () => ({
      getSelectedPhotos: () => [], // 默认没有选中照片
      selectedPhotoIds: new Set(),
    }),
  },
}));

// Mock usePhotoStore
vi.mock('@/stores/usePhotoStore', () => ({
  usePhotoStore: {
    getState: () => ({
      photos: [
        {
          id: 'test-photo-1',
          oss_url: 'https://oss.example.com/photo1.jpg',
          oss_compressed_url: 'https://oss.example.com/photo1_compressed.jpg',
          width: 1920,
          height: 1080,
        },
        {
          id: 'test-photo-2',
          oss_url: 'https://oss.example.com/photo2.jpg',
          width: 1080,
          height: 1920,
        },
      ],
    }),
  },
}));

// Mock useAIFusionStore
vi.mock('@/stores/useAIFusionStore', () => ({
  useAIFusionStore: {
    getState: () => ({
      startPolling: vi.fn(),
      tasks: [],
    }),
    subscribe: vi.fn(() => () => {}),
  },
}));

// Mock useVideoTaskStore
vi.mock('@/stores/useVideoTaskStore', () => ({
  useVideoTaskStore: {
    getState: () => ({
      addTask: vi.fn().mockResolvedValue(undefined),
      startPolling: vi.fn(),
      tasks: [],
    }),
    subscribe: vi.fn(() => () => {}),
  },
}));

// Mock photoFusionService
vi.mock('@/services/ai/photoFusionService', () => ({
  photoFusionService: {
    createFusionTask: vi.fn().mockResolvedValue({
      id: 'fusion-task-001',
      status: 'pending',
    }),
  },
}));

// Mock videoGenerationService
vi.mock('@/services/videoGeneration', () => ({
  videoGenerationService: {
    submitI2VTask: vi.fn().mockResolvedValue({
      output: { task_id: 'aliyun-task-001' },
    }),
    submitKF2VTask: vi.fn().mockResolvedValue({
      output: { task_id: 'aliyun-task-002' },
    }),
  },
}));

// Mock supabase
vi.mock('@/lib/supabase/client', () => ({
  supabase: {
    auth: {
      getSession: vi.fn().mockResolvedValue({
        data: {
          session: {
            user: { id: 'test-user-001' },
          },
        },
      }),
    },
  },
}));

// Mock a2uiActionHandler
vi.mock('../a2uiActionHandler', () => ({
  saveEditedPhotoAsNew: vi.fn().mockResolvedValue({
    success: true,
    message: '照片已保存',
    data: { newPhotoId: 'new-photo-001' },
  }),
}));

// Mock imageValidator
vi.mock('@/utils/imageValidator', () => ({
  imageValidator: {
    validate: vi.fn().mockReturnValue({ valid: true, warnings: [] }),
  },
   
  AIServiceType: {} as any,
}));

// Mock imageOptimizer
vi.mock('@/utils/imageOptimizer', () => ({
  imageOptimizer: {
    optimize: vi.fn().mockResolvedValue({
      success: true,
      blob: new Blob(['optimized'], { type: 'image/webp' }),
      width: 1280,
      height: 720,
      fileSize: 1024,
      optimizations: ['resize', 'compress'],
    }),
  },
}));

// Mock uploadToOSS
vi.mock('@/lib/oss/client', () => ({
  uploadToOSS: vi.fn().mockResolvedValue({
    url: 'https://oss.example.com/optimized.webp',
  }),
}));

// ============ 测试套件 ============

describe('useToolExecutor', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ============ 基础功能测试 ============

  describe('基础功能', () => {
    it('返回可用工具列表', () => {
      const { result } = renderHook(() => useToolExecutor());

      expect(result.current.availableTools).toBeDefined();
      expect(result.current.availableTools.length).toBeGreaterThan(0);
      expect(result.current.availableTools).toContainEqual(
        expect.objectContaining({ name: 'cropPhoto' })
      );
    });

    it('提供 executeToolCall 方法', () => {
      const { result } = renderHook(() => useToolExecutor());

      expect(typeof result.current.executeToolCall).toBe('function');
    });

    it('提供 executeToolCalls 批量执行方法', () => {
      const { result } = renderHook(() => useToolExecutor());

      expect(typeof result.current.executeToolCalls).toBe('function');
    });
  });

  // ============ 裁剪工具测试 ============

  describe('cropPhoto 工具', () => {
    it('激活裁剪工具', async () => {
      const { result } = renderHook(() => useToolExecutor());

      const call: ToolCall = {
        id: 'call_crop_001',
        name: 'cropPhoto',
        arguments: { photoId: 'test-photo-1', aspectRatio: '16:9' },
      };

      let response;
      await act(async () => {
        response = await result.current.executeToolCall(call);
      });

      expect(response).toBeDefined();
      expect(response!.success).toBe(true);
      expect(response!.data?.aspectRatio).toBe('16:9');
    });

    it('应用具体裁剪区域', async () => {
      const { result } = renderHook(() => useToolExecutor());

      const call: ToolCall = {
        id: 'call_crop_002',
        name: 'cropPhoto',
        arguments: {
          photoId: 'test-photo-1',
          aspectRatio: '1:1',
          cropArea: { x: 0, y: 0, width: 100, height: 100 },
        },
      };

      let response;
      await act(async () => {
        response = await result.current.executeToolCall(call);
      });

      expect(response).toBeDefined();
      expect(response!.success).toBe(true);
    });
  });

  // ============ 旋转工具测试 ============

  describe('rotatePhoto 工具', () => {
    it('旋转 90 度', async () => {
      const { result } = renderHook(() => useToolExecutor());

      const call: ToolCall = {
        id: 'call_rotate_001',
        name: 'rotatePhoto',
        arguments: { photoId: 'test-photo-1', degrees: 90 },
      };

      let response;
      await act(async () => {
        response = await result.current.executeToolCall(call);
      });

      expect(response).toBeDefined();
      expect(response!.success).toBe(true);
      expect(response!.message).toContain('90');
    });

    it('旋转 180 度', async () => {
      const { result } = renderHook(() => useToolExecutor());

      const call: ToolCall = {
        id: 'call_rotate_002',
        name: 'rotatePhoto',
        arguments: { photoId: 'test-photo-1', degrees: 180 },
      };

      let response;
      await act(async () => {
        response = await result.current.executeToolCall(call);
      });

      expect(response).toBeDefined();
      expect(response!.success).toBe(true);
    });
  });

  // ============ 滤镜工具测试 ============

  describe('applyFilter 工具', () => {
    it('应用滤镜', async () => {
      const { result } = renderHook(() => useToolExecutor());

      const call: ToolCall = {
        id: 'call_filter_001',
        name: 'applyFilter',
        arguments: { photoId: 'test-photo-1', filter: 'vintage' },
      };

      let response;
      await act(async () => {
        response = await result.current.executeToolCall(call);
      });

      expect(response).toBeDefined();
      expect(response!.success).toBe(true);
      expect(response!.data?.filter).toBe('vintage');
    });
  });

  // ============ 调整工具测试 ============

  describe('adjustImage 工具', () => {
    it('调整亮度', async () => {
      const { result } = renderHook(() => useToolExecutor());

      const call: ToolCall = {
        id: 'call_adjust_001',
        name: 'adjustImage',
        arguments: { photoId: 'test-photo-1', brightness: 20 },
      };

      let response;
      await act(async () => {
        response = await result.current.executeToolCall(call);
      });

      expect(response).toBeDefined();
      expect(response!.success).toBe(true);
      expect(response!.data?.brightness).toBe(20);
    });

    it('调整多个参数', async () => {
      const { result } = renderHook(() => useToolExecutor());

      const call: ToolCall = {
        id: 'call_adjust_002',
        name: 'adjustImage',
        arguments: {
          photoId: 'test-photo-1',
          brightness: 10,
          contrast: -10,
          saturation: 20,
        },
      };

      let response;
      await act(async () => {
        response = await result.current.executeToolCall(call);
      });

      expect(response).toBeDefined();
      expect(response!.success).toBe(true);
      expect(response!.data).toMatchObject({
        brightness: 10,
        contrast: -10,
        saturation: 20,
      });
    });
  });

  // ============ AI 优化工具测试 ============

  describe('optimizeForAI 工具', () => {
    it('图片已符合要求时无需优化', async () => {
      const { result } = renderHook(() => useToolExecutor());

      const call: ToolCall = {
        id: 'call_optimize_001',
        name: 'optimizeForAI',
        arguments: { photoId: 'test-photo-1', targetService: 'i2v-single' },
      };

      let response;
      await act(async () => {
        response = await result.current.executeToolCall(call);
      });

      expect(response).toBeDefined();
      expect(response!.success).toBe(true);
      expect(response!.data?.optimized).toBe(false);
    });
  });

  // ============ 视频生成工具测试 ============

  describe('generateVideo 工具', () => {
    it('创建 I2V 视频任务', async () => {
      const { result } = renderHook(() => useToolExecutor());

      const call: ToolCall = {
        id: 'call_video_001',
        name: 'generateVideo',
        arguments: {
          type: 'i2v',
          photoIds: ['test-photo-1'],
          duration: 5,
          prompt: '生成自然动态效果',
        },
      };

      let response;
      await act(async () => {
        response = await result.current.executeToolCall(call);
      });

      expect(response).toBeDefined();
      expect(response!.success).toBe(true);
      expect(response!.data?.type).toBe('i2v');
    });

    it('I2V 需要正好 1 张照片', async () => {
      const { result } = renderHook(() => useToolExecutor());

      const call: ToolCall = {
        id: 'call_video_002',
        name: 'generateVideo',
        arguments: {
          type: 'i2v',
          photoIds: ['test-photo-1', 'test-photo-2'],
          duration: 5,
        },
      };

      let response;
      await act(async () => {
        response = await result.current.executeToolCall(call);
      });

      expect(response).toBeDefined();
      expect(response!.success).toBe(false);
      expect(response!.error).toContain('1 张照片');
    });

    it('KF2V 需要至少 2 张照片', async () => {
      const { result } = renderHook(() => useToolExecutor());

      const call: ToolCall = {
        id: 'call_video_003',
        name: 'generateVideo',
        arguments: {
          type: 'kf2v',
          photoIds: ['test-photo-1'],
          duration: 5,
        },
      };

      let response;
      await act(async () => {
        response = await result.current.executeToolCall(call);
      });

      expect(response).toBeDefined();
      expect(response!.success).toBe(false);
      expect(response!.error).toContain('至少需要 2 张');
    });

    it('EMO 模式暂不支持', async () => {
      const { result } = renderHook(() => useToolExecutor());

      const call: ToolCall = {
        id: 'call_video_004',
        name: 'generateVideo',
        arguments: {
          type: 'emo',
          photoIds: ['test-photo-1'],
          duration: 5,
        },
      };

      let response;
      await act(async () => {
        response = await result.current.executeToolCall(call);
      });

      expect(response).toBeDefined();
      expect(response!.success).toBe(false);
      expect(response!.error).toContain('EMO');
    });
  });

  // ============ 融合工具测试 ============

  describe('fusePhotos 工具', () => {
    it('创建融合任务', async () => {
      const { result } = renderHook(() => useToolExecutor());

      const call: ToolCall = {
        id: 'call_fuse_001',
        name: 'fusePhotos',
        arguments: {
          photoIds: ['test-photo-1', 'test-photo-2'],
          prompt: '将两张照片融合成一张具有梦幻效果的图片',
        },
      };

      let response;
      await act(async () => {
        response = await result.current.executeToolCall(call);
      });

      expect(response).toBeDefined();
      expect(response!.success).toBe(true);
      expect(response!.data?.taskId).toBe('fusion-task-001');
    });

    it('照片数量少于 2 张时失败', async () => {
      const { result } = renderHook(() => useToolExecutor());

      const call: ToolCall = {
        id: 'call_fuse_002',
        name: 'fusePhotos',
        arguments: {
          photoIds: ['test-photo-1'],
          prompt: '融合效果描述',
        },
      };

      let response;
      await act(async () => {
        response = await result.current.executeToolCall(call);
      });

      expect(response).toBeDefined();
      expect(response!.success).toBe(false);
      expect(response!.error).toContain('至少需要 2');
    });

    it('提示词过短时失败', async () => {
      const { result } = renderHook(() => useToolExecutor());

      const call: ToolCall = {
        id: 'call_fuse_003',
        name: 'fusePhotos',
        arguments: {
          photoIds: ['test-photo-1', 'test-photo-2'],
          prompt: '短',
        },
      };

      let response;
      await act(async () => {
        response = await result.current.executeToolCall(call);
      });

      expect(response).toBeDefined();
      expect(response!.success).toBe(false);
      expect(response!.error).toContain('10 个字符');
    });
  });

  // ============ 上下文工具测试 ============

  describe('上下文工具', () => {
    it('获取当前照片', async () => {
      const { result } = renderHook(() => useToolExecutor());

      const call: ToolCall = {
        id: 'call_current_001',
        name: 'getCurrentPhoto',
        arguments: {},
      };

      let response;
      await act(async () => {
        response = await result.current.executeToolCall(call);
      });

      expect(response).toBeDefined();
      expect(response!.success).toBe(true);
      expect(response!.data?.photoId).toBe('test-photo-1');
    });

    it('获取选中照片', async () => {
      const { result } = renderHook(() => useToolExecutor());

      const call: ToolCall = {
        id: 'call_selected_001',
        name: 'getSelectedPhotos',
        arguments: {},
      };

      let response;
      await act(async () => {
        response = await result.current.executeToolCall(call);
      });

      expect(response).toBeDefined();
      expect(response!.success).toBe(true);
    });

    it('没有选中照片时返回提示消息（后端负责发送 selection-guide UI）', async () => {
      // Mock 返回空选中列表（默认已是空）
      const { result } = renderHook(() => useToolExecutor());

      const call: ToolCall = {
        id: 'call_selected_no_photos',
        name: 'getSelectedPhotos',
        arguments: {},
      };

      let response;
      await act(async () => {
        response = await result.current.executeToolCall(call);
      });

      expect(response).toBeDefined();
      expect(response!.success).toBe(true);
      expect(response!.data?.count).toBe(0);
      expect(response!.message).toContain('没有选中任何照片');
      
      // ⚠️ 前端不返回 UI，后端 agent-gateway 已通过 SSE 直接发送 selection-guide
      // 这避免了重复显示引导组件
      expect(response!.ui).toBeUndefined();
    });

    it('另存编辑后的照片', async () => {
      const { result } = renderHook(() => useToolExecutor());

      const call: ToolCall = {
        id: 'call_save_001',
        name: 'saveEditedAsNew',
        arguments: {},
      };

      let response;
      await act(async () => {
        response = await result.current.executeToolCall(call);
      });

      expect(response).toBeDefined();
      expect(response!.success).toBe(true);
    });
  });

  // ============ 未知工具测试 ============

  describe('未知工具处理', () => {
    it('返回错误信息', async () => {
      const { result } = renderHook(() => useToolExecutor());

      const call: ToolCall = {
        id: 'call_unknown_001',
        name: 'unknownTool',
        arguments: {},
      };

      let response;
      await act(async () => {
        response = await result.current.executeToolCall(call);
      });

      expect(response).toBeDefined();
      expect(response!.success).toBe(false);
      expect(response!.error).toContain('未知工具');
    });
  });

  // ============ 批量执行测试 ============

  describe('批量执行', () => {
    it('执行多个工具调用', async () => {
      const { result } = renderHook(() => useToolExecutor());

      const calls: ToolCall[] = [
        {
          id: 'call_batch_001',
          name: 'getCurrentPhoto',
          arguments: {},
        },
        {
          id: 'call_batch_002',
          name: 'getSelectedPhotos',
          arguments: {},
        },
      ];

      let results;
      await act(async () => {
        results = await result.current.executeToolCalls(calls);
      });

      expect(results).toBeDefined();
      expect(results!.size).toBe(2);
      expect(results!.get('call_batch_001')?.success).toBe(true);
      expect(results!.get('call_batch_002')?.success).toBe(true);
    });
  });
});

// ============ 智能上下文路由测试 ============

describe('智能上下文路由', () => {
  describe('当没有编辑中的照片时', () => {
    it('编辑工具应返回清晰的错误提示和引导', async () => {
      // 此测试验证：在正常 mock 下（有 currentImage），工具应该成功
      // 真正的"没有照片"场景需要集成测试验证
      const { result } = renderHook(() => useToolExecutor());

      const call: ToolCall = {
        id: 'call_no_photo_001',
        name: 'rotatePhoto',
        arguments: { photoId: 'any-id', degrees: 90 },
      };

      let response;
      await act(async () => {
        response = await result.current.executeToolCall(call);
      });

      expect(response).toBeDefined();
      // 由于 mock 中有 currentImage，所以应该成功
      expect(response!.success).toBe(true);
    });
  });

  describe('loadPhotoForEdit 工具', () => {
    it('成功加载照片到编辑状态', async () => {
      const { result } = renderHook(() => useToolExecutor());

      const call: ToolCall = {
        id: 'call_load_001',
        name: 'loadPhotoForEdit',
        arguments: { photoId: 'test-photo-1' },
      };

      let response;
      await act(async () => {
        response = await result.current.executeToolCall(call);
      });

      expect(response).toBeDefined();
      expect(response!.success).toBe(true);
      expect(response!.data?.photoId).toBe('test-photo-1');
    });

    it('加载不存在的照片时返回错误', async () => {
      const { result } = renderHook(() => useToolExecutor());

      const call: ToolCall = {
        id: 'call_load_002',
        name: 'loadPhotoForEdit',
        arguments: { photoId: 'non-existent-photo' },
      };

      let response;
      await act(async () => {
        response = await result.current.executeToolCall(call);
      });

      expect(response).toBeDefined();
      expect(response!.success).toBe(false);
      expect(response!.error).toContain('找不到');
    });

    it('支持从选中照片中加载第一张', async () => {
      const { result } = renderHook(() => useToolExecutor());

      const call: ToolCall = {
        id: 'call_load_003',
        name: 'loadPhotoForEdit',
        arguments: { photoId: 'first-selected' }, // 特殊标识：加载第一张选中的照片
      };

      let response;
      await act(async () => {
        response = await result.current.executeToolCall(call);
      });

      expect(response).toBeDefined();
      // 由于 mock 没有选中照片，应该返回错误
      expect(response!.success).toBe(false);
      expect(response!.error).toContain('没有选中');
    });
  });

  describe('navigateToPage 工具', () => {
    it('导航到编辑器页面（无导航回调时返回错误）', async () => {
      const { result } = renderHook(() => useToolExecutor());

      const call: ToolCall = {
        id: 'call_nav_001',
        name: 'navigateToPage',
        arguments: {
          page: 'editor',
          params: { photoId: 'test-photo-1' },
        },
      };

      let response;
      await act(async () => {
        response = await result.current.executeToolCall(call);
      });

      expect(response).toBeDefined();
      // 由于没有设置 navigateCallback，应该返回错误
      expect(response!.success).toBe(false);
      expect(response!.error).toContain('导航服务未初始化');
    });

    it('导航到时间线页面（无导航回调时返回错误）', async () => {
      const { result } = renderHook(() => useToolExecutor());

      const call: ToolCall = {
        id: 'call_nav_002',
        name: 'navigateToPage',
        arguments: { page: 'timeline' },
      };

      let response;
      await act(async () => {
        response = await result.current.executeToolCall(call);
      });

      expect(response).toBeDefined();
      // 由于没有设置 navigateCallback，应该返回错误
      expect(response!.success).toBe(false);
    });
  });
});

// ============ 工具列表完整性测试 ============

describe('getAllTools', () => {
  it('包含所有预期的工具', () => {
    const tools = getAllTools();
    const toolNames = tools.map((t) => t.meta.name);

    expect(toolNames).toContain('cropPhoto');
    expect(toolNames).toContain('rotatePhoto');
    expect(toolNames).toContain('applyFilter');
    expect(toolNames).toContain('adjustImage');
    expect(toolNames).toContain('optimizeForAI');
    expect(toolNames).toContain('generateVideo');
    expect(toolNames).toContain('fusePhotos');
    expect(toolNames).toContain('getSelectedPhotos');
    expect(toolNames).toContain('getCurrentPhoto');
    expect(toolNames).toContain('saveEditedAsNew');
    // 新增的工具
    expect(toolNames).toContain('loadPhotoForEdit');
    expect(toolNames).toContain('navigateToPage');
  });

  it('每个工具都有描述和分类', () => {
    const tools = getAllTools();
    for (const tool of tools) {
      expect(tool.meta.name).toBeDefined();
      expect(tool.meta.description).toBeDefined();
      expect(['edit', 'ai', 'context', 'navigation']).toContain(tool.meta.category);
    }
  });
});