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
   */
  async uploadWithSignedUrl(signedUrl: string, file: File): Promise<void> {
    const response = await fetch(signedUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': file.type || 'application/zip',
      },
      body: file,
    })

    if (!response.ok) {
      throw new Error(`Upload failed: ${response.statusText}`)
    }
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
   * 直接上传文件（开发测试用，生产环境使用签名 URL）
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
