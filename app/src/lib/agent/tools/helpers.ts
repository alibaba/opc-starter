import { usePhotoStore } from '@/stores/usePhotoStore';
import { usePhotoEditorStore } from '@/stores/usePhotoEditorStore';
import type { ToolExecutionResult } from './types';

export type FlipDirection = 'horizontal' | 'vertical';

export function createSelectionGuideResult(
  targetAction: string,
  minPhotos: number = 1
): ToolExecutionResult {
  return {
    success: false,
    error: '没有正在编辑的图片，也没有选中任何照片。',
    ui: {
      id: `selection-guide-${targetAction}-${Date.now()}`,
      type: 'selection-guide',
      props: {
        title: '需要先选择照片',
        targetAction,
        minPhotos,
        showNavigateButton: true,
      },
    },
  };
}

export async function tryLoadPhotoById(photoId: string): Promise<{
  photoId: string;
  imageSrc: string;
} | null> {
  try {
    if (!photoId) {
      return null;
    }

    const { photos } = usePhotoStore.getState();
    const targetPhoto = photos.find((p) => p.id === photoId);

    if (!targetPhoto) {
      return null;
    }

    usePhotoEditorStore.getState().loadPhoto(targetPhoto);

    return {
      photoId: targetPhoto.id,
      imageSrc: targetPhoto.oss_url || targetPhoto.base64 || '',
    };
  } catch {
    return null;
  }
}

export async function tryAutoLoadSelectedPhoto(): Promise<{
  photoId: string;
  imageSrc: string;
} | null> {
  try {
    const { useBatchSelectionStore } = await import('@/stores/useBatchSelectionStore');
    const selectedPhotoIds = useBatchSelectionStore.getState().getSelectedPhotos();

    if (selectedPhotoIds.length === 0) {
      return null;
    }

    const { photos } = usePhotoStore.getState();
    const targetPhoto = photos.find((p) => p.id === selectedPhotoIds[0]);

    if (!targetPhoto) {
      return null;
    }

    usePhotoEditorStore.getState().loadPhoto(targetPhoto);

    return {
      photoId: targetPhoto.id,
      imageSrc: targetPhoto.oss_url || targetPhoto.base64 || '',
    };
  } catch {
    return null;
  }
}

export async function rotateImageWithCanvas(
  imageDataUrl: string,
  degrees: number
): Promise<string> {
  if (typeof document === 'undefined') {
    return imageDataUrl;
  }

  try {
    const testCanvas = document.createElement('canvas');
    const testCtx = testCanvas.getContext('2d');
    if (!testCtx || typeof testCtx.drawImage !== 'function') {
      return imageDataUrl;
    }
  } catch {
    return imageDataUrl;
  }

  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';

    const timeout = setTimeout(() => {
      reject(new Error('图片加载超时'));
    }, 10000);

    img.onload = () => {
      clearTimeout(timeout);

      try {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        if (!ctx) {
          reject(new Error('无法创建 Canvas 上下文'));
          return;
        }

        const isRotated90or270 = degrees === 90 || degrees === 270;
        canvas.width = isRotated90or270 ? img.height : img.width;
        canvas.height = isRotated90or270 ? img.width : img.height;

        ctx.translate(canvas.width / 2, canvas.height / 2);
        ctx.rotate((degrees * Math.PI) / 180);
        ctx.drawImage(img, -img.width / 2, -img.height / 2);

        const rotatedDataUrl = canvas.toDataURL('image/jpeg', 0.92);
        resolve(rotatedDataUrl);
      } catch (error) {
        reject(error);
      }
    };

    img.onerror = () => {
      clearTimeout(timeout);
      reject(new Error('加载图片失败'));
    };

    img.src = imageDataUrl;
  });
}

/**
 * 滤镜名称到 CSS filter 的映射
 */
function getFilterCSS(filterName: string): string {
  const filterMap: Record<string, string> = {
    original: '',
    grayscale: 'grayscale(100%)',
    sepia: 'sepia(100%)',
    invert: 'invert(100%)',
    'high-contrast': 'contrast(150%)',
    vintage: 'sepia(50%) contrast(90%) brightness(90%)',
    warm: 'sepia(30%) saturate(140%)',
    cool: 'hue-rotate(180deg) saturate(70%)',
    vibrant: 'saturate(150%) contrast(110%)',
    dramatic: 'contrast(150%) saturate(120%)',
    fade: 'contrast(80%) brightness(110%) saturate(80%)',
    film: 'sepia(20%) contrast(105%) brightness(95%)',
    noir: 'grayscale(100%) contrast(120%)',
  };
  return filterMap[filterName] || '';
}

/**
 * 将滤镜应用到图片并返回 base64
 * @description 在 Canvas 上应用滤镜效果，生成新的 base64 图片
 */
export async function applyFilterWithCanvas(
  imageDataUrl: string,
  filterName: string,
  brightness: number = 0,
  contrast: number = 0,
  saturation: number = 0
): Promise<string> {
  if (typeof document === 'undefined') {
    return imageDataUrl;
  }

  try {
    const testCanvas = document.createElement('canvas');
    const testCtx = testCanvas.getContext('2d');
    if (!testCtx || typeof testCtx.drawImage !== 'function') {
      return imageDataUrl;
    }
  } catch {
    return imageDataUrl;
  }

  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';

    const timeout = setTimeout(() => {
      reject(new Error('图片加载超时'));
    }, 30000);

    img.onload = () => {
      clearTimeout(timeout);

      try {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        if (!ctx) {
          reject(new Error('无法创建 Canvas 上下文'));
          return;
        }

        canvas.width = img.width;
        canvas.height = img.height;

        // 构建 CSS filter 字符串
        const filters: string[] = [];

        // 应用预设滤镜
        const filterCSS = getFilterCSS(filterName);
        if (filterCSS) {
          filters.push(filterCSS);
        }

        // 应用亮度调整 (brightness: -100 to 100 -> CSS: 0% to 200%)
        if (brightness !== 0) {
          filters.push(`brightness(${100 + brightness}%)`);
        }

        // 应用对比度调整 (contrast: -100 to 100 -> CSS: 0% to 200%)
        if (contrast !== 0) {
          filters.push(`contrast(${100 + contrast}%)`);
        }

        // 应用饱和度调整 (saturation: -100 to 100 -> CSS: 0% to 200%)
        if (saturation !== 0) {
          filters.push(`saturate(${100 + saturation}%)`);
        }

        // 应用滤镜
        if (filters.length > 0) {
          ctx.filter = filters.join(' ');
        }

        // 绘制图片
        ctx.drawImage(img, 0, 0);

        // 转换为 base64
        const filteredDataUrl = canvas.toDataURL('image/jpeg', 0.92);
        resolve(filteredDataUrl);
      } catch (error) {
        reject(error);
      }
    };

    img.onerror = () => {
      clearTimeout(timeout);
      reject(new Error('加载图片失败'));
    };

    img.src = imageDataUrl;
  });
}

export async function flipImageWithCanvas(
  imageDataUrl: string,
  direction: FlipDirection
): Promise<string> {
  if (typeof document === 'undefined') {
    return imageDataUrl;
  }

  try {
    const testCanvas = document.createElement('canvas');
    const testCtx = testCanvas.getContext('2d');
    if (!testCtx || typeof testCtx.drawImage !== 'function') {
      return imageDataUrl;
    }
  } catch {
    return imageDataUrl;
  }

  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';

    const timeout = setTimeout(() => {
      reject(new Error('图片加载超时'));
    }, 10000);

    img.onload = () => {
      clearTimeout(timeout);

      try {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        if (!ctx) {
          reject(new Error('无法创建 Canvas 上下文'));
          return;
        }

        canvas.width = img.width;
        canvas.height = img.height;

        if (direction === 'horizontal') {
          ctx.translate(canvas.width, 0);
          ctx.scale(-1, 1);
        } else {
          ctx.translate(0, canvas.height);
          ctx.scale(1, -1);
        }

        ctx.drawImage(img, 0, 0);

        const flippedDataUrl = canvas.toDataURL('image/jpeg', 0.92);
        resolve(flippedDataUrl);
      } catch (error) {
        reject(error);
      }
    };

    img.onerror = () => {
      clearTimeout(timeout);
      reject(new Error('加载图片失败'));
    };

    img.src = imageDataUrl;
  });
}