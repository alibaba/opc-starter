/**
 * sessionStorage 单元测试
 * 测试会话存储功能
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/config/project', () => ({
  getDbName: vi.fn((name: string) => `test-${name}`),
}))

vi.mock('../contextCompressor', () => ({
  compressIfNeeded: vi.fn((messages: unknown[]) => messages),
}))

// Mock idb - define inside factory to avoid hoisting issues
const mockGet = vi.fn()
const mockPut = vi.fn()
const mockDelete = vi.fn()
const mockGetAllFromIndex = vi.fn()

vi.mock('idb', () => ({
  openDB: vi.fn().mockResolvedValue({
    get: (...args: unknown[]) => mockGet(...args),
    put: (...args: unknown[]) => mockPut(...args),
    delete: (...args: unknown[]) => mockDelete(...args),
    getAllFromIndex: (...args: unknown[]) => mockGetAllFromIndex(...args),
  }),
}))

import {
  createSession,
  getSession,
  saveSessionMessages,
  getUserSessions,
  deleteSession,
  cleanupOldSessions,
  clearUserSessions,
} from '../sessionStorage'
import { compressIfNeeded } from '../contextCompressor'
import type { AgentMessage } from '@/types/agent'

describe('sessionStorage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGet.mockReset()
    mockPut.mockReset()
    mockDelete.mockReset()
    mockGetAllFromIndex.mockReset()
  })

  describe('createSession', () => {
    it('should create a new session with proper structure', async () => {
      mockPut.mockResolvedValue(undefined)

      const session = await createSession('user1')

      expect(session.meta.userId).toBe('user1')
      expect(session.meta.title).toBe('新对话')
      expect(session.meta.messageCount).toBe(0)
      expect(session.meta.isCompressed).toBe(false)
      expect(session.messages).toEqual([])
      expect(session.meta.id).toMatch(/^session_/)
      expect(mockPut).toHaveBeenCalled()
    })
  })

  describe('getSession', () => {
    it('should return session when found', async () => {
      const mockSession = {
        meta: { id: 'session_1', userId: 'user1' },
        messages: [],
      }
      mockGet.mockResolvedValue(mockSession)

      const result = await getSession('session_1')
      expect(result).toEqual(mockSession)
    })

    it('should return null when session not found', async () => {
      mockGet.mockResolvedValue(undefined)

      const result = await getSession('nonexistent')
      expect(result).toBeNull()
    })

    it('should return null on error', async () => {
      mockGet.mockRejectedValue(new Error('DB error'))

      const result = await getSession('session_1')
      expect(result).toBeNull()
    })
  })

  describe('saveSessionMessages', () => {
    const mockMessages: AgentMessage[] = [
      { id: 'msg1', role: 'user', content: 'Hello', timestamp: new Date() },
      { id: 'msg2', role: 'assistant', content: 'Hi there!', timestamp: new Date() },
    ]

    it('should save messages to existing session', async () => {
      const existingSession = {
        meta: {
          id: 'session_1',
          userId: 'user1',
          title: '旧标题',
          messageCount: 0,
          isCompressed: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        messages: [],
      }
      mockGet.mockResolvedValue(existingSession)
      mockPut.mockResolvedValue(undefined)

      await saveSessionMessages('session_1', mockMessages)

      expect(mockPut).toHaveBeenCalled()
      const savedSession = mockPut.mock.calls[0][1]
      expect(savedSession.messages).toEqual(mockMessages)
      expect(savedSession.meta.messageCount).toBe(2)
    })

    it('should update title from first user message', async () => {
      const existingSession = {
        meta: {
          id: 'session_1',
          userId: 'user1',
          title: '',
          messageCount: 0,
          isCompressed: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        messages: [],
      }
      mockGet.mockResolvedValue(existingSession)
      mockPut.mockResolvedValue(undefined)

      await saveSessionMessages('session_1', mockMessages)

      const savedSession = mockPut.mock.calls[0][1]
      expect(savedSession.meta.title).toBe('Hello')
    })

    it('should truncate long titles', async () => {
      const longMessages: AgentMessage[] = [
        {
          id: 'msg1',
          role: 'user',
          content: 'This is a very long message that exceeds the 30 character limit for titles',
          timestamp: new Date(),
        },
      ]
      const existingSession = {
        meta: {
          id: 'session_1',
          userId: 'user1',
          title: '',
          messageCount: 0,
          isCompressed: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        messages: [],
      }
      mockGet.mockResolvedValue(existingSession)
      mockPut.mockResolvedValue(undefined)

      await saveSessionMessages('session_1', longMessages)

      const savedSession = mockPut.mock.calls[0][1]
      expect(savedSession.meta.title.length).toBeLessThanOrEqual(33) // 30 + '...'
      expect(savedSession.meta.title).toContain('...')
    })

    it('should use date as title when no user message', async () => {
      const assistantOnly: AgentMessage[] = [
        { id: 'msg1', role: 'assistant', content: 'Hello!', timestamp: new Date() },
      ]
      const existingSession = {
        meta: {
          id: 'session_1',
          userId: 'user1',
          title: '',
          messageCount: 0,
          isCompressed: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        messages: [],
      }
      mockGet.mockResolvedValue(existingSession)
      mockPut.mockResolvedValue(undefined)

      await saveSessionMessages('session_1', assistantOnly)

      const savedSession = mockPut.mock.calls[0][1]
      expect(savedSession.meta.title).toContain('对话')
    })

    it('should auto-compress when enabled', async () => {
      const compressedMessages = [mockMessages[0]] // simulate compression
      vi.mocked(compressIfNeeded).mockReturnValue(compressedMessages as never)

      const existingSession = {
        meta: {
          id: 'session_1',
          userId: 'user1',
          title: '',
          messageCount: 0,
          isCompressed: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        messages: [],
      }
      mockGet.mockResolvedValue(existingSession)
      mockPut.mockResolvedValue(undefined)

      await saveSessionMessages('session_1', mockMessages, { autoCompress: true })

      const savedSession = mockPut.mock.calls[0][1]
      expect(savedSession.meta.isCompressed).toBe(true)
      expect(savedSession.messages).toEqual(compressedMessages)
    })

    it('should skip autoCompress when disabled', async () => {
      const existingSession = {
        meta: {
          id: 'session_1',
          userId: 'user1',
          title: '',
          messageCount: 0,
          isCompressed: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        messages: [],
      }
      mockGet.mockResolvedValue(existingSession)
      mockPut.mockResolvedValue(undefined)

      await saveSessionMessages('session_1', mockMessages, { autoCompress: false })

      expect(compressIfNeeded).not.toHaveBeenCalled()
    })

    it('should warn when session not found', async () => {
      mockGet.mockResolvedValue(undefined)
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

      await saveSessionMessages('nonexistent', mockMessages)

      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('会话不存在'), 'nonexistent')
      expect(mockPut).not.toHaveBeenCalled()
      consoleSpy.mockRestore()
    })

    it('should handle errors gracefully', async () => {
      mockGet.mockRejectedValue(new Error('DB error'))

      await expect(saveSessionMessages('session_1', mockMessages)).resolves.not.toThrow()
    })
  })

  describe('getUserSessions', () => {
    it('should return sorted sessions', async () => {
      const sessions = [
        {
          meta: {
            id: 's1',
            userId: 'user1',
            updatedAt: new Date('2024-01-01'),
          },
        },
        {
          meta: {
            id: 's2',
            userId: 'user1',
            updatedAt: new Date('2024-06-01'),
          },
        },
      ]
      mockGetAllFromIndex.mockResolvedValue(sessions)

      const result = await getUserSessions('user1')

      expect(result).toHaveLength(2)
      expect(result[0].id).toBe('s2') // newer first
    })

    it('should return empty array on error', async () => {
      mockGetAllFromIndex.mockRejectedValue(new Error('DB error'))

      const result = await getUserSessions('user1')
      expect(result).toEqual([])
    })
  })

  describe('deleteSession', () => {
    it('should delete session from DB', async () => {
      mockDelete.mockResolvedValue(undefined)

      await deleteSession('session_1')
      expect(mockDelete).toHaveBeenCalled()
    })

    it('should handle errors gracefully', async () => {
      mockDelete.mockRejectedValue(new Error('DB error'))

      await expect(deleteSession('session_1')).resolves.not.toThrow()
    })
  })

  describe('cleanupOldSessions', () => {
    it('should not delete when under limit', async () => {
      const sessions = Array.from({ length: 5 }, (_, i) => ({
        meta: {
          id: `s${i}`,
          userId: 'user1',
          updatedAt: new Date(Date.now() - i * 1000),
        },
      }))
      mockGetAllFromIndex.mockResolvedValue(sessions)

      const deleted = await cleanupOldSessions('user1')
      expect(deleted).toBe(0)
    })

    it('should delete old sessions when over limit', async () => {
      const sessions = Array.from({ length: 25 }, (_, i) => ({
        meta: {
          id: `s${i}`,
          userId: 'user1',
          updatedAt: new Date(Date.now() - i * 1000),
        },
      }))
      mockGetAllFromIndex.mockResolvedValue(sessions)
      mockDelete.mockResolvedValue(undefined)

      const deleted = await cleanupOldSessions('user1')
      expect(deleted).toBe(5) // 25 - 20 = 5
    })

    it('should handle errors gracefully', async () => {
      mockGetAllFromIndex.mockRejectedValue(new Error('DB error'))

      const deleted = await cleanupOldSessions('user1')
      expect(deleted).toBe(0)
    })
  })

  describe('clearUserSessions', () => {
    it('should delete all user sessions', async () => {
      const sessions = [
        { meta: { id: 's1', userId: 'user1', updatedAt: new Date() } },
        { meta: { id: 's2', userId: 'user1', updatedAt: new Date() } },
      ]
      mockGetAllFromIndex.mockResolvedValue(sessions)
      mockDelete.mockResolvedValue(undefined)

      await clearUserSessions('user1')

      expect(mockDelete).toHaveBeenCalledTimes(2)
    })

    it('should handle errors gracefully', async () => {
      mockGetAllFromIndex.mockRejectedValue(new Error('DB error'))

      await expect(clearUserSessions('user1')).resolves.not.toThrow()
    })
  })
})
