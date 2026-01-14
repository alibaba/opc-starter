/**
 * Sync Orchestrator - OPC-Starter
 * 协调数据同步流程
 */

import { supabase } from '@/lib/supabase/client'
import { authService } from '@/lib/supabase/auth'
import { personDB } from '@/services/db/personDB'
import type { Person } from '@/types/person'
import type { SyncProgress, SyncStatus, DataChangeEvent } from '@/services/data/DataService'

export interface SyncOrchestratorDeps {
  isOnline: () => boolean
  setSyncStatus: (status: SyncStatus, progress?: SyncProgress) => void
  setInitialSynced: (value: boolean) => void
  hasCompletedInitialSync: () => boolean
  syncPersonsFromCloud: () => Promise<number>
  startRealtimeSubscription: (callbacks?: {
    onPersonChange?: (event: DataChangeEvent<Person>) => void
  }) => void
}

export interface SyncOrchestrator {
  initialSync(callbacks?: {
    onPersonChange?: (event: DataChangeEvent<Person>) => void
  }): Promise<void>
  incrementalSync(): Promise<{ added: number; updated: number; deleted: number }>
  forceFullSync(): Promise<void>
  getLastFullSyncAt(): number
}

const SYNC_INTERVAL = 5 * 60 * 1000

export function createSyncOrchestrator(deps: SyncOrchestratorDeps): SyncOrchestrator {
  let lastFullSyncAt = 0

  const initialSync = async (callbacks?: {
    onPersonChange?: (event: DataChangeEvent<Person>) => void
  }): Promise<void> => {
    try {
      if (!deps.isOnline()) {
        console.log('[DataService] 离线模式，跳过初始同步，使用本地缓存')
        deps.setSyncStatus('idle')
        return
      }

      const user = await authService.getCurrentUser()
      if (!user) {
        console.log('[DataService] 用户未登录，跳过初始同步')
        deps.setSyncStatus('idle')
        return
      }

      const localPersons = await personDB.getAll()
      const hasLocalData = localPersons.length > 0

      if (hasLocalData && deps.hasCompletedInitialSync()) {
        console.log('[DataService] IndexedDB 已有数据，启动 Realtime 订阅')
        deps.startRealtimeSubscription(callbacks)
        deps.setSyncStatus('synced')
        return
      }

      console.log('[DataService] 开始全量同步...')
      deps.setSyncStatus('syncing', { current: 0, total: 1, table: 'persons', message: '正在同步人员...' })

      await deps.syncPersonsFromCloud()

      deps.setInitialSynced(true)
      lastFullSyncAt = Date.now()

      deps.startRealtimeSubscription(callbacks)

      deps.setSyncStatus('synced')
      console.log('[DataService] ✅ 全量同步完成，Realtime 订阅已启动')
    } catch (error) {
      console.error('[DataService] 初始同步失败:', error)
      deps.setSyncStatus('error')
      throw error
    }
  }

  const incrementalSync = async (): Promise<{ added: number; updated: number; deleted: number }> => {
    const result = { added: 0, updated: 0, deleted: 0 }

    try {
      if (!deps.isOnline()) {
        console.log('[DataService] 离线模式，跳过增量同步')
        return result
      }

      const now = Date.now()
      if (now - lastFullSyncAt < SYNC_INTERVAL) {
        console.log('[DataService] 距离上次同步不足5分钟，跳过')
        return result
      }

      const user = await authService.getCurrentUser()
      if (!user) {
        console.log('[DataService] 用户未登录，跳过增量同步')
        return result
      }

      const localPersons = await personDB.getAll()
      const localPersonIds = new Set(localPersons.map(p => p.id))

      console.log(`[DataService] 本地有 ${localPersons.length} 个人员，开始增量同步...`)

      const { data: cloudPersons, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error

      const cloudPersonIds = new Set((cloudPersons || []).map(p => p.id))

      console.log(`[DataService] 云端有 ${cloudPersons?.length || 0} 个人员`)

      const personsToDelete = localPersons.filter(lp => !cloudPersonIds.has(lp.id))

      if (personsToDelete.length > 0) {
        console.log(`[DataService] 发现 ${personsToDelete.length} 个需要删除的人员`)

        for (const person of personsToDelete) {
          try {
            await personDB.deletePerson(person.id)
            result.deleted++
            console.log(`[DataService] 已删除本地人员: ${person.id}`)
          } catch (err) {
            console.warn(`[DataService] 删除人员失败: ${person.id}`, err)
          }
        }
      }

      if (cloudPersons && cloudPersons.length > 0) {
        const newPersons = cloudPersons.filter(cp => !localPersonIds.has(cp.id))

        if (newPersons.length > 0) {
          console.log(`[DataService] 发现 ${newPersons.length} 个新人员`)

          for (const cloudPerson of newPersons) {
            const person: Person = {
              id: cloudPerson.id,
              name: cloudPerson.full_name || '',
              avatar: cloudPerson.avatar_url || '',
              department: cloudPerson.department || '',
              joinedAt: new Date(cloudPerson.created_at),
              photoCount: 0,
              tags: [],
            }

            try {
              await personDB.add(person)
              result.added++
            } catch (err) {
              if ((err as Error).message?.includes('Key already exists')) {
                await personDB.updatePerson(person.id, person)
                result.updated++
              }
            }
          }
        }
      }

      if (result.added > 0 || result.updated > 0 || result.deleted > 0) {
        console.log(`[DataService] ✅ 增量同步完成: 新增 ${result.added}, 更新 ${result.updated}, 删除 ${result.deleted}`)
      } else {
        console.log('[DataService] 数据已同步，无需更新')
      }

      lastFullSyncAt = now
    } catch (error) {
      console.error('[DataService] 增量同步失败:', error)
    }

    return result
  }

  const forceFullSync = async (): Promise<void> => {
    console.log('[DataService] 开始强制完整同步...')

    await personDB.clear()

    lastFullSyncAt = 0

    await initialSync()
  }

  const getLastFullSyncAt = (): number => lastFullSyncAt

  return {
    initialSync,
    incrementalSync,
    forceFullSync,
    getLastFullSyncAt,
  }
}
