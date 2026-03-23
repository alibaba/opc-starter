/**
 * personDB 单元测试
 * 测试 Person 本地数据库操作层
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/config/constants', () => ({
  DB_CONFIG: {
    NAME: 'test-db',
    VERSION: 1,
    STORES: { PERSONS: 'persons' },
  },
}))

const mockAdd = vi.fn()
const mockPut = vi.fn()
const mockGet = vi.fn()
const mockGetAll = vi.fn()
const mockDelete = vi.fn()
const mockClear = vi.fn()
const mockTransaction = vi.fn()

const mockDBInstance = {
  add: (...args: unknown[]) => mockAdd(...args),
  put: (...args: unknown[]) => mockPut(...args),
  get: (...args: unknown[]) => mockGet(...args),
  getAll: (...args: unknown[]) => mockGetAll(...args),
  delete: (...args: unknown[]) => mockDelete(...args),
  clear: (...args: unknown[]) => mockClear(...args),
  transaction: (...args: unknown[]) => mockTransaction(...args),
}

vi.mock('../index', () => ({
  getDB: vi.fn().mockResolvedValue(null),
  initDB: vi.fn().mockResolvedValue(null),
}))

import { getDB } from '../index'
import { personDB } from '../personDB'

const mockPerson = {
  id: 'p1',
  name: 'Test User',
  avatar: '',
  department: 'Engineering',
  joinedAt: new Date(),
  photoCount: 0,
  tags: [],
}

describe('personDB', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(getDB).mockResolvedValue(mockDBInstance as never)
  })

  describe('init', () => {
    it('should initialize database', async () => {
      await personDB.init()
      // Should not throw
    })
  })

  describe('addPersons', () => {
    it('should add multiple persons in a transaction', async () => {
      const mockTxStore = { put: vi.fn().mockResolvedValue(undefined) }
      const mockTxDone = Promise.resolve()
      mockTransaction.mockReturnValue({
        store: mockTxStore,
        done: mockTxDone,
      })

      const persons = [mockPerson, { ...mockPerson, id: 'p2', name: 'User 2' }]
      await personDB.addPersons(persons)

      expect(mockTransaction).toHaveBeenCalledWith('persons', 'readwrite')
      expect(mockTxStore.put).toHaveBeenCalledTimes(2)
    })
  })

  describe('add', () => {
    it('should add a single person', async () => {
      mockAdd.mockResolvedValue(undefined)

      await personDB.add(mockPerson)

      expect(mockAdd).toHaveBeenCalledWith('persons', mockPerson)
    })

    it('should fallback to put on duplicate key', async () => {
      mockAdd.mockRejectedValue(new Error('Key already exists in store'))
      mockPut.mockResolvedValue(undefined)

      await personDB.add(mockPerson)

      expect(mockPut).toHaveBeenCalledWith('persons', mockPerson)
    })

    it('should throw on non-duplicate errors', async () => {
      mockAdd.mockRejectedValue(new Error('Some other error'))

      await expect(personDB.add(mockPerson)).rejects.toThrow('Some other error')
    })
  })

  describe('getPersons / getAll', () => {
    it('should return all persons', async () => {
      mockGetAll.mockResolvedValue([mockPerson])

      const result = await personDB.getPersons()

      expect(result).toEqual([mockPerson])
      expect(mockGetAll).toHaveBeenCalledWith('persons')
    })

    it('getAll should be alias for getPersons', async () => {
      mockGetAll.mockResolvedValue([mockPerson])

      const result = await personDB.getAll()

      expect(result).toEqual([mockPerson])
    })
  })

  describe('getPerson / get', () => {
    it('should return person by id', async () => {
      mockGet.mockResolvedValue(mockPerson)

      const result = await personDB.getPerson('p1')

      expect(result).toEqual(mockPerson)
      expect(mockGet).toHaveBeenCalledWith('persons', 'p1')
    })

    it('should return undefined when not found', async () => {
      mockGet.mockResolvedValue(undefined)

      const result = await personDB.getPerson('nonexistent')

      expect(result).toBeUndefined()
    })

    it('get should be alias for getPerson', async () => {
      mockGet.mockResolvedValue(mockPerson)

      const result = await personDB.get('p1')

      expect(result).toEqual(mockPerson)
    })
  })

  describe('getPersonsByDepartment', () => {
    it('should return persons by department', async () => {
      const mockIndex = { getAll: vi.fn().mockResolvedValue([mockPerson]) }
      const mockObjectStore = { index: vi.fn().mockReturnValue(mockIndex) }
      mockTransaction.mockReturnValue({
        objectStore: vi.fn().mockReturnValue(mockObjectStore),
      })

      const result = await personDB.getPersonsByDepartment('Engineering')

      expect(result).toEqual([mockPerson])
      expect(mockObjectStore.index).toHaveBeenCalledWith('by-department')
      expect(mockIndex.getAll).toHaveBeenCalledWith('Engineering')
    })
  })

  describe('updatePerson', () => {
    it('should update existing person', async () => {
      mockGet.mockResolvedValue(mockPerson)
      mockPut.mockResolvedValue(undefined)

      await personDB.updatePerson('p1', { name: 'Updated Name' })

      expect(mockPut).toHaveBeenCalledWith('persons', {
        ...mockPerson,
        name: 'Updated Name',
      })
    })

    it('should throw when person not found', async () => {
      mockGet.mockResolvedValue(undefined)

      await expect(personDB.updatePerson('nonexistent', { name: 'New' })).rejects.toThrow(
        'Person not found'
      )
    })
  })

  describe('deletePerson', () => {
    it('should delete person by id', async () => {
      mockDelete.mockResolvedValue(undefined)

      await personDB.deletePerson('p1')

      expect(mockDelete).toHaveBeenCalledWith('persons', 'p1')
    })
  })

  describe('clear', () => {
    it('should clear all persons', async () => {
      mockClear.mockResolvedValue(undefined)

      await personDB.clear()

      expect(mockClear).toHaveBeenCalledWith('persons')
    })
  })
})
