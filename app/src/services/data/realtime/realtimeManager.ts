/**
 * Realtime Manager - OPC-Starter
 * 管理 Supabase Realtime 订阅
 */

import type { SupabaseClient, RealtimeChannel } from '@supabase/supabase-js'
import type { Person } from '@/types/person'
import type { DataChangeEvent } from '@/services/data/DataService'
import { personDB } from '@/services/db/personDB'

export interface RealtimeCallbacks {
  onPersonChange?: (event: DataChangeEvent<Person>) => void
}

interface RealtimeDeps {
  supabase: SupabaseClient
  transformSupabasePerson: (row: Record<string, unknown>) => Person
  // 使用更宽松的类型定义来兼容 conflictResolver
  resolveConflict: <T extends { id: string; version?: number }>(local: T, remote: T) => Promise<T>
}

export function createRealtimeManager(deps: RealtimeDeps) {
  const realtimeChannels: Map<string, RealtimeChannel> = new Map()

  const unsubscribe = (channelName: string): void => {
    const channel = realtimeChannels.get(channelName)
    if (channel) {
      channel.unsubscribe()
      realtimeChannels.delete(channelName)
      console.log(`[DataService] 取消订阅: ${channelName}`)
    }
  }

  const subscribePersons = (callback?: (event: DataChangeEvent<Person>) => void): (() => void) => {
    const channelName = 'persons-realtime'

    if (realtimeChannels.has(channelName)) {
      unsubscribe(channelName)
    }

    console.log('[DataService] 订阅 Supabase Realtime: profiles (persons)')

    const channel = deps.supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'profiles',
        },
        async (payload) => {
          console.log('[Realtime] 收到 persons 变更:', payload.eventType, payload)

          try {
            const event: DataChangeEvent<Person> = {
              type: payload.eventType as 'INSERT' | 'UPDATE' | 'DELETE',
              data: payload.new as Person,
              old: payload.old as Person | undefined,
              timestamp: new Date(),
            }

            switch (payload.eventType) {
              case 'INSERT':
              case 'UPDATE': {
                const remotePerson = deps.transformSupabasePerson(payload.new)
                await personDB.add(remotePerson)
                console.log('[Realtime] ✅ persons IndexedDB 已更新')
                break
              }

              case 'DELETE':
                if (payload.old && typeof payload.old === 'object' && 'id' in payload.old) {
                  await personDB.deletePerson((payload.old as { id: string }).id)
                  console.log('[Realtime] ✅ persons IndexedDB 已删除')
                }
                break
            }

            if (callback) {
              callback(event)
            }
          } catch (error) {
            console.error('[Realtime] 更新 persons IndexedDB 失败:', error)
          }
        }
      )
      .subscribe()

    realtimeChannels.set(channelName, channel)

    return () => unsubscribe(channelName)
  }

  const subscribeAll = (callbacks?: RealtimeCallbacks): (() => void) => {
    console.log('[DataService] 开始订阅核心表 (profiles)')

    const unsubscribePersons = subscribePersons(callbacks?.onPersonChange)

    console.log('[DataService] ✅ 核心表订阅完成')

    return () => {
      unsubscribePersons()
      console.log('[DataService] 所有订阅已取消')
    }
  }

  const cleanup = (): void => {
    realtimeChannels.forEach((channel) => {
      channel.unsubscribe()
    })
    realtimeChannels.clear()
    console.log('[DataService] 所有订阅已清理')
  }

  return {
    subscribePersons,
    subscribeAll,
    cleanup,
  }
}
