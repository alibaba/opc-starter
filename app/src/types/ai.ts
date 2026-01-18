/**
 * AI 相关类型定义
 * @version 2.0.0 - OPC-Starter 简化版本
 */

export interface SceneRecognitionResult {
  className: string
  category: string
  probability: number
  timestamp: number
}

export interface AutoTag {
  label: string
  confidence: number
  source: 'ai-scene' | 'ai-object' | 'ai-color' | 'ai-time'
  confirmed: boolean
  priority: number
}

export interface QualityMetrics {
  sharpness: number
  exposure: number
  composition: number
  colorfulness: number
  overall: number
}

export interface AITags {
  scenes?: SceneRecognitionResult[]
  autoTags?: AutoTag[]
  objects?: string[]
  setting?: string
  smartAlbums?: string[]
  qualityScore?: number
  qualityMetrics?: QualityMetrics
}
