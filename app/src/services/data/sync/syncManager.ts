import type { SyncProgress, SyncStatus, SyncStatusCallback } from '@/services/data/DataService'

interface SyncManagerDeps {
  onStatusChange?: (status: SyncStatus, progress?: SyncProgress) => void
}

export function createSyncManager(deps?: SyncManagerDeps) {
  let syncStatus: SyncStatus = 'idle'
  const callbacks: Set<SyncStatusCallback> = new Set()
  let hasInitialSynced = false

  const getSyncStatus = (): SyncStatus => syncStatus
  const isSyncing = (): boolean => syncStatus === 'syncing'
  const hasCompletedInitialSync = (): boolean => hasInitialSynced

  const setSyncStatus = (status: SyncStatus, progress?: SyncProgress): void => {
    syncStatus = status
    callbacks.forEach(cb => cb(status, progress))
    deps?.onStatusChange?.(status, progress)
  }

  const setInitialSynced = (value: boolean): void => {
    hasInitialSynced = value
  }

  const onSyncStatusChange = (callback: SyncStatusCallback): (() => void) => {
    callbacks.add(callback)
    callback(syncStatus)
    return () => callbacks.delete(callback)
  }

  return {
    getSyncStatus,
    isSyncing,
    hasCompletedInitialSync,
    setSyncStatus,
    setInitialSynced,
    onSyncStatusChange,
  }
}
