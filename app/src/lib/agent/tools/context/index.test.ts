import { describe, it, expect, beforeEach, vi } from 'vitest';
import { getSelectedPhotosTool } from './getSelected';
import { getCurrentPhotoTool } from './getCurrent';
import { loadPhotoForEditTool } from './loadPhoto';

vi.mock('@/stores/usePhotoStore', () => ({
  usePhotoStore: {
    getState: vi.fn(),
  },
}));

vi.mock('@/stores/usePhotoEditorStore', () => ({
  usePhotoEditorStore: {
    getState: vi.fn(),
  },
}));

vi.mock('@/stores/useBatchSelectionStore', () => ({
  useBatchSelectionStore: {
    getState: vi.fn(() => ({
      getSelectedPhotos: vi.fn(() => []),
    })),
  },
}));

import { usePhotoStore } from '@/stores/usePhotoStore';
import { usePhotoEditorStore } from '@/stores/usePhotoEditorStore';

describe('getSelectedPhotosTool', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should have correct metadata', () => {
    expect(getSelectedPhotosTool.meta.name).toBe('getSelectedPhotos');
    expect(getSelectedPhotosTool.meta.category).toBe('context');
  });

  it('should return empty when no photos selected', async () => {
    vi.mocked(usePhotoStore.getState).mockReturnValue({
      photos: [],
    } as ReturnType<typeof usePhotoStore.getState>);

    const result = await getSelectedPhotosTool.execute({});

    expect(result.success).toBe(true);
    expect(result.data?.count).toBe(0);
  });
});

describe('getCurrentPhotoTool', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should have correct metadata', () => {
    expect(getCurrentPhotoTool.meta.name).toBe('getCurrentPhoto');
    expect(getCurrentPhotoTool.meta.category).toBe('context');
  });

  it('should return error when no photo being edited', async () => {
    vi.mocked(usePhotoEditorStore.getState).mockReturnValue({
      originalPhoto: null,
      currentImage: null,
      filter: 'original',
      brightness: 0,
      contrast: 0,
      saturation: 0,
    } as ReturnType<typeof usePhotoEditorStore.getState>);

    const result = await getCurrentPhotoTool.execute({});

    expect(result.success).toBe(false);
    expect(result.error).toContain('没有正在编辑的照片');
  });

  it('should return current photo with preview', async () => {
    vi.mocked(usePhotoEditorStore.getState).mockReturnValue({
      originalPhoto: { id: 'photo-1', oss_url: 'http://example.com/photo.jpg', base64: null },
      currentImage: 'data:image/png;base64,test',
      filter: 'grayscale',
      brightness: 10,
      contrast: 0,
      saturation: 0,
    } as ReturnType<typeof usePhotoEditorStore.getState>);

    const result = await getCurrentPhotoTool.execute({});

    expect(result.success).toBe(true);
    expect(result.data?.photoId).toBe('photo-1');
    expect(result.ui?.type).toBe('photo-editor-preview');
  });
});

describe('loadPhotoForEditTool', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should have correct metadata', () => {
    expect(loadPhotoForEditTool.meta.name).toBe('loadPhotoForEdit');
    expect(loadPhotoForEditTool.meta.category).toBe('context');
  });

  it('should return error when photo not found', async () => {
    vi.mocked(usePhotoStore.getState).mockReturnValue({
      photos: [],
    } as ReturnType<typeof usePhotoStore.getState>);

    const result = await loadPhotoForEditTool.execute({
      photoId: 'non-existent',
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain('找不到照片');
  });

  it('should load photo successfully', async () => {
    const mockLoadPhoto = vi.fn();
    vi.mocked(usePhotoStore.getState).mockReturnValue({
      photos: [{ id: 'photo-1', oss_url: 'http://example.com/photo.jpg' }],
    } as ReturnType<typeof usePhotoStore.getState>);

    vi.mocked(usePhotoEditorStore.getState).mockReturnValue({
      loadPhoto: mockLoadPhoto,
    } as unknown as ReturnType<typeof usePhotoEditorStore.getState>);

    const result = await loadPhotoForEditTool.execute({
      photoId: 'photo-1',
    });

    expect(result.success).toBe(true);
    expect(mockLoadPhoto).toHaveBeenCalled();
    expect(result.ui?.type).toBe('photo-editor-preview');
  });
});
