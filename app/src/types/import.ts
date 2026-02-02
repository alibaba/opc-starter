export type ImportMode = 'merge' | 'replace';
export type ConflictStrategy = 'skip' | 'replace' | 'keep-both';

export interface ImportOptions {
  mode: ImportMode;
  conflictStrategy: ConflictStrategy;
}

export interface ImportProgress {
  phase: 'reading' | 'validating' | 'importing-metadata' | 'importing-photos' | 'done';
  current: number;
  total: number;
  percentage: number;
  currentItem?: string;
}

export interface ImportResult {
  success: boolean;
  imported: {
    photos: number;
    albums: number;
    persons: number;
    tags: number;
  };
  skipped: {
    photos: number;
    albums: number;
    persons: number;
  };
  errors: string[];
}
