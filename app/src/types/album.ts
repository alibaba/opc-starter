// 相册相关类型定义

/**
 * 相册可见性
 */
export type AlbumVisibility = 'private' | 'organization' | 'public'

/**
 * 相册类型
 */
export type AlbumType = 'normal' | 'slideshow' | 'shared'

/**
 * 幻灯片设置
 */
export interface SlideshowSettings {
  /** 自动播放 */
  autoPlay?: boolean
  /** 播放间隔（毫秒） */
  interval?: number
  /** 转场效果 */
  transition?: 'fade' | 'slide' | 'zoom'
  /** 循环播放 */
  loop?: boolean
  /** 显示标题 */
  showTitle?: boolean
}

/**
 * 相册数据
 */
export interface Album {
  id: string
  title: string
  description: string
  type: AlbumType | string
  coverPhoto: string
  photoIds: string[]
  slideshowSettings?: SlideshowSettings
  visibility: AlbumVisibility
  organizationId?: string
  createdAt: Date
  updatedAt: Date
}

/**
 * 创建相册参数
 */
export interface CreateAlbumParams {
  title: string
  description?: string
  type: AlbumType | string
  photoIds: string[]
  visibility?: AlbumVisibility
  organizationId?: string
}

/**
 * 更新相册参数
 */
export interface UpdateAlbumParams {
  title?: string
  description?: string
  photoIds?: string[]
  slideshowSettings?: SlideshowSettings
  visibility?: AlbumVisibility
}
