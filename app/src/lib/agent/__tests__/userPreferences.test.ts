/**
 * userPreferences 单元测试
 * 测试纯函数逻辑（buildActionKey, findMostFrequent, analyzePatterns, updateLearnedPreference）
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock idb
vi.mock('idb', () => ({
  openDB: vi.fn().mockResolvedValue({
    get: vi.fn().mockResolvedValue(null),
    put: vi.fn().mockResolvedValue(undefined),
    delete: vi.fn().mockResolvedValue(undefined),
  }),
}))

vi.mock('@/config/project', () => ({
  getDbName: vi.fn((name: string) => `test-${name}`),
}))

// We need to test internal pure functions. Import the module and test via autoLearnFromToolResult.
import {
  autoLearnFromToolResult,
  loadPreference,
  savePreference,
  getPreferenceContext,
  clearPreference,
  type UserPreferenceProfile,
} from '../userPreferences'

// Get the mocked openDB to control DB behavior
import { openDB } from 'idb'

const mockDB = {
  get: vi.fn(),
  put: vi.fn(),
  delete: vi.fn(),
}

describe('userPreferences', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(openDB).mockResolvedValue(mockDB as never)
  })

  describe('loadPreference', () => {
    it('should return profile when found', async () => {
      const profile: UserPreferenceProfile = {
        userId: 'user1',
        editing: {},
        interaction: { verbosity: 'concise', confirmBeforeSave: true },
        learned: [],
        actionStats: {},
        updatedAt: new Date(),
        createdAt: new Date(),
      }
      mockDB.get.mockResolvedValue(profile)

      const result = await loadPreference('user1')
      expect(result).toEqual(profile)
    })

    it('should return null when not found', async () => {
      mockDB.get.mockResolvedValue(undefined)

      const result = await loadPreference('nonexistent')
      expect(result).toBeNull()
    })

    it('should return null on error', async () => {
      mockDB.get.mockRejectedValue(new Error('DB error'))

      const result = await loadPreference('user1')
      expect(result).toBeNull()
    })
  })

  describe('savePreference', () => {
    it('should save profile to DB', async () => {
      const profile: UserPreferenceProfile = {
        userId: 'user1',
        editing: {},
        interaction: { verbosity: 'concise', confirmBeforeSave: true },
        learned: [],
        actionStats: {},
        updatedAt: new Date(),
        createdAt: new Date(),
      }
      mockDB.put.mockResolvedValue(undefined)

      await savePreference('user1', profile)
      expect(mockDB.put).toHaveBeenCalled()
    })

    it('should handle save errors', async () => {
      mockDB.put.mockRejectedValue(new Error('Write error'))
      const profile: UserPreferenceProfile = {
        userId: 'user1',
        editing: {},
        interaction: { verbosity: 'concise', confirmBeforeSave: true },
        learned: [],
        actionStats: {},
        updatedAt: new Date(),
        createdAt: new Date(),
      }

      // Should not throw
      await expect(savePreference('user1', profile)).resolves.not.toThrow()
    })
  })

  describe('autoLearnFromToolResult', () => {
    it('should skip non-learnable tools', async () => {
      await autoLearnFromToolResult('user1', 'unknownTool', {}, true)
      // Should not access DB
      expect(mockDB.get).not.toHaveBeenCalled()
    })

    it('should skip failed operations', async () => {
      await autoLearnFromToolResult('user1', 'applyFilter', { filter: 'warm' }, false)
      expect(mockDB.get).not.toHaveBeenCalled()
    })

    it('should learn from applyFilter', async () => {
      mockDB.get.mockResolvedValue(null) // No existing profile
      mockDB.put.mockResolvedValue(undefined)

      await autoLearnFromToolResult('user1', 'applyFilter', { filter: 'warm' }, true)

      expect(mockDB.put).toHaveBeenCalled()
      const savedProfile = mockDB.put.mock.calls[0][1] as UserPreferenceProfile
      expect(savedProfile.actionStats['applyFilter:warm']).toBe(1)
    })

    it('should learn from cropPhoto', async () => {
      mockDB.get.mockResolvedValue(null)
      mockDB.put.mockResolvedValue(undefined)

      await autoLearnFromToolResult('user1', 'cropPhoto', { aspectRatio: '16:9' }, true)

      const savedProfile = mockDB.put.mock.calls[0][1] as UserPreferenceProfile
      expect(savedProfile.actionStats['cropPhoto:16:9']).toBe(1)
    })

    it('should learn from adjustImage with brightness', async () => {
      mockDB.get.mockResolvedValue(null)
      mockDB.put.mockResolvedValue(undefined)

      await autoLearnFromToolResult(
        'user1',
        'adjustImage',
        { brightness: 20, contrast: -10, saturation: 5 },
        true
      )

      const savedProfile = mockDB.put.mock.calls[0][1] as UserPreferenceProfile
      expect(savedProfile.actionStats['adjustImage:brighter,less-contrast,more-saturated']).toBe(1)
    })

    it('should learn from adjustImage with darker', async () => {
      mockDB.get.mockResolvedValue(null)
      mockDB.put.mockResolvedValue(undefined)

      await autoLearnFromToolResult('user1', 'adjustImage', { brightness: -10 }, true)

      const savedProfile = mockDB.put.mock.calls[0][1] as UserPreferenceProfile
      expect(savedProfile.actionStats['adjustImage:darker']).toBe(1)
    })

    it('should learn from adjustImage with neutral', async () => {
      mockDB.get.mockResolvedValue(null)
      mockDB.put.mockResolvedValue(undefined)

      await autoLearnFromToolResult('user1', 'adjustImage', {}, true)

      const savedProfile = mockDB.put.mock.calls[0][1] as UserPreferenceProfile
      expect(savedProfile.actionStats['adjustImage:neutral']).toBe(1)
    })

    it('should learn from rotatePhoto', async () => {
      mockDB.get.mockResolvedValue(null)
      mockDB.put.mockResolvedValue(undefined)

      await autoLearnFromToolResult('user1', 'rotatePhoto', { degrees: 90 }, true)

      const savedProfile = mockDB.put.mock.calls[0][1] as UserPreferenceProfile
      expect(savedProfile.actionStats['rotatePhoto:90']).toBe(1)
    })

    it('should learn from generateVideo', async () => {
      mockDB.get.mockResolvedValue(null)
      mockDB.put.mockResolvedValue(undefined)

      await autoLearnFromToolResult('user1', 'generateVideo', { type: 'i2v' }, true)

      const savedProfile = mockDB.put.mock.calls[0][1] as UserPreferenceProfile
      expect(savedProfile.actionStats['generateVideo:i2v']).toBe(1)
    })

    it('should accumulate action counts', async () => {
      const existingProfile: UserPreferenceProfile = {
        userId: 'user1',
        editing: {},
        interaction: { verbosity: 'concise', confirmBeforeSave: true },
        learned: [],
        actionStats: { 'applyFilter:warm': 3 },
        updatedAt: new Date(),
        createdAt: new Date(),
      }
      mockDB.get.mockResolvedValue(existingProfile)
      mockDB.put.mockResolvedValue(undefined)

      await autoLearnFromToolResult('user1', 'applyFilter', { filter: 'warm' }, true)

      const savedProfile = mockDB.put.mock.calls[0][1] as UserPreferenceProfile
      expect(savedProfile.actionStats['applyFilter:warm']).toBe(4)
    })

    it('should detect warm filter preference after many uses', async () => {
      const existingProfile: UserPreferenceProfile = {
        userId: 'user1',
        editing: {},
        interaction: { verbosity: 'concise', confirmBeforeSave: true },
        learned: [],
        actionStats: { 'applyFilter:warm': 5 },
        updatedAt: new Date(),
        createdAt: new Date(),
      }
      mockDB.get.mockResolvedValue(existingProfile)
      mockDB.put.mockResolvedValue(undefined)

      await autoLearnFromToolResult('user1', 'applyFilter', { filter: 'warm' }, true)

      const savedProfile = mockDB.put.mock.calls[0][1] as UserPreferenceProfile
      expect(savedProfile.learned.length).toBeGreaterThan(0)
      expect(savedProfile.learned.some((l) => l.pattern.includes('暖色调'))).toBe(true)
      expect(savedProfile.editing.preferredFilter).toBe('warm')
    })

    it('should detect cool filter preference', async () => {
      const existingProfile: UserPreferenceProfile = {
        userId: 'user1',
        editing: {},
        interaction: { verbosity: 'concise', confirmBeforeSave: true },
        learned: [],
        actionStats: { 'applyFilter:cool': 5 },
        updatedAt: new Date(),
        createdAt: new Date(),
      }
      mockDB.get.mockResolvedValue(existingProfile)
      mockDB.put.mockResolvedValue(undefined)

      await autoLearnFromToolResult('user1', 'applyFilter', { filter: 'cool' }, true)

      const savedProfile = mockDB.put.mock.calls[0][1] as UserPreferenceProfile
      expect(savedProfile.learned.some((l) => l.pattern.includes('冷色调'))).toBe(true)
    })

    it('should detect vintage/film preference', async () => {
      const existingProfile: UserPreferenceProfile = {
        userId: 'user1',
        editing: {},
        interaction: { verbosity: 'concise', confirmBeforeSave: true },
        learned: [],
        actionStats: { 'applyFilter:vintage': 3, 'applyFilter:film': 3 },
        updatedAt: new Date(),
        createdAt: new Date(),
      }
      mockDB.get.mockResolvedValue(existingProfile)
      mockDB.put.mockResolvedValue(undefined)

      await autoLearnFromToolResult('user1', 'applyFilter', { filter: 'vintage' }, true)

      const savedProfile = mockDB.put.mock.calls[0][1] as UserPreferenceProfile
      expect(savedProfile.learned.some((l) => l.pattern.includes('复古'))).toBe(true)
    })

    it('should detect square crop preference', async () => {
      const existingProfile: UserPreferenceProfile = {
        userId: 'user1',
        editing: {},
        interaction: { verbosity: 'concise', confirmBeforeSave: true },
        learned: [],
        actionStats: { 'cropPhoto:1:1': 5 },
        updatedAt: new Date(),
        createdAt: new Date(),
      }
      mockDB.get.mockResolvedValue(existingProfile)
      mockDB.put.mockResolvedValue(undefined)

      await autoLearnFromToolResult('user1', 'cropPhoto', { aspectRatio: '1:1' }, true)

      const savedProfile = mockDB.put.mock.calls[0][1] as UserPreferenceProfile
      expect(savedProfile.learned.some((l) => l.pattern.includes('1:1'))).toBe(true)
      expect(savedProfile.editing.defaultCropRatio).toBe('1:1')
    })

    it('should detect widescreen crop preference', async () => {
      const existingProfile: UserPreferenceProfile = {
        userId: 'user1',
        editing: {},
        interaction: { verbosity: 'concise', confirmBeforeSave: true },
        learned: [],
        actionStats: { 'cropPhoto:16:9': 5 },
        updatedAt: new Date(),
        createdAt: new Date(),
      }
      mockDB.get.mockResolvedValue(existingProfile)
      mockDB.put.mockResolvedValue(undefined)

      await autoLearnFromToolResult('user1', 'cropPhoto', { aspectRatio: '16:9' }, true)

      const savedProfile = mockDB.put.mock.calls[0][1] as UserPreferenceProfile
      expect(savedProfile.learned.some((l) => l.pattern.includes('16:9'))).toBe(true)
    })

    it('should detect brightness preference', async () => {
      const existingProfile: UserPreferenceProfile = {
        userId: 'user1',
        editing: {},
        interaction: { verbosity: 'concise', confirmBeforeSave: true },
        learned: [],
        actionStats: { 'adjustImage:brighter': 5 },
        updatedAt: new Date(),
        createdAt: new Date(),
      }
      mockDB.get.mockResolvedValue(existingProfile)
      mockDB.put.mockResolvedValue(undefined)

      await autoLearnFromToolResult('user1', 'adjustImage', { brightness: 10 }, true)

      const savedProfile = mockDB.put.mock.calls[0][1] as UserPreferenceProfile
      expect(savedProfile.learned.some((l) => l.pattern.includes('明亮'))).toBe(true)
    })

    it('should limit learned preferences to 10', async () => {
      const manyLearned = Array.from({ length: 12 }, (_, i) => ({
        pattern: `pattern_${i}`,
        confidence: i * 0.05,
        observedAt: new Date(),
      }))

      const existingProfile: UserPreferenceProfile = {
        userId: 'user1',
        editing: {},
        interaction: { verbosity: 'concise', confirmBeforeSave: true },
        learned: manyLearned,
        actionStats: { 'applyFilter:warm': 10 },
        updatedAt: new Date(),
        createdAt: new Date(),
      }
      mockDB.get.mockResolvedValue(existingProfile)
      mockDB.put.mockResolvedValue(undefined)

      await autoLearnFromToolResult('user1', 'applyFilter', { filter: 'warm' }, true)

      const savedProfile = mockDB.put.mock.calls[0][1] as UserPreferenceProfile
      expect(savedProfile.learned.length).toBeLessThanOrEqual(10)
    })

    it('should update existing learned preference confidence', async () => {
      const existingProfile: UserPreferenceProfile = {
        userId: 'user1',
        editing: {},
        interaction: { verbosity: 'concise', confirmBeforeSave: true },
        learned: [{ pattern: '用户偏好暖色调滤镜', confidence: 0.3, observedAt: new Date() }],
        actionStats: { 'applyFilter:warm': 8 },
        updatedAt: new Date(),
        createdAt: new Date(),
      }
      mockDB.get.mockResolvedValue(existingProfile)
      mockDB.put.mockResolvedValue(undefined)

      await autoLearnFromToolResult('user1', 'applyFilter', { filter: 'warm' }, true)

      const savedProfile = mockDB.put.mock.calls[0][1] as UserPreferenceProfile
      const warmPref = savedProfile.learned.find((l) => l.pattern.includes('暖色调'))
      expect(warmPref).toBeDefined()
      expect(warmPref!.confidence).toBeGreaterThanOrEqual(0.3)
    })

    it('should handle DB errors gracefully', async () => {
      mockDB.get.mockRejectedValue(new Error('DB error'))

      // Should not throw
      await expect(
        autoLearnFromToolResult('user1', 'applyFilter', { filter: 'warm' }, true)
      ).resolves.not.toThrow()
    })
  })

  describe('getPreferenceContext', () => {
    it('should return empty string when no profile', async () => {
      mockDB.get.mockResolvedValue(null)

      const result = await getPreferenceContext('user1')
      expect(result).toBe('')
    })

    it('should include preferred filter', async () => {
      const profile: UserPreferenceProfile = {
        userId: 'user1',
        editing: { preferredFilter: 'warm' },
        interaction: { verbosity: 'concise', confirmBeforeSave: true },
        learned: [],
        actionStats: {},
        updatedAt: new Date(),
        createdAt: new Date(),
      }
      mockDB.get.mockResolvedValue(profile)

      const result = await getPreferenceContext('user1')
      expect(result).toContain('warm')
    })

    it('should include default crop ratio', async () => {
      const profile: UserPreferenceProfile = {
        userId: 'user1',
        editing: { defaultCropRatio: '16:9' },
        interaction: { verbosity: 'concise', confirmBeforeSave: true },
        learned: [],
        actionStats: {},
        updatedAt: new Date(),
        createdAt: new Date(),
      }
      mockDB.get.mockResolvedValue(profile)

      const result = await getPreferenceContext('user1')
      expect(result).toContain('16:9')
    })

    it('should include high-confidence learned preferences', async () => {
      const profile: UserPreferenceProfile = {
        userId: 'user1',
        editing: {},
        interaction: { verbosity: 'concise', confirmBeforeSave: true },
        learned: [
          { pattern: '用户偏好暖色调滤镜', confidence: 0.9, observedAt: new Date() },
          { pattern: '低置信度偏好', confidence: 0.3, observedAt: new Date() },
        ],
        actionStats: {},
        updatedAt: new Date(),
        createdAt: new Date(),
      }
      mockDB.get.mockResolvedValue(profile)

      const result = await getPreferenceContext('user1')
      expect(result).toContain('暖色调')
      expect(result).not.toContain('低置信度')
    })

    it('should return empty when profile has no preferences', async () => {
      const profile: UserPreferenceProfile = {
        userId: 'user1',
        editing: {},
        interaction: { verbosity: 'concise', confirmBeforeSave: true },
        learned: [],
        actionStats: {},
        updatedAt: new Date(),
        createdAt: new Date(),
      }
      mockDB.get.mockResolvedValue(profile)

      const result = await getPreferenceContext('user1')
      expect(result).toBe('')
    })

    it('should handle errors gracefully', async () => {
      mockDB.get.mockRejectedValue(new Error('DB error'))

      const result = await getPreferenceContext('user1')
      expect(result).toBe('')
    })
  })

  describe('clearPreference', () => {
    it('should delete from DB', async () => {
      mockDB.delete.mockResolvedValue(undefined)

      await clearPreference('user1')
      expect(mockDB.delete).toHaveBeenCalled()
    })

    it('should handle errors gracefully', async () => {
      mockDB.delete.mockRejectedValue(new Error('DB error'))

      await expect(clearPreference('user1')).resolves.not.toThrow()
    })
  })
})
