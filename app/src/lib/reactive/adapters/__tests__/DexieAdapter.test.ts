import 'fake-indexeddb/auto'
import { beforeEach, afterEach, describe, expect, it } from 'vitest'
import Dexie, { type Table } from 'dexie'
import { DexieAdapter } from '../DexieAdapter'
import type { BaseEntity } from '../../types'

interface TestPhoto extends BaseEntity {
  title: string
  url: string
  albumId?: string
  createdAt?: Date
}

class TestDB extends Dexie {
  photos!: Table<TestPhoto, string>
  
  constructor() {
    super('test-db')
    this.version(1).stores({
      photos: 'id, albumId, createdAt'
    })
  }
}

describe('DexieAdapter', () => {
  let db: TestDB
  let adapter: DexieAdapter<TestPhoto>

  beforeEach(async () => {
    db = new TestDB()
    await db.open()
    adapter = new DexieAdapter(db.photos)
  })

  afterEach(async () => {
    await db.delete()
  })

  describe('CRUD Operations', () => {
    it('findAll() 应该返回所有记录', async () => {
      await adapter.upsert({ id: '1', title: 'Photo 1', url: 'a.jpg' })
      await adapter.upsert({ id: '2', title: 'Photo 2', url: 'b.jpg' })

      const all = await adapter.findAll()
      expect(all).toHaveLength(2)
    })

    it('findOne() 应该返回单条记录', async () => {
      await adapter.upsert({ id: '1', title: 'Photo 1', url: 'a.jpg' })
      
      const found = await adapter.findOne('1')
      expect(found?.title).toBe('Photo 1')
    })

    it('findOne() 不存在时返回 undefined', async () => {
      const found = await adapter.findOne('non-existent')
      expect(found).toBeUndefined()
    })

    it('query() 应该支持过滤', async () => {
      await adapter.upsert({ id: '1', albumId: 'a', title: 'P1', url: 'a.jpg' })
      await adapter.upsert({ id: '2', albumId: 'b', title: 'P2', url: 'b.jpg' })

      const filtered = await adapter.query({ filter: { albumId: 'a' } })
      expect(filtered).toHaveLength(1)
      expect(filtered[0].albumId).toBe('a')
    })

    it('query() 应该支持函数过滤', async () => {
      await adapter.upsert({ id: '1', title: 'Alpha', url: 'a.jpg' })
      await adapter.upsert({ id: '2', title: 'Beta', url: 'b.jpg' })

      const filtered = await adapter.query({ 
        filter: (item) => item.title.startsWith('A') 
      })
      expect(filtered).toHaveLength(1)
      expect(filtered[0].title).toBe('Alpha')
    })

    it('query() 应该支持排序', async () => {
      await adapter.upsert({ id: '1', title: 'B', url: 'b.jpg' })
      await adapter.upsert({ id: '2', title: 'A', url: 'a.jpg' })

      const sorted = await adapter.query({ sort: { field: 'title', order: 'asc' } })
      expect(sorted[0].title).toBe('A')
      expect(sorted[1].title).toBe('B')
    })

    it('query() 应该支持分页', async () => {
      await adapter.upsert({ id: '1', title: 'P1', url: '1.jpg' })
      await adapter.upsert({ id: '2', title: 'P2', url: '2.jpg' })
      await adapter.upsert({ id: '3', title: 'P3', url: '3.jpg' })

      const page = await adapter.query({ offset: 1, limit: 1 })
      expect(page).toHaveLength(1)
    })

    it('upsert() 应该插入新记录', async () => {
      await adapter.upsert({ id: '1', title: 'New', url: 'new.jpg' })
      const found = await adapter.findOne('1')
      expect(found?.title).toBe('New')
    })

    it('upsert() 应该更新已存在记录', async () => {
      await adapter.upsert({ id: '1', title: 'Original', url: 'o.jpg' })
      await adapter.upsert({ id: '1', title: 'Updated', url: 'o.jpg' })
      
      const found = await adapter.findOne('1')
      expect(found?.title).toBe('Updated')
    })

    it('remove() 应该删除记录', async () => {
      await adapter.upsert({ id: '1', title: 'To Delete', url: 'd.jpg' })
      await adapter.remove('1')
      
      const found = await adapter.findOne('1')
      expect(found).toBeUndefined()
    })

    it('clear() 应该清空所有记录', async () => {
      await adapter.upsert({ id: '1', title: 'P1', url: '1.jpg' })
      await adapter.upsert({ id: '2', title: 'P2', url: '2.jpg' })
      
      await adapter.clear()
      
      const all = await adapter.findAll()
      expect(all).toHaveLength(0)
    })
  })

  describe('Batch Operations', () => {
    it('bulkUpsert() 应该批量操作在单事务内', async () => {
      const photos = Array.from({ length: 100 }, (_, i) => ({
        id: `photo-${i}`,
        title: `Photo ${i}`,
        url: `${i}.jpg`,
      }))

      await adapter.bulkUpsert(photos)
      const all = await adapter.findAll()
      expect(all).toHaveLength(100)
    })

    it('bulkUpsert() 应该支持更新已存在记录', async () => {
      await adapter.upsert({ id: '1', title: 'Original', url: 'o.jpg' })
      
      await adapter.bulkUpsert([
        { id: '1', title: 'Updated', url: 'o.jpg' },
        { id: '2', title: 'New', url: 'n.jpg' },
      ])
      
      const all = await adapter.findAll()
      expect(all).toHaveLength(2)
      expect(all.find(p => p.id === '1')?.title).toBe('Updated')
    })
  })
})