import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Album } from '@/types/album'
import type { Person } from '@/types/person'
import type { Photo } from '@/types/photo'
import type { SyncStatus } from './DataService'

// -------------------- 全局环境与 Polyfill --------------------
// 注意: vitest 使用 jsdom 环境，window/navigator/localStorage 已存在
// 这里仅提供必要的 polyfill 和 mock

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

const photoStore: Record<string, Photo> = {}
const albumStore: Record<string, Album> = {}
const personStore: Record<string, Person> = {}

const photoDBMock = {
  get: vi.fn(async (id: string) => photoStore[id]),
  getAll: vi.fn(async () => Object.values(photoStore)),
  getPhotos: vi.fn(async (page = 1, pageSize = 20) => {
    const all = Object.values(photoStore)
    const start = (page - 1) * pageSize
    return { items: all.slice(start, start + pageSize), total: all.length }
  }),
  add: vi.fn(async (photo: Photo) => {
    photoStore[photo.id] = photo
  }),
  addPhotos: vi.fn(async (photos: Photo[]) => {
    photos.forEach(p => (photoStore[p.id] = p))
  }),
  updatePhoto: vi.fn(async (id: string, data: Partial<Photo>) => {
    photoStore[id] = { ...(photoStore[id] || { id }), ...data } as Photo
  }),
  deletePhoto: vi.fn(async (id: string) => {
    delete photoStore[id]
  }),
  clear: vi.fn(async () => {
    Object.keys(photoStore).forEach(k => delete photoStore[k])
  }),
}

const albumDBMock = {
  getAll: vi.fn(async () => Object.values(albumStore)),
  getAlbums: vi.fn(async () => Object.values(albumStore)),
  getAlbum: vi.fn(async (id: string) => albumStore[id]),
  add: vi.fn(async (album: Album) => {
    albumStore[album.id] = album
  }),
  addAlbums: vi.fn(async (albums: Album[]) => {
    albums.forEach(a => (albumStore[a.id] = a))
  }),
  updateAlbum: vi.fn(async (id: string, updates: Partial<Album>) => {
    albumStore[id] = { ...(albumStore[id] || { id }), ...updates } as Album
  }),
  deleteAlbum: vi.fn(async (id: string) => {
    delete albumStore[id]
  }),
}

const personDBMock = {
  getAll: vi.fn(async () => Object.values(personStore)),
  getPersons: vi.fn(async () => Object.values(personStore)),
  getPerson: vi.fn(async (id: string) => personStore[id]),
  add: vi.fn(async (person: Person) => {
    personStore[person.id] = person
  }),
  addPersons: vi.fn(async (persons: Person[]) => {
    persons.forEach(p => (personStore[p.id] = p))
  }),
  updatePerson: vi.fn(async (id: string, updates: Partial<Person>) => {
    personStore[id] = { ...(personStore[id] || { id }), ...updates } as Person
  }),
  deletePerson: vi.fn(async (id: string) => {
    delete personStore[id]
  }),
}

const supabaseState = {
  updatedAt: '2024-01-01T00:00:00.000Z',
  photos: [] as Record<string, unknown>[],
  albums: [] as Record<string, unknown>[],
  faces: [] as Record<string, unknown>[],
  user: { id: 'user-1' },
}

const channelHandlers: Record<string, ((payload: any) => Promise<void> | void) | undefined> = {}

const createChannel = (name: string) => {
  return {
    on: vi.fn((_event: string, _filter: unknown, cb: (payload: any) => void) => {
      channelHandlers[name] = cb
      return channelMocks[name]
    }),
    subscribe: vi.fn(() => channelMocks[name]),
    unsubscribe: vi.fn(),
  }
}

const channelMocks: Record<string, ReturnType<typeof createChannel>> = {}

const buildQuery = (table: string) => {
  const dataMap: Record<string, Record<string, unknown>[]> = {
    photos: supabaseState.photos,
    albums: supabaseState.albums,
    faces: supabaseState.faces,
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
vi.mock('@/services/db/photoDB', () => ({ photoDB: photoDBMock }))
vi.mock('@/services/db/albumDB', () => ({ albumDB: albumDBMock }))
vi.mock('@/services/db/personDB', () => ({ personDB: personDBMock }))
vi.mock('@/config/oss', () => ({
  convertToAccelerateUrl: vi.fn((url: string) => `accel:${url}`),
}))

let dataService: typeof import('./DataService')['dataService']

const basePhoto = (): Photo => ({
  id: 'p1',
  tags: ['old'],
  version: 1,
  cloudSyncStatus: 'synced',
  base64: 'url',
  thumbnail: 'url',
  uploadedAt: new Date(),
  takenAt: null,
  faces: [],
  metadata: { width: 1, height: 1, size: 1, format: 'image/jpeg' },
  oss_url: 'url',
  cloudStoragePath: 'url',
})

beforeEach(async () => {
  vi.clearAllMocks()
  vi.resetModules()
  localStorage.clear()
  mockOnLine = true // 重置网络状态为在线
  Object.keys(photoStore).forEach(k => delete photoStore[k])
  Object.keys(albumStore).forEach(k => delete albumStore[k])
  Object.keys(personStore).forEach(k => delete personStore[k])
  Object.keys(channelHandlers).forEach(k => delete channelHandlers[k])
  Object.keys(channelMocks).forEach(k => delete channelMocks[k])
  supabaseState.photos = []
  supabaseState.albums = []
  supabaseState.faces = []
  supabaseState.user = { id: 'user-1' }

  dataService = (await import('./DataService')).dataService
}, 30000) // 增加 beforeEach 超时时间到 30s，因为 resetModules + 动态导入可能较慢

// -------------------- 测试用例 --------------------

describe('DataService 对外能力', () => {
  it('应维护同步状态并响应网络事件', () => {
    const statuses: SyncStatus[] = []
    const off = dataService.onSyncStatusChange(s => statuses.push(s))

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

  it('应执行乐观更新并同步云端成功', async () => {
    const now = new Date('2024-02-01T00:00:00.000Z')
    supabaseState.updatedAt = now.toISOString()
    photoStore['p1'] = basePhoto()

    const updated = await dataService.optimisticUpdate('p1', { tags: ['new'] })

    expect(updated.tags).toEqual(['new'])
    expect(updated.cloudSyncStatus).toBe('synced')
    expect(photoDBMock.updatePhoto).toHaveBeenCalled()
  })

  it('离线乐观更新应入队并标记 pending', async () => {
    photoStore['p1'] = basePhoto()
    ;(dataService as any).isOnline = false

    const updated = await dataService.optimisticUpdate('p1', { tags: ['offline'] })
    const queue = dataService.getQueueStats()

    expect(updated.cloudSyncStatus).toBe('pending')
    expect(queue.queueSize).toBe(1)
    expect(queue.operations[0]?.type).toBe('update')
  })

  it('应读取照片数据', async () => {
    photoStore['p1'] = basePhoto()

    const list = await dataService.getPhotos({ page: 1, pageSize: 10 })
    const all = await dataService.getAllPhotos()
    const single = await dataService.getPhoto('p1')

    expect(list.total).toBe(1)
    expect(all.length).toBe(1)
    expect(single?.id).toBe('p1')
  })

  it('addPhoto 已废弃应抛出错误', async () => {
    await expect(dataService.addPhoto()).rejects.toThrow(/deprecated/i)
  })

  it('删除照片离线时入队', async () => {
    photoStore['p1'] = basePhoto()
    ;(dataService as any).isOnline = false

    await dataService.deletePhoto('p1')
    const queue = dataService.getQueueStats()

    expect(photoStore['p1']).toBeUndefined()
    expect(queue.queueSize).toBeGreaterThan(0)
    expect(queue.operations[0]?.type).toBe('delete')
  })

  it('批量删除应收集失败项', async () => {
    photoStore['p1'] = basePhoto()
    photoStore['p2'] = { ...basePhoto(), id: 'p2' }
    photoDBMock.deletePhoto.mockRejectedValueOnce(new Error('boom'))

    const result = await dataService.batchDeletePhotos(['p1', 'p2'])

    expect(result.success).toContain('p2')
    expect(result.failed[0]?.id).toBe('p1')
  })

  it('订阅照片应更新本地并可取消', async () => {
    const changes: string[] = []
    const off = dataService.subscribePhotos(evt => changes.push(evt.type))
    const handler = channelHandlers['photos-realtime']

    await handler?.({
      eventType: 'INSERT',
      new: {
        id: 'p3',
        updated_at: supabaseState.updatedAt,
        created_at: supabaseState.updatedAt,
        taken_at: supabaseState.updatedAt,
        oss_url: 'foo',
        mime_type: 'image/jpeg',
        width: 10,
        height: 10,
        file_size: 1,
      },
      old: {},
    })

    expect(photoStore['p3']).toBeTruthy()
    expect(changes).toContain('INSERT')
    off()
  })

  it('subscribeAll 返回统一取消函数并清理', () => {
    const offAll = dataService.subscribeAll()
    offAll()
    dataService.cleanup()

    Object.values(channelMocks).forEach(ch => {
      expect(ch.unsubscribe).toHaveBeenCalled()
    })
  })

  it('initialSync 在联网且登录时拉取数据并启动订阅', async () => {
    supabaseState.photos = [
      {
        id: 'cloud-1',
        updated_at: supabaseState.updatedAt,
        created_at: supabaseState.updatedAt,
        taken_at: supabaseState.updatedAt,
        oss_url: 'oss://x',
        mime_type: 'jpg',
        width: 100,
        height: 200,
        file_size: 10,
      },
    ]

    await dataService.initialSync()

    expect(photoStore['cloud-1']).toBeTruthy()
    expect(dataService.hasCompletedInitialSync()).toBe(true)
    expect(dataService.getSyncStatus()).toBe('synced')
  })

  it('incrementalSync 应处理新增和删除', async () => {
    photoStore['local-only'] = { ...basePhoto(), id: 'local-only' }
    supabaseState.photos = [
      {
        id: 'cloud-new',
        updated_at: supabaseState.updatedAt,
        created_at: supabaseState.updatedAt,
        taken_at: supabaseState.updatedAt,
        oss_url: 'oss://new',
        mime_type: 'image/jpeg',
        width: 10,
        height: 10,
        file_size: 1,
      },
    ]
    ;(dataService as any).lastFullSyncAt = 0

    const result = await dataService.incrementalSync()

    expect(result.added).toBe(1)
    expect(result.deleted).toBe(1)
    expect(photoStore['cloud-new']).toBeTruthy()
    expect(photoStore['local-only']).toBeUndefined()
  })

  it('forceFullSync 应清空本地并触发初始同步', async () => {
    const spy = vi.spyOn(dataService, 'initialSync').mockResolvedValue()
    photoStore['p1'] = basePhoto()

    await dataService.forceFullSync()

    expect(photoDBMock.clear).toHaveBeenCalled()
    expect(spy).toHaveBeenCalled()
    spy.mockRestore()
  })

  it('队列统计与过滤查询', async () => {
    photoStore['p1'] = { ...basePhoto(), cloudSyncStatus: 'pending' }
    photoStore['p2'] = { ...basePhoto(), id: 'p2', cloudSyncStatus: 'error' }
    // 重构后离线队列由 offlineQueueManager 管理，通过 setQueue 注入测试数据
    ;(dataService as any).offlineQueueManager.setQueue([{ type: 'update', entityType: 'photo', id: 'p1', data: {}, timestamp: 0, retryCount: 0 }])

    const stats = dataService.getQueueStats()
    const pending = await dataService.getPendingPhotos()
    const failed = await dataService.getFailedPhotos()

    expect(stats.queueSize).toBe(1)
    expect(pending.map(p => p.id)).toContain('p1')
    expect(failed.map(p => p.id)).toContain('p2')
  })

  it('retryFailedSync 应重置状态并处理队列', async () => {
    photoStore['p2'] = { ...basePhoto(), id: 'p2', cloudSyncStatus: 'error', tags: ['x'] }
    const process = vi.spyOn(dataService as any, 'processOfflineQueue').mockResolvedValue({ success: 1, failed: 0 })

    const res = await dataService.retryFailedSync()

    expect(process).toHaveBeenCalled()
    expect(res.success).toBe(1)
    process.mockRestore()
  })

  it('triggerQueueProcessing 在离线时直接返回', async () => {
    ;(dataService as any).isOnline = false
    const process = vi.spyOn(dataService as any, 'processOfflineQueue').mockResolvedValue({ success: 0, failed: 0 })

    const res = await dataService.triggerQueueProcessing()
    expect(res).toEqual({ success: 0, failed: 0 })
    expect(process).not.toHaveBeenCalled()
    process.mockRestore()
  })

  it('resolveConflict 处理三种版本场景并更新统计', async () => {
    const local = { ...basePhoto(), id: 'p-conflict', tags: ['a'], version: 1 }
    const remote = { ...basePhoto(), id: 'p-conflict', tags: ['b'], version: 2 }
    photoStore['p-conflict'] = local

    const serverWins = await dataService.resolveConflict(local, remote)
    expect(serverWins.tags).toContain('b')

    const localNewer = { ...basePhoto(), id: 'p-local', tags: ['l'], version: 3 }
    const remoteOld = { ...basePhoto(), id: 'p-local', tags: ['r'], version: 1 }
    photoStore['p-local'] = localNewer
    await dataService.resolveConflict(localNewer, remoteOld)

    const equalA = { ...basePhoto(), id: 'p-merge', tags: ['x'], participants: ['u1'], version: 5 }
    const equalB = { ...basePhoto(), id: 'p-merge', tags: ['y'], version: 5, participants: ['u2'] }
    photoStore['p-merge'] = equalA
    const merged = await dataService.resolveConflict(equalA as any, equalB as any)
    expect(merged.tags?.sort()).toEqual(['x', 'y'])
    expect((merged as any).participants?.length).toBe(2)

    const stats = dataService.getConflictStats()
    expect(stats.total).toBe(3)
    expect(stats.serverWins).toBeGreaterThan(0)
    expect(stats.localWins).toBeGreaterThan(0)
    expect(stats.merged).toBeGreaterThan(0)

    dataService.resetConflictStats()
    expect(dataService.getConflictStats().total).toBe(0)
  })

  it('getSyncStats 应返回当前同步指标', () => {
    const stats = dataService.getSyncStats()
    expect(stats.status).toBeDefined()
    expect(stats.queueSize).toBeDefined()
    expect(typeof stats.isOnline).toBe('boolean')
  })
})

describe('DataService Collection Access (S21-5)', () => {
  describe('Collection Access', () => {
    it('应该提供 photos collection', () => {
      expect(dataService.photos).toBeDefined()
      expect(typeof dataService.photos.find).toBe('function')
      expect(typeof dataService.photos.findOne).toBe('function')
      expect(typeof dataService.photos.insert).toBe('function')
      expect(typeof dataService.photos.update).toBe('function')
      expect(typeof dataService.photos.remove).toBe('function')
    })

    it('应该提供 albums collection', () => {
      expect(dataService.albums).toBeDefined()
      expect(typeof dataService.albums.find).toBe('function')
    })

    it('应该提供 persons collection', () => {
      expect(dataService.persons).toBeDefined()
      expect(typeof dataService.persons.find).toBe('function')
    })

    it('应该提供 tags collection', () => {
      expect(dataService.tags).toBeDefined()
      expect(typeof dataService.tags.find).toBe('function')
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
    it('photos.find() 应该返回 Observable', () => {
      const observable = dataService.photos.find()
      expect(observable).toBeDefined()
      expect(typeof observable.subscribe).toBe('function')
    })

    it('photos.find() 应该支持函数过滤器', async () => {
      const photo1: Photo = { ...basePhoto(), id: 'filter-1', tags: ['family'] }
      await dataService.photos.insert(photo1)
      
      const { firstValueFrom } = await import('rxjs')
      const photos = await firstValueFrom(
        dataService.photos.find({ 
          filter: (p: Photo) => p.tags?.includes('family') ?? false 
        })
      )
      expect(photos.length).toBeGreaterThan(0)
      expect(photos[0].tags).toContain('family')
    })
  })
})