/**
 * SkillStorageService - Skill 文件上传/下载服务
 * 封装 Supabase Storage 和 Edge Functions
 */

import { supabase } from '@/lib/supabase/client'
import type {
  PublishVersionRequest,
  DownloadSkillRequest,
  DownloadSkillResponse,
} from '@/types/skill'

// Edge Function URL (unused, kept for future reference)
// const EDGE_FUNCTION_URL = '/functions/v1';

export const skillStorageService = {
  /**
   * 发布新版本（调用 Edge Function）
   * 返回上传签名 URL
   */
  async publishVersion(request: PublishVersionRequest): Promise<{
    upload_url: string
    storage_path: string
    version_id: string
  }> {
    const { data, error } = await supabase.functions.invoke('skills-publish', {
      body: {
        action: 'publish_version',
        ...request,
      },
    })

    if (error) throw error
    return data
  },

  /**
   * 上传文件到 Storage（使用签名 URL）
   * 支持进度回调
   */
  async uploadWithSignedUrl(
    signedUrl: string,
    file: File,
    onProgress?: (progress: number) => void
  ): Promise<void> {
    // 使用 XMLHttpRequest 支持上传进度
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest()

      xhr.upload.addEventListener('progress', (event) => {
        if (event.lengthComputable && onProgress) {
          const progress = Math.round((event.loaded / event.total) * 100)
          onProgress(progress)
        }
      })

      xhr.addEventListener('load', () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve()
        } else {
          reject(new Error(`Upload failed: ${xhr.statusText}`))
        }
      })

      xhr.addEventListener('error', () => {
        reject(new Error('Upload failed: Network error'))
      })

      xhr.addEventListener('abort', () => {
        reject(new Error('Upload aborted'))
      })

      xhr.open('PUT', signedUrl)
      xhr.setRequestHeader('Content-Type', file.type || 'application/zip')
      xhr.send(file)
    })
  },

  /**
   * 获取下载链接（调用 Edge Function）
   */
  async getDownloadUrl(request: DownloadSkillRequest): Promise<DownloadSkillResponse> {
    const { data, error } = await supabase.functions.invoke('skills-download', {
      body: request,
    })

    if (error) throw error
    return data
  },

  /**
   * 下载文件（浏览器）
   */
  async downloadFile(downloadUrl: string, filename: string): Promise<void> {
    const response = await fetch(downloadUrl)
    if (!response.ok) {
      throw new Error(`Download failed: ${response.statusText}`)
    }

    const blob = await response.blob()
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    window.URL.revokeObjectURL(url)
  },

  /**
   * 直接上传文件到 Storage
   */
  async uploadFile(file: File, path: string): Promise<{ path: string }> {
    const { data, error } = await supabase.storage.from('skills').upload(path, file, {
      contentType: file.type || 'application/zip',
      upsert: false,
    })

    if (error) throw error
    return { path: data.path }
  },

  /**
   * 直接发布版本（绕过 signed URL，适用于 Aliyun Supabase）
   * 直接上传文件 + 写入版本记录，不经过 Edge Function
   */
  async publishVersionDirect(params: {
    skill_id: string
    skill_slug: string
    user_id: string
    version: string
    changelog: string
    file: File
    onProgress?: (progress: number) => void
  }): Promise<{ storage_path: string }> {
    const storagePath = `${params.user_id}/${params.skill_slug}/${params.version}/package.zip`

    // 1. 直接上传文件到 Storage
    const { error: uploadError } = await supabase.storage
      .from('skills')
      .upload(storagePath, params.file, {
        contentType: params.file.type || 'application/zip',
        upsert: true,
      })
    if (uploadError) throw uploadError
    params.onProgress?.(50)

    // 2. 写入版本记录
    const { error: versionError } = await supabase.from('skill_versions').insert({
      skill_id: params.skill_id,
      version: params.version,
      storage_path: storagePath,
      file_size: params.file.size,
      changelog: params.changelog || null,
    })
    if (versionError) throw versionError
    params.onProgress?.(80)

    // 3. 更新 skill 的 latest_version
    const { error: updateError } = await supabase
      .from('skills')
      .update({ latest_version: params.version })
      .eq('id', params.skill_id)
    if (updateError) throw updateError
    params.onProgress?.(100)

    return { storage_path: storagePath }
  },

  /**
   * 删除文件
   */
  async deleteFile(path: string): Promise<void> {
    const { error } = await supabase.storage.from('skills').remove([path])
    if (error) throw error
  },

  /**
   * 获取文件公开 URL（如果 bucket 是 public）
   */
  getPublicUrl(path: string): string {
    const { data } = supabase.storage.from('skills').getPublicUrl(path)
    return data.publicUrl
  },

  /**
   * 验证文件类型
   */
  validateFileType(file: File): boolean {
    const allowedTypes = [
      'application/zip',
      'application/x-zip-compressed',
      'application/x-tar',
      'application/gzip',
    ]
    return allowedTypes.includes(file.type)
  },

  /**
   * 验证文件大小（最大 10MB）
   */
  validateFileSize(file: File): boolean {
    const maxSize = 10 * 1024 * 1024 // 10MB
    return file.size <= maxSize
  },

  /**
   * 格式化文件大小
   */
  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  },

  /**
   * 删除 Skill 在 Storage 中的所有文件
   * 需在 skillService.delete() 之前调用
   */
  async deleteSkillFiles(authorId: string, slug: string): Promise<void> {
    const prefix = `${authorId}/${slug}/`
    const { data: files } = await supabase.storage.from('skills').list(prefix, { limit: 1000 })

    if (files && files.length > 0) {
      await supabase.storage.from('skills').remove(files.map((f) => `${prefix}${f.name}`))
    }
  },
}
