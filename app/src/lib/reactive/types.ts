import type { Observable } from 'rxjs'

export interface BaseEntity {
  id: string
  clientId?: string
  createdAt?: Date
  updatedAt?: Date
}

export interface QueryOptions<T> {
  filter?: Partial<T> | ((item: T) => boolean)
  sort?: { field: keyof T; order: 'asc' | 'desc' }
  limit?: number
  offset?: number
}

export interface Change<T> {
  type: 'INSERT' | 'UPDATE' | 'DELETE'
  doc?: T
  id?: string
  oldDoc?: T
}

export interface LocalAdapter<T extends BaseEntity> {
  findAll(): Promise<T[]>
  findOne(id: string): Promise<T | undefined>
  query(options: QueryOptions<T>): Promise<T[]>
  upsert(doc: T): Promise<void>
  bulkUpsert(docs: T[]): Promise<void>
  remove(id: string): Promise<void>
  clear(): Promise<void>
  
  observe?(): Observable<Change<T>>
}

export interface RemoteAdapter<T extends BaseEntity> {
  fetch(options?: QueryOptions<T>): Promise<T[]>
  fetchOne(id: string): Promise<T | undefined>
  insert(doc: Omit<T, 'id'>): Promise<T>
  update(id: string, changes: Partial<T>): Promise<T>
  remove(id: string): Promise<void>
  
  subscribe(callback: (change: Change<T>) => void): () => void
}

export interface ReactiveCollectionOptions<T extends BaseEntity> {
  localAdapter: LocalAdapter<T>
  remoteAdapter?: RemoteAdapter<T>
  onError?: (error: Error, operation: string) => void
  conflictResolver?: (local: T, remote: T) => T
}

export interface SyncStatus {
  status: 'idle' | 'syncing' | 'synced' | 'error' | 'offline'
  pendingCount: number
  lastSyncAt?: Date
  error?: Error
}

export interface PendingOperation<T> {
  id: string
  type: 'INSERT' | 'UPDATE' | 'DELETE'
  entity: string
  data?: Partial<T>
  timestamp: number
  retryCount: number
}

export interface SyncEngineOptions<T extends BaseEntity> {
  localAdapter: LocalAdapter<T>
  remoteAdapter: RemoteAdapter<T>
  entityName: string
  conflictResolver?: (local: T, remote: T) => T
  onSyncStatusChange?: (status: SyncStatus) => void
  maxRetries?: number
  persistQueue?: boolean
}

export type ConflictResolver<T> = (local: T, remote: T) => T