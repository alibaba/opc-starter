import { BehaviorSubject, Observable, map } from 'rxjs'
import type { 
  BaseEntity, 
  LocalAdapter, 
  RemoteAdapter, 
  ReactiveCollectionOptions, 
  QueryOptions,
  Change 
} from './types'

export class ReactiveCollection<T extends BaseEntity> {
  private localAdapter: LocalAdapter<T>
  private remoteAdapter?: RemoteAdapter<T>
  private onError?: (error: Error, operation: string) => void
  private conflictResolver?: (local: T, remote: T) => T
  
  private dataSubject = new BehaviorSubject<T[]>([])
  private unsubscribeRemote?: () => void
  private initialized = false
  private initPromise: Promise<void>
  
  constructor(_name: string, options: ReactiveCollectionOptions<T>) {
    this.localAdapter = options.localAdapter
    this.remoteAdapter = options.remoteAdapter
    this.onError = options.onError
    this.conflictResolver = options.conflictResolver
    if (this.conflictResolver) {
      void this.conflictResolver
    }
    
    this.initPromise = this.initialize()
  }
  
  private async initialize(): Promise<void> {
    const data = await this.localAdapter.findAll()
    this.dataSubject.next(data)
    
    if (this.remoteAdapter) {
      this.unsubscribeRemote = this.remoteAdapter.subscribe(
        this.handleRemoteChange.bind(this)
      )
    }
    this.initialized = true
  }
  
  async ready(): Promise<void> {
    await this.initPromise
    if (!this.initialized) {
      await this.initPromise
    }
  }
  
  private async handleRemoteChange(change: Change<T>): Promise<void> {
    switch (change.type) {
      case 'INSERT':
        if (change.doc) {
          await this.localAdapter.upsert(change.doc)
        }
        break
      case 'UPDATE':
        if (change.doc) {
          await this.localAdapter.upsert(change.doc)
        }
        break
      case 'DELETE':
        if (change.id) {
          await this.localAdapter.remove(change.id)
        }
        break
    }
    await this.refresh()
  }
  
  private async refresh(): Promise<void> {
    const data = await this.localAdapter.findAll()
    this.dataSubject.next(data)
  }
  
  private generateTempId(): string {
    return `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }
  
  private generateClientId(): string {
    return `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }
  
  find(options?: QueryOptions<T>): Observable<T[]> {
    if (!options) {
      return this.dataSubject.asObservable()
    }
    
    return this.dataSubject.pipe(
      map(data => this.applyQueryOptions(data, options))
    )
  }
  
  findOne(id: string): Observable<T | undefined> {
    return this.dataSubject.pipe(
      map(data => data.find(item => item.id === id))
    )
  }
  
  private applyQueryOptions(data: T[], options: QueryOptions<T>): T[] {
    let result = [...data]
    
    if (options.filter) {
      if (typeof options.filter === 'function') {
        result = result.filter(options.filter)
      } else {
        const filterObj = options.filter as Partial<T>
        result = result.filter(item =>
          Object.entries(filterObj).every(([key, value]) =>
            (item as Record<string, unknown>)[key] === value
          )
        )
      }
    }
    
    if (options.sort) {
      const { field, order } = options.sort
      result.sort((a, b) => {
        const aVal = a[field]
        const bVal = b[field]
        if (aVal == null || bVal == null) return 0
        if (aVal < bVal) return order === 'asc' ? -1 : 1
        if (aVal > bVal) return order === 'asc' ? 1 : -1
        return 0
      })
    }
    
    if (options.offset) {
      result = result.slice(options.offset)
    }
    
    if (options.limit) {
      result = result.slice(0, options.limit)
    }
    
    return result
  }
  
  async insert(doc: Omit<T, 'id'>): Promise<T> {
    const tempId = this.generateTempId()
    const clientId = this.generateClientId()
    
    const tempDoc = {
      ...doc,
      id: tempId,
      clientId,
    } as T
    
    await this.localAdapter.upsert(tempDoc)
    await this.refresh()
    
    if (this.remoteAdapter) {
      try {
        const serverDoc = await this.remoteAdapter.insert(doc)
        const finalDoc = {
          ...serverDoc,
          clientId,
        } as T
        
        await this.localAdapter.remove(tempId)
        await this.localAdapter.upsert(finalDoc)
        await this.refresh()
        
        return finalDoc
      } catch (error) {
        await this.localAdapter.remove(tempId)
        await this.refresh()
        
        if (this.onError) {
          this.onError(error as Error, 'insert')
        }
        throw error
      }
    }
    
    return tempDoc
  }
  
  async update(id: string, changes: Partial<T>): Promise<T> {
    const original = await this.localAdapter.findOne(id)
    if (!original) {
      throw new Error(`Document with id ${id} not found`)
    }
    
    const updated = { ...original, ...changes } as T
    await this.localAdapter.upsert(updated)
    await this.refresh()
    
    if (this.remoteAdapter) {
      try {
        const serverDoc = await this.remoteAdapter.update(id, changes)
        const finalDoc = { ...updated, ...serverDoc } as T
        await this.localAdapter.upsert(finalDoc)
        await this.refresh()
        return finalDoc
      } catch (error) {
        await this.localAdapter.upsert(original)
        await this.refresh()
        
        if (this.onError) {
          this.onError(error as Error, 'update')
        }
        throw error
      }
    }
    
    return updated
  }
  
  async remove(id: string): Promise<void> {
    const original = await this.localAdapter.findOne(id)
    if (!original) {
      return
    }
    
    await this.localAdapter.remove(id)
    await this.refresh()
    
    if (this.remoteAdapter) {
      try {
        await this.remoteAdapter.remove(id)
      } catch (error) {
        await this.localAdapter.upsert(original)
        await this.refresh()
        
        if (this.onError) {
          this.onError(error as Error, 'remove')
        }
        throw error
      }
    }
  }
  
  async upsert(doc: T): Promise<T> {
    const existing = await this.localAdapter.findOne(doc.id)
    if (existing) {
      return this.update(doc.id, doc)
    }
    return this.insert(doc)
  }
  
  async clear(): Promise<void> {
    await this.localAdapter.clear()
    await this.refresh()
  }
  
  destroy(): void {
    if (this.unsubscribeRemote) {
      this.unsubscribeRemote()
    }
    this.dataSubject.complete()
  }
}