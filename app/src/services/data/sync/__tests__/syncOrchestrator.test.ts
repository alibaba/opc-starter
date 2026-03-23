/**
 * syncOrchestrator 单元测试
 * 测试数据同步编排逻辑
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock dependencies
vi.mock('@/lib/supabase/client', () => ({
  supabase: {
    from: vi.fn(),
  },
}))

vi.mock('@/lib/supabase/auth', () => ({
  authService: {
    getCurrentUser: vi.fn(),
  },
}))

vi.mock('@/services/db/personDB', () => ({
  personDB: {
    getAll: vi.fn(),
    add: vi.fn(),
    updatePerson: vi.fn(),
    deletePerson: vi.fn(),
    clear: vi.fn(),
  },
}))

import { createSyncOrchestrator, type SyncOrchestratorDeps } from '../syncOrchestrator'
import { authService } from '@/lib/supabase/auth'
import { personDB } from '@/services/db/personDB'
import { supabase } from '@/lib/supabase/client'

function createMockDeps(overrides?: Partial<SyncOrchestratorDeps>): SyncOrchestratorDeps {
  return {
    isOnline: vi.fn().mockReturnValue(true),
    setSyncStatus: vi.fn(),
    setInitialSynced: vi.fn(),
    hasCompletedInitialSync: vi.fn().mockReturnValue(false),
    syncPersonsFromCloud: vi.fn().mockResolvedValue(5),
    startRealtimeSubscription: vi.fn(),
    ...overrides,
  }
}

describe('syncOrchestrator', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('initialSync', () => {
    it('should skip sync when offline', async () => {
      const deps = createMockDeps({ isOnline: vi.fn().mockReturnValue(false) })
      const orchestrator = createSyncOrchestrator(deps)

      await orchestrator.initialSync()

      expect(deps.setSyncStatus).toHaveBeenCalledWith('idle')
      expect(deps.syncPersonsFromCloud).not.toHaveBeenCalled()
    })

    it('should skip sync when user not logged in', async () => {
      const deps = createMockDeps()
      vi.mocked(authService.getCurrentUser).mockResolvedValue(null)
      const orchestrator = createSyncOrchestrator(deps)

      await orchestrator.initialSync()

      expect(deps.setSyncStatus).toHaveBeenCalledWith('idle')
      expect(deps.syncPersonsFromCloud).not.toHaveBeenCalled()
    })

    it('should use local data when already synced', async () => {
      const deps = createMockDeps({
        hasCompletedInitialSync: vi.fn().mockReturnValue(true),
      })
      vi.mocked(authService.getCurrentUser).mockResolvedValue({ id: 'user1' } as never)
      vi.mocked(personDB.getAll).mockResolvedValue([{ id: 'p1' }] as never)

      const orchestrator = createSyncOrchestrator(deps)
      await orchestrator.initialSync()

      expect(deps.startRealtimeSubscription).toHaveBeenCalled()
      expect(deps.setSyncStatus).toHaveBeenCalledWith('synced')
      expect(deps.syncPersonsFromCloud).not.toHaveBeenCalled()
    })

    it('should perform full sync when no local data', async () => {
      const deps = createMockDeps()
      vi.mocked(authService.getCurrentUser).mockResolvedValue({ id: 'user1' } as never)
      vi.mocked(personDB.getAll).mockResolvedValue([])

      const orchestrator = createSyncOrchestrator(deps)
      await orchestrator.initialSync()

      expect(deps.setSyncStatus).toHaveBeenCalledWith('syncing', expect.any(Object))
      expect(deps.syncPersonsFromCloud).toHaveBeenCalled()
      expect(deps.setInitialSynced).toHaveBeenCalledWith(true)
      expect(deps.startRealtimeSubscription).toHaveBeenCalled()
      expect(deps.setSyncStatus).toHaveBeenCalledWith('synced')
    })

    it('should handle sync error', async () => {
      const deps = createMockDeps({
        syncPersonsFromCloud: vi.fn().mockRejectedValue(new Error('Sync failed')),
      })
      vi.mocked(authService.getCurrentUser).mockResolvedValue({ id: 'user1' } as never)
      vi.mocked(personDB.getAll).mockResolvedValue([])

      const orchestrator = createSyncOrchestrator(deps)

      await expect(orchestrator.initialSync()).rejects.toThrow('Sync failed')
      expect(deps.setSyncStatus).toHaveBeenCalledWith('error')
    })

    it('should pass callbacks to realtime subscription', async () => {
      const deps = createMockDeps()
      vi.mocked(authService.getCurrentUser).mockResolvedValue({ id: 'user1' } as never)
      vi.mocked(personDB.getAll).mockResolvedValue([])

      const orchestrator = createSyncOrchestrator(deps)
      const callbacks = { onPersonChange: vi.fn() }
      await orchestrator.initialSync(callbacks)

      expect(deps.startRealtimeSubscription).toHaveBeenCalledWith(callbacks)
    })
  })

  describe('incrementalSync', () => {
    it('should skip when offline', async () => {
      const deps = createMockDeps({ isOnline: vi.fn().mockReturnValue(false) })
      const orchestrator = createSyncOrchestrator(deps)

      const result = await orchestrator.incrementalSync()

      expect(result).toEqual({ added: 0, updated: 0, deleted: 0 })
    })

    it('should skip when user not logged in', async () => {
      const deps = createMockDeps()
      vi.mocked(authService.getCurrentUser).mockResolvedValue(null)
      const orchestrator = createSyncOrchestrator(deps)

      const result = await orchestrator.incrementalSync()

      expect(result).toEqual({ added: 0, updated: 0, deleted: 0 })
    })

    it('should detect and add new persons from cloud', async () => {
      const deps = createMockDeps()
      vi.mocked(authService.getCurrentUser).mockResolvedValue({ id: 'user1' } as never)
      vi.mocked(personDB.getAll).mockResolvedValue([])
      vi.mocked(personDB.add).mockResolvedValue(undefined)

      const mockOrder = vi.fn().mockResolvedValue({
        data: [
          {
            id: 'p1',
            full_name: 'User 1',
            avatar_url: null,
            department: null,
            created_at: '2024-01-01',
          },
        ],
        error: null,
      })
      const mockSelect = vi.fn().mockReturnValue({ order: mockOrder })
      vi.mocked(supabase.from).mockReturnValue({ select: mockSelect } as never)

      const orchestrator = createSyncOrchestrator(deps)
      const result = await orchestrator.incrementalSync()

      expect(result.added).toBe(1)
      expect(personDB.add).toHaveBeenCalled()
    })

    it('should handle duplicate key on add by updating', async () => {
      const deps = createMockDeps()
      vi.mocked(authService.getCurrentUser).mockResolvedValue({ id: 'user1' } as never)
      vi.mocked(personDB.getAll).mockResolvedValue([])
      vi.mocked(personDB.add).mockRejectedValue(new Error('Key already exists'))
      vi.mocked(personDB.updatePerson).mockResolvedValue(undefined)

      const mockOrder = vi.fn().mockResolvedValue({
        data: [
          {
            id: 'p1',
            full_name: 'User 1',
            avatar_url: null,
            department: null,
            created_at: '2024-01-01',
          },
        ],
        error: null,
      })
      const mockSelect = vi.fn().mockReturnValue({ order: mockOrder })
      vi.mocked(supabase.from).mockReturnValue({ select: mockSelect } as never)

      const orchestrator = createSyncOrchestrator(deps)
      const result = await orchestrator.incrementalSync()

      expect(result.updated).toBe(1)
    })

    it('should delete persons not in cloud', async () => {
      const deps = createMockDeps()
      vi.mocked(authService.getCurrentUser).mockResolvedValue({ id: 'user1' } as never)
      vi.mocked(personDB.getAll).mockResolvedValue([{ id: 'p1', name: 'Local Only' }] as never)
      vi.mocked(personDB.deletePerson).mockResolvedValue(undefined)

      const mockOrder = vi.fn().mockResolvedValue({
        data: [],
        error: null,
      })
      const mockSelect = vi.fn().mockReturnValue({ order: mockOrder })
      vi.mocked(supabase.from).mockReturnValue({ select: mockSelect } as never)

      const orchestrator = createSyncOrchestrator(deps)
      const result = await orchestrator.incrementalSync()

      expect(result.deleted).toBe(1)
    })

    it('should handle supabase error gracefully', async () => {
      const deps = createMockDeps()
      vi.mocked(authService.getCurrentUser).mockResolvedValue({ id: 'user1' } as never)
      vi.mocked(personDB.getAll).mockResolvedValue([])

      const mockOrder = vi.fn().mockResolvedValue({
        data: null,
        error: { message: 'Supabase error' },
      })
      const mockSelect = vi.fn().mockReturnValue({ order: mockOrder })
      vi.mocked(supabase.from).mockReturnValue({ select: mockSelect } as never)

      const orchestrator = createSyncOrchestrator(deps)
      const result = await orchestrator.incrementalSync()

      expect(result).toEqual({ added: 0, updated: 0, deleted: 0 })
    })
  })

  describe('forceFullSync', () => {
    it('should clear local data and re-sync', async () => {
      const deps = createMockDeps()
      vi.mocked(authService.getCurrentUser).mockResolvedValue({ id: 'user1' } as never)
      vi.mocked(personDB.getAll).mockResolvedValue([])
      vi.mocked(personDB.clear).mockResolvedValue(undefined)

      const orchestrator = createSyncOrchestrator(deps)
      await orchestrator.forceFullSync()

      expect(personDB.clear).toHaveBeenCalled()
      expect(deps.syncPersonsFromCloud).toHaveBeenCalled()
    })
  })

  describe('getLastFullSyncAt', () => {
    it('should return 0 initially', () => {
      const deps = createMockDeps()
      const orchestrator = createSyncOrchestrator(deps)

      expect(orchestrator.getLastFullSyncAt()).toBe(0)
    })

    it('should return timestamp after sync', async () => {
      const deps = createMockDeps()
      vi.mocked(authService.getCurrentUser).mockResolvedValue({ id: 'user1' } as never)
      vi.mocked(personDB.getAll).mockResolvedValue([])

      const orchestrator = createSyncOrchestrator(deps)
      await orchestrator.initialSync()

      expect(orchestrator.getLastFullSyncAt()).toBeGreaterThan(0)
    })
  })
})
