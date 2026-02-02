/**
 * 统一数据访问服务 - OPC-Starter
 * 
 * 核心原则:
 * 1. 读操作: 优先从 IndexedDB (快速)
 * 2. 写操作: 先写 Supabase (权威) → 成功后更新 IndexedDB (缓存)
 * 3. 更新机制: Supabase Realtime 订阅 (实时)
 * 
 * @author OPC-Starter Team
 */

import { supabase } from '@/lib/supabase/client'
import { personDB } from '@/services/db/personDB'
import { ReactiveCollection } from '@/lib/reactive'
import type { BaseEntity } from '@/lib/reactive/types'
import type { Person } from '@/types/person'
import { createPersonAdapter } from './adapters/personAdapter'
import { createRealtimeManager, type RealtimeCallbacks } from './realtime/realtimeManager'
import { createOfflineQueueManager } from './offline-queue/offlineQueueManager'
import { createSyncManager } from './sync/syncManager'
import { createSyncOrchestrator } from './sync/syncOrchestrator'
import { createRemoteApi } from './remote/remoteApi'
import { createConflictResolver } from './conflict/conflictResolver'
import { createNetworkManager } from './network/networkManager'

/**
 * 数据变更事件
 */
export interface DataChangeEvent<T = unknown> {
  type: 'INSERT' | 'UPDATE' | 'DELETE'
  data: T
  old?: T
  timestamp: Date
}

/**
 * 写操作类型
 */
export interface WriteOperation {
  type: 'add' | 'update' | 'delete'
  entityType: 'person'
  id: string
  data?: Record<string, unknown>
  timestamp: number
  retryCount: number
}

/**
 * 同步状态类型
 */
export type SyncStatus = 'idle' | 'syncing' | 'synced' | 'error'

/**
 * 同步状态变更回调
 */
export type SyncStatusCallback = (status: SyncStatus, progress?: SyncProgress) => void

/**
 * 同步进度信息
 */
export interface SyncProgress {
  current: number
  total: number
  table: 'persons'
  message?: string
}

/**
 * 统一数据访问服务类
 */
export class DataServiceClass {
  private static instance: DataServiceClass | null = null
  private readonly QUEUE_STORAGE_KEY = 'dataservice-offline-queue'
  private readonly NETWORK_RETRY_DELAY = 2000
  
  private readonly syncManager = createSyncManager()
  private readonly networkManager = createNetworkManager()
  private readonly conflictResolver = createConflictResolver()
  private readonly remote = createRemoteApi()

  private _persons: ReactiveCollection<Person & BaseEntity> | null = null
  private createPersonAdapter = createPersonAdapter
  private readonly realtime = createRealtimeManager({
    supabase,
    transformSupabasePerson: (row) => this.remote.transformSupabasePerson(row),
    resolveConflict: (local, remote) => this.conflictResolver.resolveConflict(local, remote),
  })
  private readonly offlineQueueManager = createOfflineQueueManager({
    storageKey: this.QUEUE_STORAGE_KEY,
    isOnline: () => this.networkManager.isOnline(),
    executeOperation: (op) => this.executeOperation(op),
    markAsSynced: () => Promise.resolve(),
    markAsFailed: () => Promise.resolve(),
    onQueueEmpty: () => {
      window.dispatchEvent(
        new CustomEvent('dataservice:queue-empty', {
          detail: { timestamp: new Date() },
        })
      )
    },
  })
  private readonly syncOrchestrator = createSyncOrchestrator({
    isOnline: () => this.networkManager.isOnline(),
    setSyncStatus: (status, progress) => this.syncManager.setSyncStatus(status, progress),
    setInitialSynced: (value) => this.syncManager.setInitialSynced(value),
    hasCompletedInitialSync: () => this.syncManager.hasCompletedInitialSync(),
    syncPersonsFromCloud: () => this.remote.syncPersonsFromCloud(),
    startRealtimeSubscription: (callbacks) => this.startRealtimeSubscription(callbacks),
  })
  private unsubscribeAllRealtime: (() => void) | null = null
  
  static getInstance(): DataServiceClass {
    if (!DataServiceClass.instance) {
      DataServiceClass.instance = new DataServiceClass()
    }
    return DataServiceClass.instance
  }
  
  get persons(): ReactiveCollection<Person & BaseEntity> {
    if (!this._persons) {
      this._persons = new ReactiveCollection<Person & BaseEntity>('persons', {
        localAdapter: this.createPersonAdapter(),
      })
    }
    return this._persons
  }
  
  constructor() {
    this.setupNetworkListeners()
    this.loadOfflineQueue()
  }
  
  // ==================== 同步状态管理 ====================
  
  getSyncStatus(): SyncStatus {
    return this.syncManager.getSyncStatus()
  }
  
  isSyncing(): boolean {
    return this.syncManager.isSyncing()
  }
  
  hasCompletedInitialSync(): boolean {
    return this.syncManager.hasCompletedInitialSync()
  }
  
  onSyncStatusChange(callback: SyncStatusCallback): () => void {
    return this.syncManager.onSyncStatusChange(callback)
  }
  
  // ==================== 网络状态管理 ====================
  
  private setupNetworkListeners(): void {
    this.networkManager.setup({
      onOnline: () => {
        setTimeout(() => {
          const queueSize = this.offlineQueueManager.getQueueStats().queueSize
          if (this.networkManager.isOnline() && queueSize > 0) {
            console.log(`[DataService] 开始处理 ${queueSize} 个待同步操作`)
            this.processOfflineQueueWithRetry().catch(console.error)
          }
        }, this.NETWORK_RETRY_DELAY)
      },
      onOffline: () => {},
    })

    const queueSize = this.offlineQueueManager.getQueueStats().queueSize
    if (this.networkManager.isOnline() && queueSize > 0) {
      console.log('[DataService] 发现待处理的离线操作，将在初始化后处理')
    }
  }
  
  private get isOnline(): boolean {
    return this.networkManager.isOnline()
  }
  
  checkOnline(): boolean {
    return this.networkManager.isOnline()
  }
  
  getNetworkStatus(): boolean {
    return this.networkManager.isOnline()
  }
  
  // ==================== Realtime 订阅 ====================
  
  subscribePersons(callback?: (event: DataChangeEvent<Person>) => void): () => void {
    return this.realtime.subscribePersons(callback)
  }
  
  subscribeAll(callbacks?: RealtimeCallbacks): () => void {
    return this.realtime.subscribeAll(callbacks)
  }
  
  cleanup(): void {
    this.realtime.cleanup()
  }
  
  // ==================== 初始同步 ====================
  
  async initialSync(callbacks?: {
    onPersonChange?: (event: DataChangeEvent<Person>) => void
  }): Promise<void> {
    return this.syncOrchestrator.initialSync(callbacks)
  }
  
  private startRealtimeSubscription(callbacks?: {
    onPersonChange?: (event: DataChangeEvent<Person>) => void
  }): void {
    if (this.unsubscribeAllRealtime) {
      this.unsubscribeAllRealtime()
    }
    this.unsubscribeAllRealtime = this.subscribeAll(callbacks)
  }
  
  async incrementalSync(): Promise<{ added: number; updated: number; deleted: number }> {
    return this.syncOrchestrator.incrementalSync()
  }
  
  async forceFullSync(): Promise<void> {
    console.log('[DataService] 开始强制完整同步...')
    await personDB.clear()
    await this.initialSync()
  }
  
  // ==================== 离线队列管理 ====================
  
  private loadOfflineQueue(): void {
    this.offlineQueueManager.loadQueue()
  }
  
  private async enqueueOperation(
    op: Omit<WriteOperation, 'timestamp' | 'retryCount'>
  ): Promise<void> {
    await this.offlineQueueManager.enqueueOperation(op)
  }
  
  async processOfflineQueue(): Promise<{ success: number; failed: number }> {
    return this.offlineQueueManager.processOfflineQueue()
  }
  
  private async processOfflineQueueWithRetry(): Promise<void> {
    return this.offlineQueueManager.processOfflineQueueWithRetry()
  }
  
  private async executeOperation(op: WriteOperation): Promise<void> {
    console.log('[DataService] 执行队列操作:', op.type, op.entityType, op.id)
    
    if (op.entityType === 'person') {
      try {
        const person = await this.remote.executePersonOperation(op)
        if (person) {
          await personDB.add(person)
        } else if (op.type === 'delete') {
          await personDB.deletePerson(op.id)
        }
      } catch (error) {
        console.error('[DataService] 执行 Person 操作失败', error)
        throw error
      }
    }
  }
  
  getQueueStats(): {
    queueSize: number
    operations: WriteOperation[]
  } {
    return this.offlineQueueManager.getQueueStats()
  }
  
  async triggerQueueProcessing(): Promise<{ success: number; failed: number }> {
    if (!this.isOnline) {
      console.log('[DataService] 离线状态，无法处理队列')
      return { success: 0, failed: 0 }
    }
    
    return this.processOfflineQueue()
  }
  
  getSyncStats(): {
    queueSize: number
    syncing: number
    successCount: number
    failureCount: number
    conflictCount: number
    lastSyncAt?: Date
    status: SyncStatus
    isOnline: boolean
    hasInitialSynced: boolean
    conflictStats: { total: number; serverWins: number; localWins: number; merged: number }
  } {
    const queueStats = this.offlineQueueManager.getQueueStats()
    const conflictStats = this.conflictResolver.getConflictStats()
    const lastFullSyncAt = this.syncOrchestrator.getLastFullSyncAt()
    return {
      queueSize: queueStats.queueSize,
      syncing: this.syncManager.isSyncing() ? 1 : 0,
      successCount: 0,
      failureCount: 0,
      conflictCount: conflictStats.total,
      lastSyncAt: lastFullSyncAt ? new Date(lastFullSyncAt) : undefined,
      status: this.syncManager.getSyncStatus(),
      isOnline: this.networkManager.isOnline(),
      hasInitialSynced: this.syncManager.hasCompletedInitialSync(),
      conflictStats: { ...conflictStats },
    }
  }
  
  // ==================== 冲突检测与解决 ====================
  
  getConflictStats(): {
    total: number
    serverWins: number
    localWins: number
    merged: number
  } {
    return this.conflictResolver.getConflictStats()
  }
  
  resetConflictStats(): void {
    this.conflictResolver.resetConflictStats()
  }
  
  // ==================== 人物操作 ====================

  async getPersons(): Promise<Person[]> {
    return personDB.getPersons()
  }

  async getPerson(id: string): Promise<Person | null> {
    const person = await personDB.getPerson(id)
    return person ?? null
  }

  async addPerson(person: Omit<Person, 'id' | 'photoCount'> & { photoCount?: number }): Promise<Person> {
    const record: Person = {
      id: crypto.randomUUID(),
      name: person.name,
      avatar: person.avatar ?? '',
      department: person.department ?? '',
      joinedAt: person.joinedAt ?? new Date(),
      photoCount: person.photoCount ?? 0,
      tags: person.tags ?? [],
      position: person.position,
      bio: person.bio,
    }

    if (this.isOnline) {
      const created = await this.remote.createPerson(record)
      await personDB.add(created)
      return created
    }

    await personDB.add(record)
    await this.enqueueOperation({
      type: 'add',
      entityType: 'person',
      id: record.id,
      data: record as unknown as Record<string, unknown>,
    })
    return record
  }

  async updatePerson(
    id: string,
    updates: Partial<Omit<Person, 'id' | 'photoCount'>> & { photoCount?: number }
  ): Promise<Person> {
    const current = await personDB.getPerson(id)
    if (!current) {
      throw new Error('Person not found')
    }

    const merged: Person = {
      ...current,
      ...updates,
      photoCount: updates.photoCount ?? current.photoCount ?? 0,
      tags: updates.tags ?? current.tags,
      joinedAt: updates.joinedAt ?? current.joinedAt,
      avatar: updates.avatar ?? current.avatar ?? '',
      department: updates.department ?? current.department ?? '',
      name: updates.name ?? current.name,
    }

    if (this.isOnline) {
      const updated = await this.remote.updatePerson(id, merged)
      await personDB.updatePerson(id, updated)
      return updated
    }

    await personDB.updatePerson(id, merged)
    await this.enqueueOperation({
      type: 'update',
      entityType: 'person',
      id,
      data: updates,
    })
    return merged
  }

  async deletePerson(id: string): Promise<void> {
    if (this.isOnline) {
      await this.remote.deletePerson(id)
    } else {
      await this.enqueueOperation({
        type: 'delete',
        entityType: 'person',
        id,
      })
    }

    await personDB.deletePerson(id)
  }
}

export const DataService = DataServiceClass.getInstance()
export const dataService = DataService
