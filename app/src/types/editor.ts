/**
 * 照片编辑器类型定义
 * @version 2.0.0 - OPC-Starter 简化版本
 */

import type { FilterType } from './filter'

/**
 * 简化的 Photo 类型（仅用于编辑器）
 */
interface Photo {
  id: string
  base64: string | null
  thumbnail: string | null
  oss_url: string | null
}

/**
 * 裁剪区域
 */
export interface CropArea {
  x: number
  y: number
  width: number
  height: number
}

/**
 * 裁剪比例
 */
export interface CropAspect {
  value: number | undefined
  label: string
}

/**
 * 预定义裁剪比例
 */
export const CROP_ASPECTS: Record<string, CropAspect> = {
  free: { value: undefined, label: '自由' },
  square: { value: 1, label: '1:1' },
  standard: { value: 4 / 3, label: '4:3' },
  widescreen: { value: 16 / 9, label: '16:9' },
  portrait: { value: 3 / 4, label: '3:4' },
}

/**
 * 编辑工具类型
 */
export type EditorTool = 'crop' | 'rotate' | 'filter' | 'adjust' | 'ai-optimize'

/**
 * 编辑步骤类型
 */
export type EditStepType = 'crop' | 'rotate' | 'filter' | 'adjust'

/**
 * 编辑步骤
 */
export interface EditStep {
  id: string
  type: EditStepType
  params: CropEditParams | RotateEditParams | FilterEditParams | AdjustEditParams
  imageData: string // base64
  timestamp: number
}

/**
 * 裁剪编辑参数
 */
export interface CropEditParams {
  cropArea: CropArea
  aspect?: number
}

/**
 * 旋转编辑参数
 */
export interface RotateEditParams {
  degrees: number // 0, 90, 180, 270
  flipHorizontal?: boolean
  flipVertical?: boolean
}

/**
 * 滤镜编辑参数
 */
export interface FilterEditParams {
  filter: FilterType
}

/**
 * 调整编辑参数
 */
export interface AdjustEditParams {
  brightness: number // -100 to 100
  contrast: number // -100 to 100
  saturation: number // -100 to 100
}

/**
 * 编辑器状态
 */
export interface PhotoEditorState {
  // 当前照片
  originalPhoto: Photo | null
  currentImage: string // base64

  // 编辑参数
  crop: CropArea | null
  rotation: number // 0, 90, 180, 270
  filter: FilterType
  brightness: number // -100 to 100
  contrast: number // -100 to 100
  saturation: number // -100 to 100

  // 历史记录
  history: EditStep[]
  historyIndex: number

  // UI 状态
  activeTool: EditorTool | null
  isProcessing: boolean
  isSaving: boolean

  // Actions
  loadPhoto: (photo: Photo) => void
  setActiveTool: (tool: EditorTool | null) => void
  applyCrop: (cropArea: CropArea, imageData: string) => void
  applyRotation: (degrees: number, imageData: string) => void
  applyFilter: (filter: FilterType, imageData: string) => void
  applyAdjust: (brightness: number, contrast: number, saturation: number, imageData: string) => void
  undo: () => void
  redo: () => void
  canUndo: () => boolean
  canRedo: () => boolean
  reset: () => void
  clearHistory: () => void
}
