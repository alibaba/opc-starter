/**
 * useSkillStore 单元测试
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { Skill } from '@/types/skill'

// Mock skillService - 工厂函数内部定义
vi.mock('@/services/skill', () => ({
  skillService: {
    search: vi.fn(),
    getPopular: vi.fn(),
    getLatest: vi.fn(),
    getBySlug: vi.fn(),
    getUserSkills: vi.fn(),
    getUserFavorites: vi.fn(),
    getUserInteractions: vi.fn(),
    like: vi.fn(),
    unlike: vi.fn(),
    favorite: vi.fn(),
    unfavorite: vi.fn(),
  },
}))

vi.mock('@/lib/supabase/client', () => ({
  supabase: {
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-1' } } }),
    },
  },
}))

// import 后通过 vi.mocked 获取 mock 引用
import { skillService } from '@/services/skill'
import { useSkillStore } from '../useSkillStore'

const mockedSkillService = vi.mocked(skillService)

// 测试数据
const mockSkills: Skill[] = [
  {
    id: 'skill-1',
    slug: 'test-skill-1',
    name: 'Test Skill 1',
    description: 'A test skill',
    author_id: 'user-1',
    readme: '# Test Skill 1',
    visibility: 'public',
    tags: ['test'],
    platforms: ['qoder'],
    latest_version: '1.0.0',
    downloads_count: 100,
    likes_count: 10,
    favorites_count: 5,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    published_at: '2024-01-01T00:00:00Z',
    is_liked: false,
    is_favorited: false,
  },
  {
    id: 'skill-2',
    slug: 'test-skill-2',
    name: 'Test Skill 2',
    description: 'Another test skill',
    author_id: 'user-2',
    readme: '# Test Skill 2',
    visibility: 'public',
    tags: ['test'],
    platforms: ['qoder'],
    latest_version: '1.0.0',
    downloads_count: 50,
    likes_count: 5,
    favorites_count: 2,
    created_at: '2024-01-02T00:00:00Z',
    updated_at: '2024-01-02T00:00:00Z',
    published_at: '2024-01-02T00:00:00Z',
    is_liked: true,
    is_favorited: true,
  },
]

const mockSearchResult = { results: mockSkills, total: 2, page: 1, per_page: 20 }

describe('useSkillStore', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    const store = useSkillStore.getState()
    store.setError(null)
    store.clearSearch()
    store.clearCurrentSkill()
  })

  describe('错误处理', () => {
    it('应该设置错误', () => {
      useSkillStore.getState().setError('Something went wrong')
      expect(useSkillStore.getState().error).toBe('Something went wrong')
    })

    it('应该清除错误', () => {
      useSkillStore.getState().setError('Error')
      useSkillStore.getState().clearError()
      expect(useSkillStore.getState().error).toBeNull()
    })
  })

  describe('搜索功能', () => {
    it('应该设置搜索参数', () => {
      useSkillStore.getState().setSearchParams({ query: 'test', sort: 'likes' })
      const params = useSkillStore.getState().searchParams
      expect(params.query).toBe('test')
      expect(params.sort).toBe('likes')
      expect(params.page).toBe(1)
    })

    it('应该执行搜索', async () => {
      mockedSkillService.search.mockResolvedValue(mockSearchResult)
      await useSkillStore.getState().search()

      expect(mockedSkillService.search).toHaveBeenCalled()
      expect(useSkillStore.getState().searchResults).toEqual(mockSkills)
      expect(useSkillStore.getState().searchTotal).toBe(2)
      expect(useSkillStore.getState().isSearching).toBe(false)
    })

    it('应该处理搜索错误', async () => {
      mockedSkillService.search.mockRejectedValue(new Error('Search failed'))
      await useSkillStore.getState().search()

      expect(useSkillStore.getState().error).toBe('Search failed')
      expect(useSkillStore.getState().searchResults).toHaveLength(0)
      expect(useSkillStore.getState().isSearching).toBe(false)
    })

    it('应该加载更多', async () => {
      mockedSkillService.search.mockResolvedValueOnce(mockSearchResult)
      await useSkillStore.getState().search()

      const moreSkills = [{ ...mockSkills[0], id: 'skill-3' }]
      mockedSkillService.search.mockResolvedValueOnce({
        results: moreSkills,
        total: 3,
        page: 2,
        per_page: 20,
      })
      await useSkillStore.getState().loadMore()

      expect(useSkillStore.getState().searchResults).toHaveLength(3)
      expect(useSkillStore.getState().searchParams.page).toBe(2)
    })
  })

  describe('首页数据', () => {
    it('应该加载热门技能', async () => {
      mockedSkillService.getPopular.mockResolvedValue([mockSkills[0]])
      await useSkillStore.getState().loadPopular()

      expect(useSkillStore.getState().popularSkills).toHaveLength(1)
      expect(useSkillStore.getState().isLoadingPopular).toBe(false)
    })

    it('应该处理热门技能加载错误', async () => {
      mockedSkillService.getPopular.mockRejectedValue(new Error('Failed'))
      await useSkillStore.getState().loadPopular()

      expect(useSkillStore.getState().error).toBe('Failed')
      expect(useSkillStore.getState().isLoadingPopular).toBe(false)
    })

    it('应该加载最新技能', async () => {
      mockedSkillService.getLatest.mockResolvedValue([mockSkills[1]])
      await useSkillStore.getState().loadLatest()

      expect(useSkillStore.getState().latestSkills).toHaveLength(1)
      expect(useSkillStore.getState().isLoadingLatest).toBe(false)
    })

    it('应该处理最新技能加载错误', async () => {
      mockedSkillService.getLatest.mockRejectedValue(new Error('Failed'))
      await useSkillStore.getState().loadLatest()

      expect(useSkillStore.getState().error).toBe('Failed')
      expect(useSkillStore.getState().isLoadingLatest).toBe(false)
    })
  })

  describe('技能详情', () => {
    it('应该加载技能详情', async () => {
      mockedSkillService.getBySlug.mockResolvedValue(mockSkills[0])
      mockedSkillService.getUserInteractions.mockResolvedValue({
        likes: new Set<string>(),
        favorites: new Set<string>(),
      })
      await useSkillStore.getState().loadSkill('test-skill-1')

      expect(useSkillStore.getState().currentSkill).toBeTruthy()
      expect(useSkillStore.getState().isLoadingSkill).toBe(false)
    })

    it('应该处理技能详情加载错误', async () => {
      mockedSkillService.getBySlug.mockRejectedValue(new Error('Skill not found'))
      await useSkillStore.getState().loadSkill('non-existent')

      expect(useSkillStore.getState().error).toBe('Skill not found')
      expect(useSkillStore.getState().isLoadingSkill).toBe(false)
    })

    it('应该清除当前技能', () => {
      useSkillStore.getState().clearCurrentSkill()
      expect(useSkillStore.getState().currentSkill).toBeNull()
    })
  })

  describe('用户技能', () => {
    it('应该加载用户技能', async () => {
      mockedSkillService.getUserSkills.mockResolvedValue([mockSkills[0]])
      await useSkillStore.getState().loadUserSkills()

      expect(useSkillStore.getState().userSkills).toHaveLength(1)
      expect(useSkillStore.getState().isLoadingUserSkills).toBe(false)
    })

    it('应该处理用户技能加载错误', async () => {
      mockedSkillService.getUserSkills.mockRejectedValue(new Error('Failed'))
      await useSkillStore.getState().loadUserSkills()

      expect(useSkillStore.getState().error).toBe('Failed')
      expect(useSkillStore.getState().isLoadingUserSkills).toBe(false)
    })

    it('应该加载用户收藏', async () => {
      mockedSkillService.getUserFavorites.mockResolvedValue([mockSkills[1]])
      await useSkillStore.getState().loadUserFavorites()

      expect(useSkillStore.getState().userFavorites).toHaveLength(1)
      expect(useSkillStore.getState().isLoadingUserFavorites).toBe(false)
    })
  })

  describe('互动操作', () => {
    it('应该点赞技能', async () => {
      mockedSkillService.like.mockResolvedValue(undefined)
      await useSkillStore.getState().like('skill-1')
      expect(mockedSkillService.like).toHaveBeenCalledWith('skill-1')
    })

    it('应该取消点赞技能', async () => {
      mockedSkillService.unlike.mockResolvedValue(undefined)
      await useSkillStore.getState().unlike('skill-1')
      expect(mockedSkillService.unlike).toHaveBeenCalledWith('skill-1')
    })

    it('应该收藏技能', async () => {
      mockedSkillService.favorite.mockResolvedValue(undefined)
      await useSkillStore.getState().favorite('skill-1')
      expect(mockedSkillService.favorite).toHaveBeenCalledWith('skill-1')
    })

    it('应该取消收藏技能', async () => {
      mockedSkillService.unfavorite.mockResolvedValue(undefined)
      await useSkillStore.getState().unfavorite('skill-1')
      expect(mockedSkillService.unfavorite).toHaveBeenCalledWith('skill-1')
    })

    it('应该处理互动操作错误', async () => {
      mockedSkillService.like.mockRejectedValue(new Error('Like failed'))
      await useSkillStore.getState().like('skill-1')
      expect(useSkillStore.getState().error).toBe('Like failed')
    })
  })

  describe('搜索清理', () => {
    it('应该清除搜索结果', () => {
      useSkillStore.getState().clearSearch()
      expect(useSkillStore.getState().searchResults).toHaveLength(0)
      expect(useSkillStore.getState().searchTotal).toBe(0)
    })
  })
})
