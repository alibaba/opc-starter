import type { Photo } from './photo'

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

export interface SimilarPhoto {
  id: string
  similarity: number
  photo: Photo
}

export interface DuplicateGroup {
  groupId: string
  photos: Array<{ id: string; similarity: number }>
  representative: string
}

export interface DuplicateDetectionResult {
  totalPhotos: number
  duplicateGroups: DuplicateGroup[]
  duplicateCount: number
  spaceWasted: number
}
