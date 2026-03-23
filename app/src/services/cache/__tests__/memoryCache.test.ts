/**
 * memoryCache 内存缓存服务测试
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { memoryCache } from '../memoryCache'

describe('memoryCache', () => {
  beforeEach(() => {
    memoryCache.clear()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('get/set', () => {
    it('应该设置并获取缓存数据', () => {
      memoryCache.set('test-key', { name: 'test' })
      expect(memoryCache.get('test-key')).toEqual({ name: 'test' })
    })

    it('应该返回 null 当缓存不存在', () => {
      expect(memoryCache.get('non-existent')).toBeNull()
    })

    it('应该在 TTL 过期后返回 null', () => {
      memoryCache.set('expire-key', 'value', 1000) // 1秒 TTL
      expect(memoryCache.get('expire-key')).toBe('value')

      vi.advanceTimersByTime(1001) // 过期
      expect(memoryCache.get('expire-key')).toBeNull()
    })

    it('应该在 TTL 内返回缓存', () => {
      memoryCache.set('valid-key', 'value', 5000)
      vi.advanceTimersByTime(3000) // 未过期
      expect(memoryCache.get('valid-key')).toBe('value')
    })

    it('应该使用默认 TTL 当未指定', () => {
      memoryCache.set('default-ttl', 'value')
      // 默认 TTL 是 5 分钟 = 300000ms
      vi.advanceTimersByTime(299999)
      expect(memoryCache.get('default-ttl')).toBe('value')

      vi.advanceTimersByTime(2) // 超过 5 分钟
      expect(memoryCache.get('default-ttl')).toBeNull()
    })

    it('应该支持泛型类型', () => {
      interface User {
        id: string
        name: string
      }
      const user: User = { id: '1', name: 'Test' }
      memoryCache.set<User>('user', user)
      const cached = memoryCache.get<User>('user')
      expect(cached?.name).toBe('Test')
    })
  })

  describe('getOrFetch', () => {
    it('应该返回缓存数据当存在', async () => {
      memoryCache.set('cached', 'cached-value')
      const fetcher = vi.fn().mockResolvedValue('fetched-value')

      const result = await memoryCache.getOrFetch('cached', fetcher)
      expect(result).toBe('cached-value')
      expect(fetcher).not.toHaveBeenCalled()
    })

    it('应该调用 fetcher 当缓存不存在', async () => {
      const fetcher = vi.fn().mockResolvedValue('fetched-value')

      const result = await memoryCache.getOrFetch('new-key', fetcher)
      expect(result).toBe('fetched-value')
      expect(fetcher).toHaveBeenCalledOnce()
    })

    it('应该缓存 fetcher 返回的数据', async () => {
      const fetcher = vi.fn().mockResolvedValue('fetched-value')

      await memoryCache.getOrFetch('fetch-key', fetcher)
      const cached = memoryCache.get('fetch-key')
      expect(cached).toBe('fetched-value')
    })

    it('应该复用并发请求的 Promise', async () => {
      let resolvePromise: (value: string) => void
      const fetcher = vi.fn().mockImplementation(
        () =>
          new Promise<string>((resolve) => {
            resolvePromise = resolve
          })
      )

      const p1 = memoryCache.getOrFetch('concurrent', fetcher)
      const p2 = memoryCache.getOrFetch('concurrent', fetcher)

      // fetcher 只被调用一次
      expect(fetcher).toHaveBeenCalledOnce()

      resolvePromise!('result')
      const [r1, r2] = await Promise.all([p1, p2])
      expect(r1).toBe('result')
      expect(r2).toBe('result')
    })

    it('应该在 fetcher 失败后清理 pending promise', async () => {
      const fetcher = vi
        .fn()
        .mockRejectedValueOnce(new Error('fail'))
        .mockResolvedValueOnce('success')

      await expect(memoryCache.getOrFetch('fail-key', fetcher)).rejects.toThrow('fail')

      // 第二次调用应该重新请求
      const result = await memoryCache.getOrFetch('fail-key', fetcher)
      expect(result).toBe('success')
      expect(fetcher).toHaveBeenCalledTimes(2)
    })

    it('应该使用指定的 TTL', async () => {
      const fetcher = vi.fn().mockResolvedValue('value')
      await memoryCache.getOrFetch('ttl-key', fetcher, 2000)

      vi.advanceTimersByTime(1999)
      expect(memoryCache.get('ttl-key')).toBe('value')

      vi.advanceTimersByTime(2)
      expect(memoryCache.get('ttl-key')).toBeNull()
    })
  })

  describe('delete', () => {
    it('应该删除指定缓存', () => {
      memoryCache.set('del-key', 'value')
      memoryCache.delete('del-key')
      expect(memoryCache.get('del-key')).toBeNull()
    })
  })

  describe('deleteByPrefix', () => {
    it('应该删除匹配前缀的所有缓存', () => {
      memoryCache.set('org:tree', 'tree-data')
      memoryCache.set('org:detail:1', 'detail-1')
      memoryCache.set('org:members:1', 'members-1')
      memoryCache.set('profile:user1', 'profile-1')

      memoryCache.deleteByPrefix('org:')

      expect(memoryCache.get('org:tree')).toBeNull()
      expect(memoryCache.get('org:detail:1')).toBeNull()
      expect(memoryCache.get('org:members:1')).toBeNull()
      expect(memoryCache.get('profile:user1')).toBe('profile-1') // 不受影响
    })

    it('应该在没有匹配前缀时不做操作', () => {
      memoryCache.set('key1', 'value1')
      memoryCache.deleteByPrefix('nonexistent:')
      expect(memoryCache.get('key1')).toBe('value1')
    })
  })

  describe('clear', () => {
    it('应该清空所有缓存', () => {
      memoryCache.set('key1', 'v1')
      memoryCache.set('key2', 'v2')
      memoryCache.clear()
      expect(memoryCache.get('key1')).toBeNull()
      expect(memoryCache.get('key2')).toBeNull()
    })
  })

  describe('getStats', () => {
    it('应该返回缓存统计信息', () => {
      memoryCache.set('key1', 'v1')
      memoryCache.set('key2', 'v2')

      const stats = memoryCache.getStats()
      expect(stats.size).toBe(2)
      expect(stats.keys).toContain('key1')
      expect(stats.keys).toContain('key2')
    })

    it('应该在清空后返回 0', () => {
      memoryCache.set('key1', 'v1')
      memoryCache.clear()

      const stats = memoryCache.getStats()
      expect(stats.size).toBe(0)
      expect(stats.keys).toHaveLength(0)
    })
  })

  describe('invalidateOrganizations', () => {
    it('应该失效所有组织相关缓存', () => {
      memoryCache.set('org:tree', 'tree')
      memoryCache.set('org:detail:1', 'detail')
      memoryCache.set('org:members:1', 'members')
      memoryCache.set('profile:user1', 'profile')

      memoryCache.invalidateOrganizations()

      expect(memoryCache.get('org:tree')).toBeNull()
      expect(memoryCache.get('org:detail:1')).toBeNull()
      expect(memoryCache.get('org:members:1')).toBeNull()
      expect(memoryCache.get('profile:user1')).toBe('profile')
    })
  })

  describe('invalidateProfiles', () => {
    it('应该失效所有用户资料缓存和全部用户缓存', () => {
      memoryCache.set('profile:user1', 'p1')
      memoryCache.set('profile:user2', 'p2')
      memoryCache.set(memoryCache.KEYS.ALL_USERS, 'all')
      memoryCache.set('org:tree', 'tree')

      memoryCache.invalidateProfiles()

      expect(memoryCache.get('profile:user1')).toBeNull()
      expect(memoryCache.get('profile:user2')).toBeNull()
      expect(memoryCache.get(memoryCache.KEYS.ALL_USERS)).toBeNull()
      expect(memoryCache.get('org:tree')).toBe('tree')
    })
  })

  describe('invalidateAll', () => {
    it('应该失效所有缓存', () => {
      memoryCache.set('org:tree', 'tree')
      memoryCache.set('profile:user1', 'profile')

      memoryCache.invalidateAll()

      expect(memoryCache.getStats().size).toBe(0)
    })
  })

  describe('KEYS', () => {
    it('应该包含正确的缓存键前缀', () => {
      expect(memoryCache.KEYS.ORG_TREE).toBe('org:tree')
      expect(memoryCache.KEYS.ORG_DETAIL).toBe('org:detail:')
      expect(memoryCache.KEYS.ORG_MEMBERS).toBe('org:members:')
      expect(memoryCache.KEYS.USER_ORG_INFO).toBe('org:userinfo:')
      expect(memoryCache.KEYS.PROFILE).toBe('profile:')
      expect(memoryCache.KEYS.ALL_USERS).toBe('users:all')
    })
  })

  describe('TTL 常量', () => {
    it('应该有正确的 TTL 值', () => {
      expect(memoryCache.ORG_TTL).toBe(10 * 60 * 1000) // 10分钟
      expect(memoryCache.PROFILE_TTL).toBe(5 * 60 * 1000) // 5分钟
    })
  })
})
