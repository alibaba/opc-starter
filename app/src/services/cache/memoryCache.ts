/**
 * 内存缓存服务 (Epic-18: 减少 API 请求)
 * 
 * 用于缓存不频繁变化的数据，如：
 * - organizations（组织树）
 * - profiles（用户资料）
 * 
 * 特点：
 * - 支持 TTL（过期时间）
 * - 支持手动失效
 * - 支持 Realtime 事件自动失效
 */

interface CacheEntry<T> {
  data: T
  timestamp: number
  ttl: number
}

class MemoryCache {
  private cache: Map<string, CacheEntry<unknown>> = new Map()
  private pendingPromises: Map<string, Promise<unknown>> = new Map()
  
  /** 默认 TTL: 5 分钟 */
  private readonly DEFAULT_TTL = 5 * 60 * 1000
  
  /** 组织数据 TTL: 10 分钟（变化较少） */
  readonly ORG_TTL = 10 * 60 * 1000
  
  /** 用户资料 TTL: 5 分钟 */
  readonly PROFILE_TTL = 5 * 60 * 1000
  
  /** 缓存键前缀 */
  readonly KEYS = {
    ORG_TREE: 'org:tree',
    ORG_DETAIL: 'org:detail:',
    ORG_MEMBERS: 'org:members:',
    USER_ORG_INFO: 'org:userinfo:',
    PROFILE: 'profile:',
    ALL_USERS: 'users:all',
  }

  /**
   * 获取缓存数据
   */
  get<T>(key: string): T | null {
    const entry = this.cache.get(key) as CacheEntry<T> | undefined
    
    if (!entry) {
      return null
    }
    
    // 检查是否过期
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key)
      console.log(`[MemoryCache] 缓存过期: ${key}`)
      return null
    }
    
    console.log(`[MemoryCache] 缓存命中: ${key}`)
    return entry.data
  }

  /**
   * 设置缓存数据
   */
  set<T>(key: string, data: T, ttl: number = this.DEFAULT_TTL): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl,
    })
    console.log(`[MemoryCache] 缓存写入: ${key} (TTL: ${ttl / 1000}s)`)
  }

  /**
   * 获取或获取数据（防止竞态条件）
   * 如果缓存存在则返回缓存，否则执行 fetcher 并缓存结果
   * 多个并发请求会复用同一个 Promise
   */
  async getOrFetch<T>(key: string, fetcher: () => Promise<T>, ttl: number = this.DEFAULT_TTL): Promise<T> {
    const cached = this.get<T>(key)
    if (cached !== null) {
      return cached
    }

    const pending = this.pendingPromises.get(key) as Promise<T> | undefined
    if (pending) {
      console.log(`[MemoryCache] 复用进行中的请求: ${key}`)
      return pending
    }

    const promise = fetcher().then(result => {
      this.set(key, result, ttl)
      this.pendingPromises.delete(key)
      return result
    }).catch(error => {
      this.pendingPromises.delete(key)
      throw error
    })

    this.pendingPromises.set(key, promise)
    return promise
  }

  /**
   * 删除缓存
   */
  delete(key: string): void {
    this.cache.delete(key)
    console.log(`[MemoryCache] 缓存删除: ${key}`)
  }

  /**
   * 删除匹配前缀的所有缓存
   */
  deleteByPrefix(prefix: string): void {
    let count = 0
    for (const key of this.cache.keys()) {
      if (key.startsWith(prefix)) {
        this.cache.delete(key)
        count++
      }
    }
    if (count > 0) {
      console.log(`[MemoryCache] 批量删除 ${count} 个缓存 (前缀: ${prefix})`)
    }
  }

  /**
   * 清空所有缓存
   */
  clear(): void {
    this.cache.clear()
    console.log('[MemoryCache] 缓存已清空')
  }

  /**
   * 获取缓存统计
   */
  getStats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys()),
    }
  }

  /**
   * 失效组织相关缓存
   */
  invalidateOrganizations(): void {
    this.deleteByPrefix('org:')
  }

  /**
   * 失效用户资料缓存
   */
  invalidateProfiles(): void {
    this.deleteByPrefix('profile:')
    this.delete(this.KEYS.ALL_USERS)
  }

  /**
   * 失效所有缓存
   */
  invalidateAll(): void {
    this.clear()
  }
}

// 导出单例
export const memoryCache = new MemoryCache()

// 监听 Supabase Realtime 事件，自动失效缓存
if (typeof window !== 'undefined') {
  // 组织变更时失效缓存
  window.addEventListener('dataservice:org-change', () => {
    memoryCache.invalidateOrganizations()
  })
  
  // 用户资料变更时失效缓存
  window.addEventListener('dataservice:profile-change', () => {
    memoryCache.invalidateProfiles()
  })
}