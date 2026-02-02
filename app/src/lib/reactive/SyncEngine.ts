import type {
  BaseEntity,
  LocalAdapter,
  RemoteAdapter,
  SyncStatus,
  PendingOperation,
  SyncEngineOptions,
  ConflictResolver,
} from './types'

interface QueuedOperation {
  id?: string
  type: 'INSERT' | 'UPDATE' | 'DELETE'
  data?: Record<string, unknown>
}

const MERGE_FIELDS = ['tags', 'participants']

export class SyncEngine<T extends BaseEntity> {
  private localAdapter: LocalAdapter<T>
  private remoteAdapter: RemoteAdapter<T>
  private entityName: string
  private conflictResolver?: ConflictResolver<T>
  private onSyncStatusChange?: (status: SyncStatus) => void
  private maxRetries: number
  
  private isOnline = true
  private lastSyncTime?: Date
  private pendingQueue: PendingOperation<T>[] = []
  private syncStatus: SyncStatus = {
    status: 'idle',
    pendingCount: 0,
  }
  
  constructor(options: SyncEngineOptions<T>) {
    this.localAdapter = options.localAdapter
    this.remoteAdapter = options.remoteAdapter
    this.entityName = options.entityName
    this.conflictResolver = options.conflictResolver
    this.onSyncStatusChange = options.onSyncStatusChange
    this.maxRetries = options.maxRetries ?? 3
  }
  
  async initialSync(): Promise<void> {
    this.updateSyncStatus({ status: 'syncing', pendingCount: this.pendingQueue.length })
    
    try {
      const remoteData = await this.remoteAdapter.fetch()
      
      if (remoteData.length > 0) {
        await this.localAdapter.bulkUpsert(remoteData)
      }
      
      this.lastSyncTime = new Date()
      this.updateSyncStatus({ 
        status: 'synced', 
        pendingCount: this.pendingQueue.length,
        lastSyncAt: this.lastSyncTime,
      })
    } catch (error) {
      this.updateSyncStatus({ 
        status: 'error', 
        pendingCount: this.pendingQueue.length,
        error: error as Error,
      })
      throw error
    }
  }
  
  async deltaSync(): Promise<void> {
    if (!this.lastSyncTime) {
      return this.initialSync()
    }
    
    this.updateSyncStatus({ status: 'syncing', pendingCount: this.pendingQueue.length })
    
    try {
      const remoteData = await this.remoteAdapter.fetch({
        filter: {
          updated_at: { $gt: this.lastSyncTime.toISOString() }
        } as unknown as Partial<T>,
      })
      
      if (remoteData.length > 0) {
        const localData = await this.localAdapter.findAll()
        const localMap = new Map(localData.map(item => [item.id, item]))
        
        const mergedData = remoteData.map(remote => {
          const local = localMap.get(remote.id)
          if (local) {
            return this.resolveConflict(local, remote)
          }
          return remote
        })
        
        await this.localAdapter.bulkUpsert(mergedData)
      }
      
      this.lastSyncTime = new Date()
      this.updateSyncStatus({ 
        status: 'synced', 
        pendingCount: this.pendingQueue.length,
        lastSyncAt: this.lastSyncTime,
      })
    } catch (error) {
      this.updateSyncStatus({ 
        status: 'error', 
        pendingCount: this.pendingQueue.length,
        error: error as Error,
      })
      throw error
    }
  }
  
  async queueOperation(operation: QueuedOperation): Promise<void> {
    const pendingOp: PendingOperation<T> = {
      id: operation.id || `pending_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: operation.type,
      entity: this.entityName,
      data: operation.data as Partial<T>,
      timestamp: Date.now(),
      retryCount: 0,
    }
    
    if (this.isOnline) {
      await this.executeOperation(pendingOp)
    } else {
      this.pendingQueue.push(pendingOp)
      this.updateSyncStatus({ 
        status: 'offline', 
        pendingCount: this.pendingQueue.length 
      })
    }
  }
  
  async processQueue(): Promise<void> {
    if (!this.isOnline || this.pendingQueue.length === 0) {
      return
    }
    
    const operationsToProcess = [...this.pendingQueue]
    
    for (const op of operationsToProcess) {
      try {
        await this.executeOperation(op)
        this.pendingQueue = this.pendingQueue.filter(o => o.id !== op.id)
      } catch {
        op.retryCount++
        
        if (op.retryCount >= this.maxRetries) {
          this.pendingQueue = this.pendingQueue.filter(o => o.id !== op.id)
        }
      }
    }
    
    this.updateSyncStatus({
      status: this.pendingQueue.length > 0 ? 'syncing' : 'synced',
      pendingCount: this.pendingQueue.length,
    })
  }
  
  private async executeOperation(op: PendingOperation<T>): Promise<void> {
    switch (op.type) {
      case 'INSERT':
        if (op.data) {
          await this.remoteAdapter.insert(op.data as Omit<T, 'id'>)
        }
        break
      case 'UPDATE':
        if (op.id && op.data) {
          await this.remoteAdapter.update(op.id, op.data)
        }
        break
      case 'DELETE':
        if (op.id) {
          await this.remoteAdapter.remove(op.id)
        }
        break
    }
  }
  
  resolveConflict(local: T, remote: T): T {
    if (this.conflictResolver) {
      return this.conflictResolver(local, remote)
    }
    
    return this.defaultConflictResolver(local, remote)
  }
  
  private defaultConflictResolver(local: T, remote: T): T {
    const merged = { ...remote } as T & Record<string, unknown>
    const mergedRecord = merged as Record<string, unknown>
    
    for (const field of MERGE_FIELDS) {
      const localValue = (local as Record<string, unknown>)[field]
      const remoteValue = (remote as Record<string, unknown>)[field]
      
      if (Array.isArray(localValue) && Array.isArray(remoteValue)) {
        mergedRecord[field] = [...new Set([...localValue, ...remoteValue])]
      } else if (Array.isArray(localValue)) {
        mergedRecord[field] = localValue
      }
    }
    
    return merged as T
  }
  
  setOnlineStatus(online: boolean): void {
    this.isOnline = online
    
    if (!online) {
      this.updateSyncStatus({ 
        status: 'offline', 
        pendingCount: this.pendingQueue.length 
      })
    } else if (this.pendingQueue.length > 0) {
      this.updateSyncStatus({ 
        status: 'syncing', 
        pendingCount: this.pendingQueue.length 
      })
    }
  }
  
  getLastSyncTime(): Date | undefined {
    return this.lastSyncTime
  }
  
  setLastSyncTime(time: Date): void {
    this.lastSyncTime = time
  }
  
  getPendingOperations(): PendingOperation<T>[] {
    return [...this.pendingQueue]
  }
  
  getSyncStatus(): SyncStatus {
    return { ...this.syncStatus }
  }
  
  private updateSyncStatus(status: Partial<SyncStatus>): void {
    this.syncStatus = { ...this.syncStatus, ...status }
    this.onSyncStatusChange?.(this.syncStatus)
  }
}
