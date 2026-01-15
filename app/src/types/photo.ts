/**
 * Photo 相关类型定义
 * @description 照片相关的类型定义，包括同步状态、元数据等
 */

/**
 * 云同步状态类型
 */
export type CloudSyncStatus =
  | 'synced' // 已同步
  | 'syncing' // 同步中
  | 'pending' // 待同步
  | 'error' // 同步错误
  | 'offline' // 离线
  | 'local-only' // 仅本地

/**
 * 照片元数据
 */
export interface PhotoMetadata {
  width: number
  height: number
  size: number
  format: string
  fileName?: string
}

/**
 * 照片类型定义
 */
export interface Photo {
  id: string
  base64: string
  thumbnail: string
  uploadedAt: Date
  takenAt: Date | null
  tags: string[]
  faces: string[]
  metadata: PhotoMetadata

  // 数据库字段
  width?: number
  height?: number
  file_size?: number
  mime_type?: string

  // 云同步字段
  cloudSyncStatus?: CloudSyncStatus
  cloudStoragePath?: string
  cloudSyncProgress?: number
  cloudUrl?: string

  // OSS 字段 (v5.0)
  oss_url?: string
  oss_key?: string
  file_hash?: string

  // 版本控制
  version?: number
}
