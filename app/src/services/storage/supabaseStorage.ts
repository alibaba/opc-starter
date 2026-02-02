/**
 * Supabase Storage 服务
 * OPC-Starter 的文件存储服务
 */

import { supabase } from '@/lib/supabase/client';

export interface UploadResult {
  success: boolean;
  path?: string;
  publicUrl?: string;
  error?: string;
}

export interface StorageFile {
  name: string;
  id: string;
  updated_at: string;
  created_at: string;
  last_accessed_at: string;
  metadata: Record<string, unknown>;
}

/**
 * Supabase Storage 服务类
 */
class SupabaseStorageService {
  private defaultBucket = 'avatars';

  /**
   * 上传文件
   */
  async upload(
    file: File,
    path: string,
    bucket: string = this.defaultBucket
  ): Promise<UploadResult> {
    try {
      const { data, error } = await supabase.storage
        .from(bucket)
        .upload(path, file, {
          cacheControl: '3600',
          upsert: true,
        });

      if (error) {
        console.error('[Storage] Upload error:', error);
        return { success: false, error: error.message };
      }

      const { data: urlData } = supabase.storage
        .from(bucket)
        .getPublicUrl(data.path);

      return {
        success: true,
        path: data.path,
        publicUrl: urlData.publicUrl,
      };
    } catch (error) {
      console.error('[Storage] Upload exception:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * 删除文件
   */
  async delete(paths: string[], bucket: string = this.defaultBucket): Promise<boolean> {
    try {
      const { error } = await supabase.storage
        .from(bucket)
        .remove(paths);

      if (error) {
        console.error('[Storage] Delete error:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('[Storage] Delete exception:', error);
      return false;
    }
  }

  /**
   * 获取文件公开 URL
   */
  getPublicUrl(path: string, bucket: string = this.defaultBucket): string {
    const { data } = supabase.storage
      .from(bucket)
      .getPublicUrl(path);

    return data.publicUrl;
  }

  /**
   * 获取带签名的临时 URL
   */
  async getSignedUrl(
    path: string,
    expiresIn: number = 3600,
    bucket: string = this.defaultBucket
  ): Promise<string | null> {
    try {
      const { data, error } = await supabase.storage
        .from(bucket)
        .createSignedUrl(path, expiresIn);

      if (error) {
        console.error('[Storage] SignedUrl error:', error);
        return null;
      }

      return data.signedUrl;
    } catch (error) {
      console.error('[Storage] SignedUrl exception:', error);
      return null;
    }
  }

  /**
   * 列出文件
   */
  async list(
    path: string = '',
    bucket: string = this.defaultBucket
  ): Promise<StorageFile[]> {
    try {
      const { data, error } = await supabase.storage
        .from(bucket)
        .list(path);

      if (error) {
        console.error('[Storage] List error:', error);
        return [];
      }

      return data as StorageFile[];
    } catch (error) {
      console.error('[Storage] List exception:', error);
      return [];
    }
  }

  /**
   * 下载文件
   */
  async download(
    path: string,
    bucket: string = this.defaultBucket
  ): Promise<Blob | null> {
    try {
      const { data, error } = await supabase.storage
        .from(bucket)
        .download(path);

      if (error) {
        console.error('[Storage] Download error:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('[Storage] Download exception:', error);
      return null;
    }
  }
}

export const storageService = new SupabaseStorageService();
