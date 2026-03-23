/**
 * personAdapter 本地适配器测试
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/services/db/personDB', () => ({
  personDB: {
    getAll: vi.fn(),
    add: vi.fn(),
    addPersons: vi.fn(),
    deletePerson: vi.fn(),
  },
}))

import { personDB } from '@/services/db/personDB'
import { createPersonAdapter } from '../personAdapter'

const mockedDB = vi.mocked(personDB)

const mockPersons = [
  {
    id: 'p-1',
    name: 'Alice',
    avatar: '',
    department: 'Engineering',
    joinedAt: new Date(),
    photoCount: 0,
    tags: ['a'],
  },
  {
    id: 'p-2',
    name: 'Bob',
    avatar: '',
    department: 'Design',
    joinedAt: new Date(),
    photoCount: 0,
    tags: ['b'],
  },
]

describe('personAdapter', () => {
  let adapter: ReturnType<typeof createPersonAdapter>

  beforeEach(() => {
    vi.clearAllMocks()
    adapter = createPersonAdapter()
  })

  describe('findAll', () => {
    it('应该返回所有人物', async () => {
      mockedDB.getAll.mockResolvedValue(mockPersons as never)

      const result = await adapter.findAll()
      expect(result).toHaveLength(2)
      expect(result[0].name).toBe('Alice')
    })
  })

  describe('findOne', () => {
    it('应该按 id 查找人物', async () => {
      mockedDB.getAll.mockResolvedValue(mockPersons as never)

      const result = await adapter.findOne('p-1')
      expect(result?.name).toBe('Alice')
    })

    it('应该返回 undefined 当不存在', async () => {
      mockedDB.getAll.mockResolvedValue(mockPersons as never)

      const result = await adapter.findOne('nonexistent')
      expect(result).toBeUndefined()
    })
  })

  describe('query', () => {
    it('应该返回所有数据（无 filter）', async () => {
      mockedDB.getAll.mockResolvedValue(mockPersons as never)

      const result = await adapter.query({})
      expect(result).toHaveLength(2)
    })

    it('应该使用 filter 过滤数据', async () => {
      mockedDB.getAll.mockResolvedValue(mockPersons as never)

      const result = await adapter.query({
        filter: (p: { department?: string }) => p.department === 'Engineering',
      })
      expect(result).toHaveLength(1)
      expect(result[0].name).toBe('Alice')
    })
  })

  describe('upsert', () => {
    it('应该调用 personDB.add', async () => {
      await adapter.upsert(mockPersons[0] as never)
      expect(mockedDB.add).toHaveBeenCalledWith(mockPersons[0])
    })
  })

  describe('bulkUpsert', () => {
    it('应该调用 personDB.addPersons', async () => {
      await adapter.bulkUpsert(mockPersons as never)
      expect(mockedDB.addPersons).toHaveBeenCalledWith(mockPersons)
    })
  })

  describe('remove', () => {
    it('应该调用 personDB.deletePerson', async () => {
      await adapter.remove('p-1')
      expect(mockedDB.deletePerson).toHaveBeenCalledWith('p-1')
    })
  })

  describe('clear', () => {
    it('应该删除所有人物', async () => {
      mockedDB.getAll.mockResolvedValue(mockPersons as never)

      await adapter.clear()

      expect(mockedDB.deletePerson).toHaveBeenCalledTimes(2)
      expect(mockedDB.deletePerson).toHaveBeenCalledWith('p-1')
      expect(mockedDB.deletePerson).toHaveBeenCalledWith('p-2')
    })
  })
})
