import { describe, it, expect, beforeEach, vi } from 'vitest';
import { navigationTool, setNavigateCallback } from './index';

describe('navigationTool', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setNavigateCallback(null);
  });

  it('should have correct metadata', () => {
    expect(navigationTool.meta.name).toBe('navigateToPage');
    expect(navigationTool.meta.category).toBe('navigation');
  });

  it('should validate page parameter', async () => {
    const result = await navigationTool.validateAndExecute({
      page: 'invalid-page',
    });
    expect(result.success).toBe(false);
    expect(result.error).toContain('参数验证失败');
  });

  it('should return error when navigate callback not set', async () => {
    const result = await navigationTool.execute({
      page: 'timeline',
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain('导航服务未初始化');
  });

  it('should navigate to timeline', async () => {
    const mockNavigate = vi.fn();
    setNavigateCallback(mockNavigate);

    const result = await navigationTool.execute({
      page: 'timeline',
    });

    expect(result.success).toBe(true);
    expect(mockNavigate).toHaveBeenCalledWith('/timeline');
  });

  it('should require photoId for editor navigation', async () => {
    const mockNavigate = vi.fn();
    setNavigateCallback(mockNavigate);

    const result = await navigationTool.execute({
      page: 'editor',
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain('需要指定 photoId');
  });

  it('should navigate to editor with photoId', async () => {
    const mockNavigate = vi.fn();
    setNavigateCallback(mockNavigate);

    const result = await navigationTool.execute({
      page: 'editor',
      params: { photoId: 'photo-123' },
    });

    expect(result.success).toBe(true);
    expect(mockNavigate).toHaveBeenCalledWith('/photo-editor?id=photo-123');
  });

  it('should navigate to album with albumId', async () => {
    const mockNavigate = vi.fn();
    setNavigateCallback(mockNavigate);

    const result = await navigationTool.execute({
      page: 'album',
      params: { albumId: 'album-456' },
    });

    expect(result.success).toBe(true);
    expect(mockNavigate).toHaveBeenCalledWith('/albums/album-456');
  });
});
