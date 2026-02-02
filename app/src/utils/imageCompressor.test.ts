/**
 * 精简版单测：仅验证纯逻辑函数，移除依赖真实 Canvas/编码器的用例。
 */

import { describe, it, expect, vi, afterEach } from 'vitest';
import { isWebPSupported, estimateCompressedSize } from './imageCompressor';

const createFakeCanvas = (supportsWebP: boolean) => ({
  toDataURL: vi.fn(() =>
    supportsWebP ? 'data:image/webp;base64,' : 'data:image/png;base64,'
  ),
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('isWebPSupported', () => {
  it('返回 true 当 canvas 支持 webp', () => {
    const fakeCanvas = createFakeCanvas(true);
    const createElement = vi.fn(() => fakeCanvas as any);
    vi.stubGlobal('document', { createElement });

    expect(isWebPSupported()).toBe(true);
    expect(createElement).toHaveBeenCalledWith('canvas');
    expect(fakeCanvas.toDataURL).toHaveBeenCalledWith('image/webp');
  });

  it('返回 false 当 canvas 不支持 webp', () => {
    const fakeCanvas = createFakeCanvas(false);
    const createElement = vi.fn(() => fakeCanvas as any);
    vi.stubGlobal('document', { createElement });

    expect(isWebPSupported()).toBe(false);
  });
});

describe('estimateCompressedSize', () => {
  it('估算值应小于原始大小', () => {
    const originalSize = 1_024_000;
    const estimated = estimateCompressedSize(originalSize, 0.85);
    expect(estimated).toBeGreaterThan(0);
    expect(estimated).toBeLessThan(originalSize);
  });

  it('质量越高估算越小', () => {
    const originalSize = 1_024_000;
    const highQuality = estimateCompressedSize(originalSize, 0.95);
    const lowQuality = estimateCompressedSize(originalSize, 0.5);
    expect(highQuality).toBeLessThan(lowQuality);
  });

  it('不同文件大小都能给出正值', () => {
    [100_000, 1_000_000, 10_000_000].forEach((size) => {
      const estimated = estimateCompressedSize(size, 0.85);
      expect(estimated).toBeGreaterThan(0);
      expect(estimated).toBeLessThan(size);
    });
  });
});

