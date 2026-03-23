/**
 * SkillService 单元测试
 *
 * 测试覆盖：
 * - 搜索功能
 * - 获取 Skill 详情
 * - 获取热门/最新 Skills
 * - 创建/更新/删除 Skill
 * - 点赞/收藏功能
 * - 用户交互状态
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import type {
  Skill,
  SkillSearchParams,
  CreateSkillRequest,
  UpdateSkillRequest,
} from '@/types/skill'

// Mock Supabase - 使用工厂函数
vi.mock('@/lib/supabase/client', () => ({
  supabase: {
    from: vi.fn(),
    rpc: vi.fn(),
    auth: {
      getUser: vi.fn(),
    },
  },
}))

// Import after mocking
import { supabase } from '@/lib/supabase/client'
import { skillService } from '../skillService'

// ============================================
// 测试数据
// ============================================

const mockUser = {
  id: 'user-1',
  email: 'test@example.com',
}

const mockSkill: Skill = {
  id: 'skill-1',
  author_id: 'user-1',
  name: 'Test Skill',
  slug: 'test-skill',
  description: 'A test skill',
  readme: '# Test',
  visibility: 'public',
  tags: ['test', 'demo'],
  platforms: ['qoder'],
  latest_version: '1.0.0',
  downloads_count: 100,
  likes_count: 10,
  favorites_count: 5,
  created_at: '2024-01-01T00:00:00.000Z',
  updated_at: '2024-01-01T00:00:00.000Z',
  published_at: '2024-01-01T00:00:00.000Z',
}

const mockSkill2: Skill = {
  ...mockSkill,
  id: 'skill-2',
  slug: 'test-skill-2',
  name: 'Test Skill 2',
}

// ============================================
// 辅助函数
// ============================================

// 创建可链式调用的 thenable 对象（模拟 Supabase 查询行为）
function createMockQuery(result: unknown, error: Error | null = null, count: number | null = null) {
  // 基础 thenable - 当 await 时返回结果
  const thenable = {
    then: vi.fn().mockImplementation((resolve) => resolve({ data: result, error, count })),
  }

  // 创建链式查询对象
  const query: Record<string, ReturnType<typeof vi.fn>> = {
    select: vi.fn(),
    eq: vi.fn(),
    neq: vi.fn(),
    order: vi.fn(),
    limit: vi.fn(),
    range: vi.fn(),
    or: vi.fn(),
    contains: vi.fn(),
    in: vi.fn(),
    single: vi.fn().mockResolvedValue({ data: result, error }),
    maybeSingle: vi.fn().mockResolvedValue({ data: result, error }),
    insert: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    ...thenable,
  }

  // 让所有链式方法返回 query 对象本身（支持链式调用）
  const chainableMethods = [
    'select',
    'eq',
    'neq',
    'order',
    'limit',
    'range',
    'or',
    'contains',
    'in',
    'insert',
    'update',
    'delete',
  ]
  chainableMethods.forEach((method) => {
    query[method].mockReturnValue(query)
  })

  return query
}

// ============================================
// 测试套件
// ============================================

describe('skillService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(supabase.auth.getUser).mockResolvedValue({ data: { user: mockUser } } as never)
  })

  describe('getBySlug', () => {
    it('应该通过 slug 获取 Skill', async () => {
      const mockQuery = createMockQuery(mockSkill)
      vi.mocked(supabase.from).mockReturnValue(mockQuery as never)

      const result = await skillService.getBySlug('test-skill')

      expect(supabase.from).toHaveBeenCalledWith('skills')
      expect(result).toEqual(mockSkill)
    })

    it('不存在的 Skill 返回 null', async () => {
      const error = { code: 'PGRST116', message: 'Not found' }
      const mockQuery = createMockQuery(null, error as unknown as Error)
      vi.mocked(supabase.from).mockReturnValue(mockQuery as never)

      const result = await skillService.getBySlug('nonexistent')

      expect(result).toBeNull()
    })
  })

  describe('getById', () => {
    it('应该通过 ID 获取 Skill', async () => {
      const mockQuery = createMockQuery(mockSkill)
      vi.mocked(supabase.from).mockReturnValue(mockQuery as never)

      const result = await skillService.getById('skill-1')

      expect(supabase.from).toHaveBeenCalledWith('skills')
      expect(result).toEqual(mockSkill)
    })

    it('不存在的 ID 返回 null', async () => {
      const error = { code: 'PGRST116', message: 'Not found' }
      const mockQuery = createMockQuery(null, error as unknown as Error)
      vi.mocked(supabase.from).mockReturnValue(mockQuery as never)

      const result = await skillService.getById('nonexistent')

      expect(result).toBeNull()
    })
  })

  describe('search', () => {
    it('应该搜索 Skills', async () => {
      const mockQuery = createMockQuery([mockSkill, mockSkill2], null, 2)
      vi.mocked(supabase.from).mockReturnValue(mockQuery as never)

      const params: SkillSearchParams = {
        query: 'test',
        sort: 'downloads',
        page: 1,
        per_page: 20,
      }

      const result = await skillService.search(params)

      expect(result.results).toHaveLength(2)
      expect(result.total).toBe(2)
      expect(result.page).toBe(1)
    })

    it('空搜索返回空数组', async () => {
      const mockQuery = createMockQuery([], null, 0)
      vi.mocked(supabase.from).mockReturnValue(mockQuery as never)

      const result = await skillService.search({})

      expect(result.results).toEqual([])
      expect(result.total).toBe(0)
    })

    it('应该处理搜索错误', async () => {
      const error = new Error('Search failed')
      const mockQuery = createMockQuery(null, error)
      vi.mocked(supabase.from).mockReturnValue(mockQuery as never)

      await expect(skillService.search({})).rejects.toThrow('Search failed')
    })
  })

  describe('getPopular', () => {
    it('应该获取热门 Skills', async () => {
      const mockQuery = createMockQuery([mockSkill, mockSkill2])
      vi.mocked(supabase.from).mockReturnValue(mockQuery as never)

      const result = await skillService.getPopular(10)

      expect(result).toHaveLength(2)
      expect(supabase.from).toHaveBeenCalledWith('skills')
    })

    it('默认返回 10 个', async () => {
      const mockQuery = createMockQuery([mockSkill])
      vi.mocked(supabase.from).mockReturnValue(mockQuery as never)

      await skillService.getPopular()

      expect(mockQuery.limit).toHaveBeenCalledWith(10)
    })
  })

  describe('getLatest', () => {
    it('应该获取最新 Skills', async () => {
      const mockQuery = createMockQuery([mockSkill2, mockSkill])
      vi.mocked(supabase.from).mockReturnValue(mockQuery as never)

      const result = await skillService.getLatest(5)

      expect(result).toHaveLength(2)
    })
  })

  describe('create', () => {
    it('应该创建 Skill', async () => {
      const mockQuery = createMockQuery(mockSkill)
      vi.mocked(supabase.from).mockReturnValue(mockQuery as never)

      const createData: CreateSkillRequest = {
        name: 'New Skill',
        description: 'A new skill',
        tags: ['test'],
        platforms: ['qoder'],
        visibility: 'public',
        readme: '# New Skill',
      }

      const result = await skillService.create(createData)

      expect(result).toEqual(mockSkill)
      expect(supabase.from).toHaveBeenCalledWith('skills')
    })

    it('未登录应该抛出错误', async () => {
      vi.mocked(supabase.auth.getUser).mockResolvedValue({ data: { user: null } } as never)

      await expect(skillService.create({} as CreateSkillRequest)).rejects.toThrow('Unauthorized')
    })
  })

  describe('update', () => {
    it('应该更新 Skill', async () => {
      const updatedSkill = { ...mockSkill, name: 'Updated Name' }
      const mockQuery = createMockQuery(updatedSkill)
      vi.mocked(supabase.from).mockReturnValue(mockQuery as never)

      const updates: UpdateSkillRequest = {
        name: 'Updated Name',
      }

      const result = await skillService.update('skill-1', updates)

      expect(result.name).toBe('Updated Name')
    })
  })

  describe('delete', () => {
    it('应该删除 Skill', async () => {
      const mockQuery = createMockQuery(null)
      vi.mocked(supabase.from).mockReturnValue(mockQuery as never)

      await skillService.delete('skill-1')

      expect(supabase.from).toHaveBeenCalledWith('skills')
    })
  })

  describe('getUserSkills', () => {
    it('应该获取用户的 Skills', async () => {
      const mockQuery = createMockQuery([mockSkill])
      vi.mocked(supabase.from).mockReturnValue(mockQuery as never)

      const result = await skillService.getUserSkills('user-1')

      expect(result).toHaveLength(1)
      expect(supabase.from).toHaveBeenCalledWith('skills')
    })
  })

  describe('getUserFavorites', () => {
    it('应该获取用户收藏的 Skills', async () => {
      const mockQuery = createMockQuery([{ skill: mockSkill }])
      vi.mocked(supabase.from).mockReturnValue(mockQuery as never)

      const result = await skillService.getUserFavorites('user-1')

      expect(result).toHaveLength(1)
      expect(result[0]).toEqual(mockSkill)
    })
  })

  describe('like', () => {
    it('应该点赞 Skill', async () => {
      const mockQuery = createMockQuery(null)
      vi.mocked(supabase.from).mockReturnValue(mockQuery as never)

      await skillService.like('skill-1')

      expect(supabase.from).toHaveBeenCalledWith('skill_likes')
    })

    it('重复点赞应该忽略错误', async () => {
      const error = { code: '23505', message: 'Duplicate' }
      const mockQuery = createMockQuery(null, error as unknown as Error)
      vi.mocked(supabase.from).mockReturnValue(mockQuery as never)

      await expect(skillService.like('skill-1')).resolves.not.toThrow()
    })

    it('未登录应该抛出错误', async () => {
      vi.mocked(supabase.auth.getUser).mockResolvedValue({ data: { user: null } } as never)

      await expect(skillService.like('skill-1')).rejects.toThrow('Unauthorized')
    })
  })

  describe('unlike', () => {
    it('应该取消点赞', async () => {
      const mockQuery = createMockQuery(null)
      vi.mocked(supabase.from).mockReturnValue(mockQuery as never)

      await skillService.unlike('skill-1')

      expect(supabase.from).toHaveBeenCalledWith('skill_likes')
    })
  })

  describe('isLiked', () => {
    it('应该返回点赞状态', async () => {
      const mockQuery = createMockQuery({ id: 'like-1' })
      vi.mocked(supabase.from).mockReturnValue(mockQuery as never)

      const result = await skillService.isLiked('skill-1')

      expect(result).toBe(true)
    })

    it('未点赞返回 false', async () => {
      const mockQuery = createMockQuery(null)
      vi.mocked(supabase.from).mockReturnValue(mockQuery as never)

      const result = await skillService.isLiked('skill-1')

      expect(result).toBe(false)
    })

    it('未登录返回 false', async () => {
      vi.mocked(supabase.auth.getUser).mockResolvedValue({ data: { user: null } } as never)

      const result = await skillService.isLiked('skill-1')

      expect(result).toBe(false)
    })
  })

  describe('favorite', () => {
    it('应该收藏 Skill', async () => {
      const mockQuery = createMockQuery(null)
      vi.mocked(supabase.from).mockReturnValue(mockQuery as never)

      await skillService.favorite('skill-1')

      expect(supabase.from).toHaveBeenCalledWith('skill_favorites')
    })

    it('重复收藏应该忽略错误', async () => {
      const error = { code: '23505', message: 'Duplicate' }
      const mockQuery = createMockQuery(null, error as unknown as Error)
      vi.mocked(supabase.from).mockReturnValue(mockQuery as never)

      await expect(skillService.favorite('skill-1')).resolves.not.toThrow()
    })
  })

  describe('unfavorite', () => {
    it('应该取消收藏', async () => {
      const mockQuery = createMockQuery(null)
      vi.mocked(supabase.from).mockReturnValue(mockQuery as never)

      await skillService.unfavorite('skill-1')

      expect(supabase.from).toHaveBeenCalledWith('skill_favorites')
    })
  })

  describe('isFavorited', () => {
    it('应该返回收藏状态', async () => {
      const mockQuery = createMockQuery({ id: 'fav-1' })
      vi.mocked(supabase.from).mockReturnValue(mockQuery as never)

      const result = await skillService.isFavorited('skill-1')

      expect(result).toBe(true)
    })

    it('未收藏返回 false', async () => {
      const mockQuery = createMockQuery(null)
      vi.mocked(supabase.from).mockReturnValue(mockQuery as never)

      const result = await skillService.isFavorited('skill-1')

      expect(result).toBe(false)
    })
  })

  describe('getUserInteractions', () => {
    it('应该批量获取用户交互状态', async () => {
      const mockLikesQuery = createMockQuery([{ skill_id: 'skill-1' }])
      const mockFavoritesQuery = createMockQuery([{ skill_id: 'skill-2' }])

      vi.mocked(supabase.from)
        .mockReturnValueOnce(mockLikesQuery as never)
        .mockReturnValueOnce(mockFavoritesQuery as never)

      const result = await skillService.getUserInteractions(['skill-1', 'skill-2'])

      expect(result.likes.has('skill-1')).toBe(true)
      expect(result.favorites.has('skill-2')).toBe(true)
    })

    it('空数组返回空集合', async () => {
      const result = await skillService.getUserInteractions([])

      expect(result.likes.size).toBe(0)
      expect(result.favorites.size).toBe(0)
    })

    it('未登录返回空集合', async () => {
      vi.mocked(supabase.auth.getUser).mockResolvedValue({ data: { user: null } } as never)

      const result = await skillService.getUserInteractions(['skill-1'])

      expect(result.likes.size).toBe(0)
      expect(result.favorites.size).toBe(0)
    })
  })

  describe('getSupportedPlatforms', () => {
    it('应该返回支持的平台列表', () => {
      const platforms = skillService.getSupportedPlatforms()

      expect(platforms).toHaveLength(5)
      expect(platforms[0]).toEqual({ value: 'qoder', label: 'Qoder' })
      expect(platforms[1]).toEqual({ value: 'cursor', label: 'Cursor' })
    })
  })

  describe('getUserProfile', () => {
    it('应该获取用户资料', async () => {
      const profile = { id: 'user-1', full_name: 'Test User', avatar_url: null }
      const mockQuery = createMockQuery(profile)
      vi.mocked(supabase.from).mockReturnValue(mockQuery as never)

      const result = await skillService.getUserProfile('user-1')

      expect(result).toEqual(profile)
    })

    it('不存在的用户返回 null', async () => {
      const mockQuery = createMockQuery(null)
      vi.mocked(supabase.from).mockReturnValue(mockQuery as never)

      const result = await skillService.getUserProfile('nonexistent')

      expect(result).toBeNull()
    })
  })
})
