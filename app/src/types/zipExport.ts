/**
 * ZIP 导出选项与进度类型定义
 */
export type ZipExportRange = 'all' | 'album' | 'dateRange'
export type ZipOrganizeBy = 'album' | 'date' | 'flat'

export interface ZipExportOptions {
  range?: ZipExportRange
  albumId?: string
  startDate?: Date
  endDate?: Date
  organizeBy?: ZipOrganizeBy
  includeCloudPhotos?: boolean
}

export interface ZipExportProgress {
  phase: 'collecting' | 'compressing' | 'downloading'
  current: number
  total: number
  percentage: number
  currentFile?: string
  estimatedSize?: number
  estimatedTime?: number
}
