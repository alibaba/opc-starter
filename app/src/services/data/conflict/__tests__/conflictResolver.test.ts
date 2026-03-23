/**
 * conflictResolver 冲突解决器测试
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { createConflictResolver } from '../conflictResolver'

interface TestEntity {
  id: string
  name: string
  tags?: string[]
  version?: number
}

describe('conflictResolver', () => {
  let resolver: ReturnType<typeof createConflictResolver>

  beforeEach(() => {
    resolver = createConflictResolver()
  })

  describe('resolveConflict', () => {
    it('远端版本更新时应该使用 server-wins', async () => {
      const local: TestEntity = { id: '1', name: 'local', version: 1 }
      const remote: TestEntity = { id: '1', name: 'remote', version: 2 }

      const result = await resolver.resolveConflict(local, remote)
      expect(result.name).toBe('remote')
      expect(result.version).toBeGreaterThan(2)
    })

    it('本地版本更新时应该使用 local-wins', async () => {
      const local: TestEntity = { id: '1', name: 'local', version: 3 }
      const remote: TestEntity = { id: '1', name: 'remote', version: 1 }

      const result = await resolver.resolveConflict(local, remote)
      expect(result.name).toBe('local')
    })

    it('版本相同时应该执行合并（带 tags）', async () => {
      const local: TestEntity = { id: '1', name: 'local', tags: ['a', 'b'], version: 1 }
      const remote: TestEntity = { id: '1', name: 'remote', tags: ['b', 'c'], version: 1 }

      const result = await resolver.resolveConflict(local, remote)
      // merge 策略: 合并 tags
      expect(result.tags).toContain('a')
      expect(result.tags).toContain('b')
      expect(result.tags).toContain('c')
    })

    it('版本相同且无 tags 时应该使用远端', async () => {
      const local = { id: '1', name: 'local', version: 1 }
      const remote = { id: '1', name: 'remote', version: 1 }

      const result = await resolver.resolveConflict(local, remote)
      expect(result.name).toBe('remote')
    })

    it('无版本号时应该视为版本 0', async () => {
      const local: TestEntity = { id: '1', name: 'local' }
      const remote: TestEntity = { id: '1', name: 'remote' }

      // 两个都是 0，执行合并/远端优先
      const result = await resolver.resolveConflict(local, remote)
      expect(result.name).toBe('remote')
    })
  })

  describe('getConflictStats', () => {
    it('初始状态应该全部为 0', () => {
      const stats = resolver.getConflictStats()
      expect(stats.total).toBe(0)
      expect(stats.serverWins).toBe(0)
      expect(stats.localWins).toBe(0)
      expect(stats.merged).toBe(0)
    })

    it('应该正确统计冲突', async () => {
      // server-wins
      await resolver.resolveConflict({ id: '1', version: 1 }, { id: '1', version: 2 })
      // local-wins
      await resolver.resolveConflict({ id: '2', version: 3 }, { id: '2', version: 1 })
      // merged
      await resolver.resolveConflict({ id: '3', version: 1 }, { id: '3', version: 1 })

      const stats = resolver.getConflictStats()
      expect(stats.total).toBe(3)
      expect(stats.serverWins).toBe(1)
      expect(stats.localWins).toBe(1)
      expect(stats.merged).toBe(1)
    })

    it('应该返回统计的副本', () => {
      const stats1 = resolver.getConflictStats()
      const stats2 = resolver.getConflictStats()
      expect(stats1).not.toBe(stats2) // 不同引用
      expect(stats1).toEqual(stats2) // 相同值
    })
  })

  describe('resetConflictStats', () => {
    it('应该重置统计', async () => {
      await resolver.resolveConflict({ id: '1', version: 1 }, { id: '1', version: 2 })
      expect(resolver.getConflictStats().total).toBe(1)

      resolver.resetConflictStats()

      const stats = resolver.getConflictStats()
      expect(stats.total).toBe(0)
      expect(stats.serverWins).toBe(0)
      expect(stats.localWins).toBe(0)
      expect(stats.merged).toBe(0)
    })
  })
})
