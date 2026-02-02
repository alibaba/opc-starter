export type VideoTaskType = 'i2v-single' | 'i2v-keyframe' | 'emo'
export type VideoTaskStatus = 'pending' | 'running' | 'succeeded' | 'failed'

export interface GeneratedVideo {
  id: string
  userId: string
  type: VideoTaskType
  sourcePhotoIds: string[]
  taskId: string
  status: VideoTaskStatus
  duration?: 5 | 10
  videoUrl?: string
  tempVideoUrl?: string
  errorMessage?: string
  
  audioUrl?: string
  audioDuration?: number
  audioSize?: number
  
  createdAt: number
  updatedAt: number
  completedAt?: number
}
