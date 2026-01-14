import { useState, useCallback } from 'react';
import { photoMetadataService, type PhotoMetadataInput, type EnhancedPhotoData } from '@/services/photoMetadataService';
import type { Photo } from '@/lib/supabase/organizationTypes';
import type { ExifData } from '@/lib/exif/exifParser';

export interface UsePhotoMetadataResult {
  extractExifData: (file: File) => Promise<ExifData>;
  preparePhotoData: (file: File, metadata: PhotoMetadataInput) => Promise<EnhancedPhotoData>;
  uploadPhoto: (photoData: EnhancedPhotoData, userId: string) => Promise<Photo>;
  batchUploadPhotos: (photosData: EnhancedPhotoData[], userId: string) => Promise<Photo[]>;
  updatePhotoMetadata: (photoId: string, updates: Partial<PhotoMetadataInput>, userId: string) => Promise<Photo>;
  validateMetadata: (metadata: PhotoMetadataInput) => { valid: boolean; errors: string[] };
  validateParticipants: (participants: string[]) => { valid: boolean; errors: string[] };
  isUploading: boolean;
  uploadProgress: { current: number; total: number } | null;
  error: string | null;
}

export function usePhotoMetadata(): UsePhotoMetadataResult {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{ current: number; total: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const extractExifData = useCallback(async (file: File): Promise<ExifData> => {
    try {
      setError(null);
      return await photoMetadataService.extractMetadata(file);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to extract EXIF data';
      setError(errorMsg);
      throw err;
    }
  }, []);

  const preparePhotoData = useCallback(async (
    file: File,
    metadata: PhotoMetadataInput
  ): Promise<EnhancedPhotoData> => {
    try {
      setError(null);
      const validation = photoMetadataService.validateMetadata(metadata);
      if (!validation.valid) {
        throw new Error(validation.errors.join(', '));
      }
      return await photoMetadataService.preparePhotoData(file, metadata);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to prepare photo data';
      setError(errorMsg);
      throw err;
    }
  }, []);

  const uploadPhoto = useCallback(async (
    photoData: EnhancedPhotoData,
    userId: string
  ): Promise<Photo> => {
    try {
      setError(null);
      setIsUploading(true);
      const result = await photoMetadataService.uploadPhoto(photoData, userId);
      return result;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to upload photo';
      setError(errorMsg);
      throw err;
    } finally {
      setIsUploading(false);
    }
  }, []);

  const batchUploadPhotos = useCallback(async (
    photosData: EnhancedPhotoData[],
    userId: string
  ): Promise<Photo[]> => {
    try {
      setError(null);
      setIsUploading(true);
      setUploadProgress({ current: 0, total: photosData.length });

      const results = await photoMetadataService.batchUploadPhotos(
        photosData,
        userId,
        (current, total) => {
          setUploadProgress({ current, total });
        }
      );

      return results;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to batch upload photos';
      setError(errorMsg);
      throw err;
    } finally {
      setIsUploading(false);
      setUploadProgress(null);
    }
  }, []);

  const updatePhotoMetadata = useCallback(async (
    photoId: string,
    updates: Partial<PhotoMetadataInput>,
    userId: string
  ): Promise<Photo> => {
    try {
      setError(null);
      return await photoMetadataService.updatePhotoMetadata(photoId, updates, userId);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to update photo metadata';
      setError(errorMsg);
      throw err;
    }
  }, []);

  const validateMetadata = useCallback((metadata: PhotoMetadataInput) => {
    return photoMetadataService.validateMetadata(metadata);
  }, []);

  const validateParticipants = useCallback((participants: string[]) => {
    return photoMetadataService.validateParticipants(participants);
  }, []);

  return {
    extractExifData,
    preparePhotoData,
    uploadPhoto,
    batchUploadPhotos,
    updatePhotoMetadata,
    validateMetadata,
    validateParticipants,
    isUploading,
    uploadProgress,
    error,
  };
}
