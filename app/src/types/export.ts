export interface ExportStatistics {
  photoCount: number;
  albumCount: number;
  personCount: number;
  tagCount: number;
}

export interface ExportPhotoData {
  id: string;
  uploadedAt: string;
  tags: string[];
  metadata: {
    width: number;
    height: number;
    size: number;
    format: string;
  };
  faces: Array<{
    personId: string;
    boundingBox: {
      x: number;
      y: number;
      width: number;
      height: number;
    };
    confidence: number;
  }>;
  cloudStoragePath?: string;
}

export interface ExportAlbumData {
  id: string;
  title: string;
  description: string;
  type: string;
  coverPhoto: string;
  photoIds: string[];
  createdAt: string;
  updatedAt: string;
}

export interface ExportPersonData {
  id: string;
  name: string;
  department: string;
  joinedAt: string;
  photoCount: number;
}

export interface ExportTagData {
  name: string;
  count: number;
}

export interface ExportData {
  version: string;
  exportedAt: string;
  userId: string;
  checksum: string;
  
  statistics: ExportStatistics;
  
  photos: ExportPhotoData[];
  albums: ExportAlbumData[];
  persons: ExportPersonData[];
  tags: ExportTagData[];
}

export interface ExportProgress {
  phase: 'photos' | 'albums' | 'persons' | 'tags' | 'serializing' | 'downloading';
  current: number;
  total: number;
  percentage: number;
}
