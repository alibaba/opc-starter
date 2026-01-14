import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import type { Observable } from 'rxjs'
import type { BaseEntity, QueryOptions, SyncStatus } from '../types'
import type { ReactiveCollection } from '../ReactiveCollection'

export interface UseQueryResult<T> {
  data: T[]
  loading: boolean
  error: Error | null
  refetch: () => void
}

export interface UseMutationResult<T extends BaseEntity> {
  insert: (doc: Omit<T, 'id'>) => Promise<T>
  update: (id: string, changes: Partial<T>) => Promise<T>
  remove: (id: string) => Promise<void>
  loading: boolean
  error: Error | null
}

export interface UseSyncStatusResult {
  status: SyncStatus['status']
  pendingCount: number
  lastSyncAt?: Date
  error?: Error
}

export function useQuery<T extends BaseEntity>(
  collection: ReactiveCollection<T>,
  options?: QueryOptions<T>
): UseQueryResult<T> {
  const [data, setData] = useState<T[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const subscriptionRef = useRef<{ unsubscribe: () => void } | null>(null)
  
  const optionsKey = useMemo(() => JSON.stringify(options || {}), [options])

  const subscribe = useCallback(() => {
    setLoading(true)
    setError(null)
    
    if (subscriptionRef.current) {
      subscriptionRef.current.unsubscribe()
    }

    const observable = collection.find(options)
    
    subscriptionRef.current = observable.subscribe({
      next: (items) => {
        setData(items)
        setLoading(false)
      },
      error: (err) => {
        setError(err)
        setLoading(false)
      },
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [collection, optionsKey])

  useEffect(() => {
    subscribe()
    
    return () => {
      if (subscriptionRef.current) {
        subscriptionRef.current.unsubscribe()
      }
    }
  }, [subscribe])

  const refetch = useCallback(() => {
    subscribe()
  }, [subscribe])

  return { data, loading, error, refetch }
}

export function useQueryOne<T extends BaseEntity>(
  collection: ReactiveCollection<T>,
  id: string
): { data: T | undefined; loading: boolean; error: Error | null } {
  const [data, setData] = useState<T | undefined>(undefined)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    setLoading(true)
    
    const subscription = collection.findOne(id).subscribe({
      next: (item) => {
        setData(item)
        setLoading(false)
      },
      error: (err) => {
        setError(err)
        setLoading(false)
      },
    })

    return () => subscription.unsubscribe()
  }, [collection, id])

  return { data, loading, error }
}

export function useMutation<T extends BaseEntity>(
  collection: ReactiveCollection<T>
): UseMutationResult<T> {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const insert = useCallback(async (doc: Omit<T, 'id'>): Promise<T> => {
    setLoading(true)
    setError(null)
    
    try {
      const result = await collection.insert(doc)
      setLoading(false)
      return result
    } catch (err) {
      setError(err as Error)
      setLoading(false)
      throw err
    }
  }, [collection])

  const update = useCallback(async (id: string, changes: Partial<T>): Promise<T> => {
    setLoading(true)
    setError(null)
    
    try {
      const result = await collection.update(id, changes)
      setLoading(false)
      return result
    } catch (err) {
      setError(err as Error)
      setLoading(false)
      throw err
    }
  }, [collection])

  const remove = useCallback(async (id: string): Promise<void> => {
    setLoading(true)
    setError(null)
    
    try {
      await collection.remove(id)
      setLoading(false)
    } catch (err) {
      setError(err as Error)
      setLoading(false)
      throw err
    }
  }, [collection])

  return { insert, update, remove, loading, error }
}

export function useSyncStatus(
  statusObservable?: Observable<SyncStatus>
): UseSyncStatusResult {
  const [syncStatus, setSyncStatus] = useState<SyncStatus>({
    status: 'idle',
    pendingCount: 0,
  })

  useEffect(() => {
    if (!statusObservable) {
      return
    }

    const subscription = statusObservable.subscribe({
      next: (status) => setSyncStatus(status),
    })

    return () => subscription.unsubscribe()
  }, [statusObservable])

  return {
    status: syncStatus.status,
    pendingCount: syncStatus.pendingCount,
    lastSyncAt: syncStatus.lastSyncAt,
    error: syncStatus.error,
  }
}