import { supabase } from '@/lib/supabase/client'
import { photoDB } from '@/services/db/photoDB'
import type { Photo } from '@/types/photo'

export type MergeStrategy = 'merge' | 'server-wins' | 'local-wins' | 'latest'

export interface ConflictStats {
  total: number
  serverWins: number
  localWins: number
  merged: number
}

export interface ConflictResolver {
  resolveConflict(local: Photo, remote: Photo): Promise<Photo>
  getConflictStats(): ConflictStats
  resetConflictStats(): void
}

const fieldMergeStrategies: Record<string, MergeStrategy> = {
  tags: 'merge',
  participants: 'merge',
}

function mergeArrayField(
  localArray: string[],
  remoteArray: string[],
  strategy: MergeStrategy
): string[] {
  switch (strategy) {
    case 'merge':
      return [...new Set([...localArray, ...remoteArray])]
    case 'server-wins':
      return remoteArray
    case 'local-wins':
      return localArray
    case 'latest':
      return localArray.length >= remoteArray.length ? localArray : remoteArray
    default:
      return remoteArray
  }
}

function smartMergePhotos(
  local: Photo,
  remote: Photo,
  defaultStrategy: 'server-wins' | 'local-wins' | 'merge'
): Photo {
  console.log('[DataService] 执行智能合并，默认策略:', defaultStrategy)

  const base = defaultStrategy === 'local-wins' ? { ...local } : { ...remote }

  const mergedTags = mergeArrayField(
    local.tags || [],
    remote.tags || [],
    fieldMergeStrategies.tags || defaultStrategy
  )

  const localParticipants = (local as Photo & { participants?: string[] }).participants || []
  const remoteParticipants = (remote as Photo & { participants?: string[] }).participants || []
  const mergedParticipants = mergeArrayField(
    localParticipants,
    remoteParticipants,
    fieldMergeStrategies.participants || defaultStrategy
  )

  const merged: Photo = {
    ...base,
    tags: mergedTags,
    version: Date.now(),
  }

  if (mergedParticipants.length > 0) {
    (merged as Photo & { participants?: string[] }).participants = mergedParticipants
  }

  console.log('[DataService] 合并结果:', {
    id: merged.id,
    localTags: local.tags?.length || 0,
    remoteTags: remote.tags?.length || 0,
    mergedTags: mergedTags.length,
    localParticipants: localParticipants.length,
    remoteParticipants: remoteParticipants.length,
    mergedParticipants: mergedParticipants.length,
  })

  return merged
}

function buildUpdateData(photo: Photo): Record<string, unknown> {
  const updateData: Record<string, unknown> = {}

  if (photo.tags !== undefined) {
    updateData.tags = photo.tags
  }

  const participants = (photo as Photo & { participants?: string[] }).participants
  if (participants !== undefined) {
    updateData.participants = participants
  }

  return updateData
}

function notifyConflict(
  resolution: 'server-wins' | 'local-wins' | 'merged',
  local: Photo,
  remote: Photo,
  result: Photo | undefined,
  stats: ConflictStats
): void {
  console.log('[DataService] 📢 发送冲突通知:', resolution)

  window.dispatchEvent(
    new CustomEvent('dataservice:conflict', {
      detail: {
        resolution,
        local,
        remote,
        result,
        timestamp: new Date(),
        stats: { ...stats },
      },
    })
  )
}

export function createConflictResolver(): ConflictResolver {
  let conflictStats: ConflictStats = {
    total: 0,
    serverWins: 0,
    localWins: 0,
    merged: 0,
  }

  const resolveConflict = async (local: Photo, remote: Photo): Promise<Photo> => {
    conflictStats.total++

    console.log('[DataService] 🔄 检测到冲突:', {
      id: local.id,
      localVersion: local.version,
      remoteVersion: remote.version,
    })

    const localVersion = local.version || 0
    const remoteVersion = remote.version || 0

    if (remoteVersion > localVersion) {
      console.log('[DataService] 远程版本更新，执行智能合并')

      const merged = smartMergePhotos(local, remote, 'server-wins')

      await photoDB.updatePhoto(remote.id, {
        ...merged,
        cloudSyncStatus: 'synced',
      })

      conflictStats.serverWins++
      notifyConflict('server-wins', local, remote, merged, conflictStats)

      return merged
    } else if (localVersion > remoteVersion) {
      console.log('[DataService] 本地版本更新，推送到云端')

      try {
        const updateData = buildUpdateData(local)

        const { data, error } = await supabase
          .from('photos')
          .update(updateData)
          .eq('id', local.id)
          .select()
          .single()

        if (error) throw error

        const updated: Photo = {
          ...local,
          version: new Date(data.updated_at).getTime(),
          cloudSyncStatus: 'synced',
        }

        await photoDB.updatePhoto(local.id, updated)

        conflictStats.localWins++
        notifyConflict('local-wins', local, remote, updated, conflictStats)

        return updated
      } catch (error) {
        console.error('[DataService] 推送本地版本失败:', error)
        throw error
      }
    } else {
      console.log('[DataService] 版本相同，执行完整字段级合并')

      const merged = smartMergePhotos(local, remote, 'merge')

      try {
        const updateData = buildUpdateData(merged)

        await supabase
          .from('photos')
          .update(updateData)
          .eq('id', merged.id)

        merged.cloudSyncStatus = 'synced'
        merged.version = Date.now()
      } catch (error) {
        console.warn('[DataService] 合并结果同步失败，仅保存本地:', error)
        merged.cloudSyncStatus = 'pending'
      }

      await photoDB.updatePhoto(merged.id, merged)

      conflictStats.merged++
      notifyConflict('merged', local, remote, merged, conflictStats)

      return merged
    }
  }

  const getConflictStats = (): ConflictStats => {
    return { ...conflictStats }
  }

  const resetConflictStats = (): void => {
    conflictStats = {
      total: 0,
      serverWins: 0,
      localWins: 0,
      merged: 0,
    }
  }

  return {
    resolveConflict,
    getConflictStats,
    resetConflictStats,
  }
}
