export interface DetectedFace {
  x: number
  y: number
  width: number
  height: number
}

export interface PeopleCountResult {
  photoId: string
  count: number
  faces: DetectedFace[]
  confidence: number
}

export interface AlbumPeopleCountResult {
  albumId: string
  totalPhotos: number
  analyzedPhotos: number
  results: PeopleCountResult[]
  summary: {
    totalPeopleDetected: number
    photosWithPeople: number
    maxPeopleInSinglePhoto: number
  }
}

export interface CountPeopleRequest {
  photoId: string
  imageUrl: string
}

export interface CountPeopleResponse {
  photoId: string
  count: number
  faces: DetectedFace[]
  confidence: number
  usage?: {
    prompt_tokens: number
    completion_tokens: number
    total_tokens: number
  }
}