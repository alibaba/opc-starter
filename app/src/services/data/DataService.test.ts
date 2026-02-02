import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Person } from '@/types/person'
import type { SyncStatus } from './DataService'

// -------------------- 全局环境与 Polyfill --------------------

// Mock navigator.onLine (jsdom 中是只读的，需要用 defineProperty)
let mockOnLine = true
Object.defineProperty(navigator, 'onLine', {
  get: () => mockOnLine,
  configurable: true,
})

// Helper: 模拟网络状态变化
const setMockOnline = (online: boolean) => {
  mockOnLine = online
  window.dispatchEvent(new Event(online ? 'online' : 'offline'))
}

// -------------------- 基础 mock 与状态 --------------------

const personStore: Record<string, Person> = {}

const personDBMock = {
  getAll: vi.fn(async () => Object.values(personStore)),
  getPersons: vi.fn(async () => Object.values(personStore)),
  getPerson: vi.fn(async (id: string) => personStore[id]),
  add: vi.fn(async (person: Person) => {
    personStore[person.id] = person
  }),
  addPersons: vi.fn(async (persons: Person[]) => {
    persons.forEach((p) => (personStore[p.id] = p))
  }),
  updatePerson: vi.fn(async (id: string, updates: Partial<Person>) => {
    personStore[id] = { ...(personStore[id] || { id }), ...updates } as Person
  }),
  deletePerson: vi.fn(async (id: string) => {
    delete personStore[id]
  }),
  clear: vi.fn(async () => {
    Object.keys(personStore).forEach((k) => delete personStore[k])
  }),
}

const supabaseState = {
  updatedAt: '2024-01-01T00:00:00.000Z',
  persons: [] as Record<string, unknown>[],
  user: { id: 'user-1' },
}

const channelHandlers: Record<
  string,
  | ((payload: {
      eventType: string
      new: Record<string, unknown>
      old: Record<string, unknown>
    }) => Promise<void> | void)
  | undefined
> = {}

const createChannel = (name: string) => {
  return {
    on: vi.fn(
      (
        _event: string,
        _filter: unknown,
        cb: (payload: {
          eventType: string
          new: Record<string, unknown>
          old: Record<string, unknown>
        }) => void
      ) => {
        channelHandlers[name] = cb
        return channelMocks[name]
      }
    ),
    subscribe: vi.fn(() => channelMocks[name]),
    unsubscribe: vi.fn(),
  }
}

const channelMocks: Record<string, ReturnType<typeof createChannel>> = {}

const buildQuery = (table: string) => {
  const dataMap: Record<string, Record<string, unknown>[]> = {
    persons: supabaseState.persons,
  }

  return {
    select: vi.fn(() => ({
      order: vi.fn(() =>
        Promise.resolve({
          data: dataMap[table] || [],
          error: null,
        })
      ),
      single: vi.fn(() =>
        Promise.resolve({
          data: { updated_at: supabaseState.updatedAt },
          error: null,
        })
      ),
      eq: vi.fn(() =>
        Promise.resolve({
          data: dataMap[table] || [],
          error: null,
        })
      ),
      then: (resolve: (v: unknown) => unknown) =>
        resolve({
          data: dataMap[table] || [],
          error: null,
        }),
    })),
    order: vi.fn(() =>
      Promise.resolve({
        data: dataMap[table] || [],
        error: null,
      })
    ),
    update: vi.fn(() => ({
      eq: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn(() =>
            Promise.resolve({
              data: { updated_at: supabaseState.updatedAt },
              error: null,
            })
          ),
        })),
        then: (resolve: (v: unknown) => unknown) =>
          resolve({
            data: null,
            error: null,
          }),
      })),
    })),
    insert: vi.fn(() => Promise.resolve({ data: null, error: null })),
    delete: vi.fn(() => ({
      eq: vi.fn(() => Promise.resolve({ data: null, error: null })),
    })),
    eq: vi.fn(() => ({
      select: vi.fn(() => ({
        single: vi.fn(() =>
          Promise.resolve({
            data: { updated_at: supabaseState.updatedAt },
            error: null,
          })
        ),
      })),
      then: (resolve: (v: unknown) => unknown) =>
        resolve({
          data: null,
          error: null,
        }),
    })),
  }
}

const supabaseMock = {
  auth: {
    getUser: vi.fn(async () => ({ data: { user: supabaseState.user } })),
  },
  from: vi.fn((table: string) => buildQuery(table)),
  channel: vi.fn((name: string) => {
    channelMocks[name] = createChannel(name)
    return channelMocks[name]
  }),
}

vi.mock('@/lib/supabase/client', () => ({ supabase: supabaseMock }))
vi.mock('@/services/db/personDB', () => ({ personDB: personDBMock }))
vi.mock('@/config/oss', () => ({
  convertToAccelerateUrl: vi.fn((url: string) => `accel:${url}`),
}))

let dataService: (typeof import('./DataService'))['dataService']

const basePerson = (): Person => ({
  id: 'p1',
  name: '张三',
  avatar: 'https://example.com/avatar.jpg',
  department: '工程部',
  joinedAt: new Date('2024-01-01'),
  photoCount: 0,
  tags: ['developer'],
  position: '高级工程师',
  bio: '专注于前端开发',
})

beforeEach(async () => {
  vi.clearAllMocks()
  vi.resetModules()
  localStorage.clear()
  mockOnLine = true // 重置网络状态为在线
  Object.keys(personStore).forEach((k) => delete personStore[k])
  Object.keys(channelHandlers).forEach((k) => delete channelHandlers[k])
  Object.keys(channelMocks).forEach((k) => delete channelMocks[k])
  supabaseState.persons = []
  supabaseState.user = { id: 'user-1' }

  dataService = (await import('./DataService')).dataService
}, 30000) // 增加 beforeEach 超时时间到 30s，因为 resetModules + 动态导入可能较慢

// -------------------- 测试用例 --------------------

describe('DataService 对外能力', () => {
  it('应维护同步状态并响应网络事件', () => {
    const statuses: SyncStatus[] = []
    const off = dataService.onSyncStatusChange((s) => statuses.push(s))

    expect(dataService.getSyncStatus()).toBe('idle')
    expect(statuses.at(0)).toBe('idle')

    // 使用 helper 模拟网络断开（同时更新 navigator.onLine 和触发事件）
    setMockOnline(false)
    expect(dataService.checkOnline()).toBe(false)

    // 使用 helper 模拟网络恢复
    setMockOnline(true)
    expect(dataService.getNetworkStatus()).toBe(true)
    off()
  })

  it('应读取人员数据', async () => {
    personStore['p1'] = basePerson()

    const all = await dataService.getPersons()
    const single = await dataService.getPerson('p1')

    expect(all.length).toBe(1)
    expect(single?.id).toBe('p1')
  })

  it('subscribeAll 返回统一取消函数并清理', () => {
    const offAll = dataService.subscribeAll()
    offAll()
    dataService.cleanup()

    Object.values(channelMocks).forEach((ch) => {
      expect(ch.unsubscribe).toHaveBeenCalled()
    })
  })

  it('initialSync 在联网且登录时拉取数据并启动订阅', async () => {
    supabaseState.persons = [
      {
        id: 'cloud-person-1',
        name: '李四',
        avatar: 'https://example.com/li4.jpg',
        department: '市场部',
        joined_at: supabaseState.updatedAt,
        photo_count: 0,
        tags: ['marketing'],
        position: '市场总监',
        bio: '负责品牌推广',
      },
    ]

    await dataService.initialSync()

    expect(dataService.hasCompletedInitialSync()).toBe(true)
    expect(dataService.getSyncStatus()).toBe('synced')
  })

  it('队列统计', async () => {
    const stats = dataService.getQueueStats()

    expect(stats.queueSize).toBeDefined()
    expect(stats.operations).toBeInstanceOf(Array)
  })

  it('triggerQueueProcessing 在离线时直接返回', async () => {
    setMockOnline(false)

    const res = await dataService.triggerQueueProcessing()
    expect(res).toEqual({ success: 0, failed: 0 })
  })

  it('getSyncStats 应返回当前同步指标', () => {
    const stats = dataService.getSyncStats()
    expect(stats.status).toBeDefined()
    expect(stats.queueSize).toBeDefined()
    expect(typeof stats.isOnline).toBe('boolean')
  })

  it('getConflictStats 和 resetConflictStats 应该工作', () => {
    const stats = dataService.getConflictStats()
    expect(stats.total).toBeDefined()
    expect(stats.serverWins).toBeDefined()
    expect(stats.localWins).toBeDefined()
    expect(stats.merged).toBeDefined()

    dataService.resetConflictStats()
    expect(dataService.getConflictStats().total).toBe(0)
  })
})

describe('DataService Collection Access', () => {
  describe('Collection Access', () => {
    it('应该提供 persons collection', () => {
      expect(dataService.persons).toBeDefined()
      expect(typeof dataService.persons.find).toBe('function')
      expect(typeof dataService.persons.findOne).toBe('function')
      expect(typeof dataService.persons.insert).toBe('function')
      expect(typeof dataService.persons.update).toBe('function')
      expect(typeof dataService.persons.remove).toBe('function')
    })
  })

  describe('Singleton Pattern', () => {
    it('应该返回同一实例', async () => {
      const { DataServiceClass } = await import('./DataService')
      const a = DataServiceClass.getInstance()
      const b = DataServiceClass.getInstance()
      expect(a).toBe(b)
    })
  })

  describe('Collection Observable API', () => {
    it('persons.find() 应该返回 Observable', () => {
      const observable = dataService.persons.find()
      expect(observable).toBeDefined()
      expect(typeof observable.subscribe).toBe('function')
    })
  })
})
