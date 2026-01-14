import type { SupabaseClient, RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js'
import type { BaseEntity, RemoteAdapter, QueryOptions, Change } from '../types'

export class SupabaseAdapter<T extends BaseEntity> implements RemoteAdapter<T> {
  private tableName: string
  private client: SupabaseClient
  private channel: RealtimeChannel | null = null
  
  constructor(tableName: string, client: SupabaseClient) {
    this.tableName = tableName
    this.client = client
  }
  
  async fetch(options?: QueryOptions<T>): Promise<T[]> {
    let query = this.client.from(this.tableName).select('*')
    
    if (options?.filter && typeof options.filter === 'object') {
      const filterObj = options.filter as Partial<T>
      for (const [key, value] of Object.entries(filterObj)) {
        query = query.eq(key, value)
      }
    }
    
    if (options?.sort) {
      query = query.order(options.sort.field as string, { 
        ascending: options.sort.order === 'asc' 
      })
    }
    
    if (options?.offset) {
      query = query.range(options.offset, options.offset + (options.limit || 100) - 1)
    } else if (options?.limit) {
      query = query.limit(options.limit)
    }
    
    const { data, error } = await query
    
    if (error) {
      throw error
    }
    
    return (data || []) as T[]
  }
  
  async fetchOne(id: string): Promise<T | undefined> {
    const { data, error } = await this.client
      .from(this.tableName)
      .select('*')
      .eq('id', id)
      .single()
    
    if (error) {
      if (error.code === 'PGRST116') {
        return undefined
      }
      throw error
    }
    
    return data as T
  }
  
  async insert(doc: Omit<T, 'id'>): Promise<T> {
    const { data, error } = await this.client
      .from(this.tableName)
      .insert(doc)
      .select()
      .single()
    
    if (error) {
      throw error
    }
    
    return data as T
  }
  
  async update(id: string, changes: Partial<T>): Promise<T> {
    const { data, error } = await this.client
      .from(this.tableName)
      .update(changes)
      .eq('id', id)
      .select()
      .single()
    
    if (error) {
      throw error
    }
    
    return data as T
  }
  
  async remove(id: string): Promise<void> {
    const { error } = await this.client
      .from(this.tableName)
      .delete()
      .eq('id', id)
    
    if (error) {
      throw error
    }
  }
  
  subscribe(callback: (change: Change<T>) => void): () => void {
    const channelName = `${this.tableName}-changes-${Date.now()}`
    
    this.channel = this.client
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: this.tableName,
        },
        (payload: RealtimePostgresChangesPayload<T>) => {
          const change = this.transformPayload(payload)
          if (change) {
            callback(change)
          }
        }
      )
      .subscribe()
    
    return () => {
      if (this.channel) {
        this.client.removeChannel(this.channel)
        this.channel = null
      }
    }
  }
  
  private transformPayload(
    payload: RealtimePostgresChangesPayload<T>
  ): Change<T> | null {
    switch (payload.eventType) {
      case 'INSERT':
        return {
          type: 'INSERT',
          doc: payload.new as T,
        }
      case 'UPDATE':
        return {
          type: 'UPDATE',
          doc: payload.new as T,
          oldDoc: payload.old as T,
        }
      case 'DELETE':
        return {
          type: 'DELETE',
          id: (payload.old as T).id,
          oldDoc: payload.old as T,
        }
      default:
        return null
    }
  }
}
