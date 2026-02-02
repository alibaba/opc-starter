export type MergeStrategy = 'merge' | 'server-wins' | 'local-wins' | 'latest'

export interface ConflictStats {
  total: number
  serverWins: number
  localWins: number
  merged: number
}

export interface ConflictResolver {
  resolveConflict<T extends { id: string; version?: number }>(local: T, remote: T): Promise<T>
  getConflictStats(): ConflictStats
  resetConflictStats(): void
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

function smartMerge<T extends { id: string; tags?: string[]; version?: number }>(
  local: T,
  remote: T,
  defaultStrategy: 'server-wins' | 'local-wins' | 'merge'
): T {
  console.log('[ConflictResolver] 执行智能合并，默认策略:', defaultStrategy)

  const base = defaultStrategy === 'local-wins' ? { ...local } : { ...remote }

  const mergedTags = mergeArrayField(local.tags || [], remote.tags || [], defaultStrategy)

  const merged: T = {
    ...base,
    tags: mergedTags,
    version: Date.now(),
  } as T

  console.log('[ConflictResolver] 合并结果:', {
    id: merged.id,
    localTags: local.tags?.length || 0,
    remoteTags: remote.tags?.length || 0,
    mergedTags: mergedTags.length,
  })

  return merged
}

export function createConflictResolver(): ConflictResolver {
  let conflictStats: ConflictStats = {
    total: 0,
    serverWins: 0,
    localWins: 0,
    merged: 0,
  }

  const resolveConflict = async <T extends { id: string; version?: number }>(
    local: T,
    remote: T
  ): Promise<T> => {
    conflictStats.total++

    console.log('[ConflictResolver] 🔄 检测到冲突:', {
      id: local.id,
      localVersion: local.version,
      remoteVersion: remote.version,
    })

    const localVersion = local.version || 0
    const remoteVersion = remote.version || 0

    if (remoteVersion > localVersion) {
      console.log('[ConflictResolver] 远程版本更新，使用服务端数据')
      conflictStats.serverWins++
      return { ...remote, version: Date.now() }
    } else if (localVersion > remoteVersion) {
      console.log('[ConflictResolver] 本地版本更新，保留本地数据')
      conflictStats.localWins++
      return { ...local, version: Date.now() }
    } else {
      console.log('[ConflictResolver] 版本相同，执行合并')
      conflictStats.merged++

      // For entities with tags, do smart merge
      if ('tags' in local && 'tags' in remote) {
        return smartMerge(
          local as T & { tags?: string[] },
          remote as T & { tags?: string[] },
          'merge'
        ) as T
      }

      // Default: prefer remote
      return { ...remote, version: Date.now() }
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
