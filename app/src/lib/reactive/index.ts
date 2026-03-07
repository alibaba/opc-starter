/**
 * Reactive Data Layer — 响应式数据层公共 API
 * @description 导出 ReactiveCollection、SyncEngine、Adapter 和 React Hooks
 */
export { ReactiveCollection } from './ReactiveCollection'
export { SyncEngine } from './SyncEngine'
export { DexieAdapter, fromDexieLiveQuery, SupabaseAdapter } from './adapters'
export { useQuery, useQueryOne, useMutation, useSyncStatus } from './hooks'
export type { UseQueryResult, UseMutationResult, UseSyncStatusResult } from './hooks'
export type {
  BaseEntity,
  QueryOptions,
  Change,
  LocalAdapter,
  RemoteAdapter,
  ReactiveCollectionOptions,
  SyncStatus,
  PendingOperation,
  SyncEngineOptions,
  ConflictResolver,
} from './types'
