import { useState, useCallback } from 'react';
import { photoPermissionService, type PhotoQueryOptions } from '@/services/photoPermissionService';
import type { Photo } from '@/lib/supabase/organizationTypes';

export interface UsePhotoPermissionResult {
  photos: Photo[];
  isLoading: boolean;
  error: string | null;
  fetchPhotos: (options?: PhotoQueryOptions) => Promise<void>;
  fetchPhoto: (id: string) => Promise<Photo | null>;
  updatePhoto: (photoId: string, updates: Partial<Photo>, userId: string) => Promise<Photo>;
  deletePhoto: (photoId: string, userId: string) => Promise<void>;
  canEdit: (photoId: string, userId: string) => Promise<boolean>;
  canDelete: (photoId: string, userId: string) => Promise<boolean>;
}

export function usePhotoPermission(): UsePhotoPermissionResult {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPhotos = useCallback(async (options?: PhotoQueryOptions) => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await photoPermissionService.getPhotos(options);
      setPhotos(data);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to fetch photos';
      setError(errorMsg);
      console.error('Failed to fetch photos:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchPhoto = useCallback(async (id: string): Promise<Photo | null> => {
    try {
      setError(null);
      return await photoPermissionService.getPhoto(id);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to fetch photo';
      setError(errorMsg);
      console.error('Failed to fetch photo:', err);
      return null;
    }
  }, []);

  const updatePhoto = useCallback(
    async (photoId: string, updates: Partial<Photo>, userId: string): Promise<Photo> => {
      try {
        setError(null);
        const updated = await photoPermissionService.updatePhoto(photoId, updates, userId);
        setPhotos((prev) => prev.map((p) => (p.id === photoId ? updated : p)));
        return updated;
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Failed to update photo';
        setError(errorMsg);
        throw err;
      }
    },
    []
  );

  const deletePhoto = useCallback(
    async (photoId: string, userId: string): Promise<void> => {
      try {
        setError(null);
        await photoPermissionService.deletePhoto(photoId, userId);
        setPhotos((prev) => prev.filter((p) => p.id !== photoId));
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Failed to delete photo';
        setError(errorMsg);
        throw err;
      }
    },
    []
  );

  const canEdit = useCallback(async (photoId: string, userId: string): Promise<boolean> => {
    try {
      return await photoPermissionService.canEditPhoto(photoId, userId);
    } catch (err) {
      console.error('Failed to check edit permission:', err);
      return false;
    }
  }, []);

  const canDelete = useCallback(async (photoId: string, userId: string): Promise<boolean> => {
    try {
      return await photoPermissionService.canDeletePhoto(photoId, userId);
    } catch (err) {
      console.error('Failed to check delete permission:', err);
      return false;
    }
  }, []);

  return {
    photos,
    isLoading,
    error,
    fetchPhotos,
    fetchPhoto,
    updatePhoto,
    deletePhoto,
    canEdit,
    canDelete,
  };
}
