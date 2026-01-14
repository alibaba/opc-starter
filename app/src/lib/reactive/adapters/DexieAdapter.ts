import { type Table, type IndexableType } from 'dexie'
import { Observable } from 'rxjs'
import type { BaseEntity, LocalAdapter, QueryOptions, Change } from '../types'

export function fromDexieLiveQuery<T>(queryFn: () => Promise<T>): Observable<T> {
  return new Observable<T>((subscriber) => {
    let active = true
    
    const runQuery = async () => {
      if (!active) return
      try {
        const result = await queryFn()
        if (active) {
          subscriber.next(result)
        }
      } catch (error) {
        if (active) {
          subscriber.error(error)
        }
      }
    }

    runQuery()

    return () => {
      active = false
    }
  })
}

export class DexieAdapter<T extends BaseEntity> implements LocalAdapter<T> {
  private table: Table<T, string>
  
  constructor(table: Table<T, string>) {
    this.table = table
  }
  
  async findAll(): Promise<T[]> {
    return this.table.toArray()
  }
  
  async findOne(id: string): Promise<T | undefined> {
    return this.table.get(id)
  }
  
  async query(options: QueryOptions<T>): Promise<T[]> {
    let collection = this.table.toCollection()
    
    if (options.filter) {
      if (typeof options.filter === 'function') {
        collection = collection.filter(options.filter)
      } else {
        const filterObj = options.filter as Partial<T>
        const entries = Object.entries(filterObj)
        
        if (entries.length === 1) {
          const [key, value] = entries[0]
          collection = this.table.where(key).equals(value as IndexableType)
        } else {
          collection = collection.filter((item) =>
            entries.every(([key, value]) => 
              (item as Record<string, unknown>)[key] === value
            )
          )
        }
      }
    }
    
    let results = await collection.toArray()
    
    if (options.sort) {
      const { field, order } = options.sort
      results.sort((a, b) => {
        const aVal = a[field]
        const bVal = b[field]
        if (aVal == null || bVal == null) return 0
        if (aVal < bVal) return order === 'asc' ? -1 : 1
        if (aVal > bVal) return order === 'asc' ? 1 : -1
        return 0
      })
    }
    
    if (options.offset) {
      results = results.slice(options.offset)
    }
    
    if (options.limit) {
      results = results.slice(0, options.limit)
    }
    
    return results
  }
  
  async upsert(doc: T): Promise<void> {
    await this.table.put(doc)
  }
  
  async bulkUpsert(docs: T[]): Promise<void> {
    await this.table.bulkPut(docs)
  }
  
  async remove(id: string): Promise<void> {
    await this.table.delete(id)
  }
  
  async clear(): Promise<void> {
    await this.table.clear()
  }
  
  observe(): Observable<Change<T>> {
    return new Observable<Change<T>>((subscriber) => {
      const handleCreate = (_primKey: string, obj: T) => {
        subscriber.next({ type: 'INSERT', doc: obj })
      }
      
      type UpdatingHook = Parameters<Table<T, string>['hook']['updating']['subscribe']>[0]

      const handleUpdate: UpdatingHook = (modifications, _primKey, obj) => {
        subscriber.next({ type: 'UPDATE', doc: { ...obj, ...modifications } as T })
      }
      
      const handleDelete = (primKey: string, obj: T) => {
        subscriber.next({ type: 'DELETE', id: primKey, oldDoc: obj })
      }
      
      this.table.hook('creating', handleCreate)
      this.table.hook('updating', handleUpdate)
      this.table.hook('deleting', handleDelete)
      
      return () => {
        this.table.hook('creating').unsubscribe(handleCreate)
        this.table.hook('updating').unsubscribe(handleUpdate)
        this.table.hook('deleting').unsubscribe(handleDelete)
      }
    })
  }
}
