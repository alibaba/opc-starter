/**
 * useSkillStore 单元测试
 *
 * 测试覆盖：
 * - 初始状态
 * - 搜索功能
 * - 点赞/取消点赞
 * - 收藏/取消收藏
 * - 状态更新
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { act } from '@testing-library/react'

// Mock modules before importing
vi.mock('@/lib/supabase/client', () => ({
  supabase: {
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: { id: 'test-user-id' } },
      }),
    },
  },
}))

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

// Import after mocking
import { useSkillStore } from '@/stores/useSkillStore'
import { skillService } from '@/services/skill'
import type { Skill } from '@/types/skill'

// Get mocked functions
const mockSkillService = vi.mocked(skillService)

// ============================================
// 测试数据
// ============================================

const mockSkill: Skill = {
  id: 'skill-1',
  author_id: 'author-1',
  name: 'Test Skill',
  slug: 'test-skill',
  description: 'A test skill',
  readme: '# Test Skill',
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
  author: {
    id: 'author-1',
    full_name: 'Test Author',
    avatar_url: null,
  },
}

const mockSkill2: Skill = {
  ...mockSkill,
  id: 'skill-2',
  slug: 'test-skill-2',
  name: 'Test Skill 2',
}

// ============================================
// 测试套件
// ============================================

describe('useSkillStore', () => {
  beforeEach(() => {
    // 重置 store 状态
    useSkillStore.setState({
      searchParams: { sort: 'downloads', per_page: 20, page: 1 },
      searchResults: [],
      isSearching: false,
      searchTotal: 0,
      popularSkills: [],
      latestSkills: [],
      isLoadingPopular: false,
      isLoadingLatest: false,
      currentSkill: null,
      isLoadingSkill: false,
      userSkills: [],
      userFavorites: [],
      isLoadingUserSkills: false,
      isLoadingUserFavorites: false,
    })

    // 清除所有 mock
    vi.clearAllMocks()
  })

  describe('初始状态', () => {
    it('应该有正确的初始状态', () => {
      const state = useSkillStore.getState()

      expect(state.searchResults).toEqual([])
      expect(state.isSearching).toBe(false)
      expect(state.searchTotal).toBe(0)
      expect(state.popularSkills).toEqual([])
      expect(state.latestSkills).toEqual([])
      expect(state.currentSkill).toBeNull()
      expect(state.userSkills).toEqual([])
      expect(state.userFavorites).toEqual([])
    })

    it('应该有默认的搜索参数', () => {
      const state = useSkillStore.getState()

      expect(state.searchParams.sort).toBe('downloads')
      expect(state.searchParams.per_page).toBe(20)
      expect(state.searchParams.page).toBe(1)
    })
  })

  describe('setSearchParams', () => {
    it('应该更新搜索参数', () => {
      const { setSearchParams } = useSkillStore.getState()

      act(() => {
        setSearchParams({ query: 'react', sort: 'likes' })
      })

      const state = useSkillStore.getState()
      expect(state.searchParams.query).toBe('react')
      expect(state.searchParams.sort).toBe('likes')
      // page 应该重置为 1
      expect(state.searchParams.page).toBe(1)
    })

    it('应该保留未指定的参数', () => {
      const { setSearchParams } = useSkillStore.getState()

      act(() => {
        setSearchParams({ per_page: 50 })
      })

      const state = useSkillStore.getState()
      expect(state.searchParams.per_page).toBe(50)
      expect(state.searchParams.sort).toBe('downloads')
    })
  })

  describe('search', () => {
    it('应该成功搜索并更新结果', async () => {
      mockSkillService.search.mockResolvedValueOnce({
        results: [mockSkill, mockSkill2],
        total: 2,
        page: 1,
        per_page: 20,
      })

      const { search, setSearchParams } = useSkillStore.getState()

      act(() => {
        setSearchParams({ query: 'test' })
      })

      await act(async () => {
        await search()
      })

      const state = useSkillStore.getState()
      expect(state.searchResults).toHaveLength(2)
      expect(state.searchTotal).toBe(2)
      expect(state.isSearching).toBe(false)
    })

    it('搜索失败时应该设置空结果', async () => {
      mockSkillService.search.mockRejectedValueOnce(new Error('Search failed'))

      const { search } = useSkillStore.getState()

      await act(async () => {
        await search()
      })

      const state = useSkillStore.getState()
      expect(state.searchResults).toEqual([])
      expect(state.searchTotal).toBe(0)
      expect(state.isSearching).toBe(false)
    })

    it('搜索时应该设置 isSearching 状态', async () => {
      let resolveSearch: () => void
      mockSkillService.search.mockImplementation(
        () =>
          new Promise((resolve) => {
            resolveSearch = () =>
              resolve({
                results: [],
                total: 0,
                page: 1,
                per_page: 20,
              })
          })
      )

      const searchPromise = act(async () => {
        await useSkillStore.getState().search()
      })

      // 搜索进行中
      expect(useSkillStore.getState().isSearching).toBe(true)

      // 完成搜索
      resolveSearch!()
      await searchPromise

      expect(useSkillStore.getState().isSearching).toBe(false)
    })
  })

  describe('loadPopular', () => {
    it('应该成功加载热门 Skills', async () => {
      mockSkillService.getPopular.mockResolvedValueOnce([mockSkill, mockSkill2])

      await act(async () => {
        await useSkillStore.getState().loadPopular()
      })

      const state = useSkillStore.getState()
      expect(state.popularSkills).toHaveLength(2)
      expect(state.isLoadingPopular).toBe(false)
    })

    it('加载失败时应该保持空数组', async () => {
      mockSkillService.getPopular.mockRejectedValueOnce(new Error('Load failed'))

      await act(async () => {
        await useSkillStore.getState().loadPopular()
      })

      const state = useSkillStore.getState()
      expect(state.popularSkills).toEqual([])
      expect(state.isLoadingPopular).toBe(false)
    })
  })

  describe('loadLatest', () => {
    it('应该成功加载最新 Skills', async () => {
      mockSkillService.getLatest.mockResolvedValueOnce([mockSkill])

      await act(async () => {
        await useSkillStore.getState().loadLatest()
      })

      const state = useSkillStore.getState()
      expect(state.latestSkills).toHaveLength(1)
    })
  })

  describe('loadSkill', () => {
    it('应该成功加载 Skill 详情', async () => {
      mockSkillService.getBySlug.mockResolvedValueOnce(mockSkill)
      mockSkillService.getUserInteractions.mockResolvedValueOnce({
        likes: new Set(),
        favorites: new Set(),
      })

      await act(async () => {
        await useSkillStore.getState().loadSkill('test-skill')
      })

      const state = useSkillStore.getState()
      expect(state.currentSkill).toEqual(mockSkill)
      expect(state.isLoadingSkill).toBe(false)
    })

    it('Skill 不存在时应该设置为 null', async () => {
      mockSkillService.getBySlug.mockResolvedValueOnce(null)

      await act(async () => {
        await useSkillStore.getState().loadSkill('nonexistent')
      })

      const state = useSkillStore.getState()
      expect(state.currentSkill).toBeNull()
    })

    it('应该获取用户的点赞/收藏状态', async () => {
      mockSkillService.getBySlug.mockResolvedValueOnce(mockSkill)
      mockSkillService.getUserInteractions.mockResolvedValueOnce({
        likes: new Set(['skill-1']),
        favorites: new Set(['skill-1']),
      })

      await act(async () => {
        await useSkillStore.getState().loadSkill('test-skill')
      })

      const state = useSkillStore.getState()
      expect(state.currentSkill?.is_liked).toBe(true)
      expect(state.currentSkill?.is_favorited).toBe(true)
    })
  })

  describe('like/unlike', () => {
    it('应该成功点赞并更新状态', async () => {
      // 设置初始状态
      useSkillStore.setState({
        currentSkill: { ...mockSkill, is_liked: false, likes_count: 10 },
      })

      mockSkillService.like.mockResolvedValueOnce(undefined)

      await act(async () => {
        await useSkillStore.getState().like('skill-1')
      })

      const state = useSkillStore.getState()
      expect(state.currentSkill?.is_liked).toBe(true)
      expect(state.currentSkill?.likes_count).toBe(11)
    })

    it('应该成功取消点赞并更新状态', async () => {
      useSkillStore.setState({
        currentSkill: { ...mockSkill, is_liked: true, likes_count: 10 },
      })

      mockSkillService.unlike.mockResolvedValueOnce(undefined)

      await act(async () => {
        await useSkillStore.getState().unlike('skill-1')
      })

      const state = useSkillStore.getState()
      expect(state.currentSkill?.is_liked).toBe(false)
      expect(state.currentSkill?.likes_count).toBe(9)
    })

    it('点赞数不应该低于 0', async () => {
      useSkillStore.setState({
        currentSkill: { ...mockSkill, is_liked: true, likes_count: 0 },
      })

      mockSkillService.unlike.mockResolvedValueOnce(undefined)

      await act(async () => {
        await useSkillStore.getState().unlike('skill-1')
      })

      const state = useSkillStore.getState()
      expect(state.currentSkill?.likes_count).toBe(0)
    })
  })

  describe('favorite/unfavorite', () => {
    it('应该成功收藏并更新状态', async () => {
      useSkillStore.setState({
        currentSkill: { ...mockSkill, is_favorited: false, favorites_count: 5 },
      })

      mockSkillService.favorite.mockResolvedValueOnce(undefined)

      await act(async () => {
        await useSkillStore.getState().favorite('skill-1')
      })

      const state = useSkillStore.getState()
      expect(state.currentSkill?.is_favorited).toBe(true)
      expect(state.currentSkill?.favorites_count).toBe(6)
    })

    it('取消收藏时应该从收藏列表移除', async () => {
      useSkillStore.setState({
        currentSkill: { ...mockSkill, is_favorited: true, favorites_count: 5 },
        userFavorites: [mockSkill],
      })

      mockSkillService.unfavorite.mockResolvedValueOnce(undefined)

      await act(async () => {
        await useSkillStore.getState().unfavorite('skill-1')
      })

      const state = useSkillStore.getState()
      expect(state.currentSkill?.is_favorited).toBe(false)
      expect(state.userFavorites).toHaveLength(0)
    })
  })

  describe('clearSearch', () => {
    it('应该清除搜索状态', () => {
      useSkillStore.setState({
        searchParams: { query: 'test', sort: 'likes', per_page: 20, page: 2 },
        searchResults: [mockSkill],
        searchTotal: 1,
      })

      act(() => {
        useSkillStore.getState().clearSearch()
      })

      const state = useSkillStore.getState()
      expect(state.searchParams.query).toBeUndefined()
      expect(state.searchResults).toEqual([])
      expect(state.searchTotal).toBe(0)
    })
  })

  describe('clearCurrentSkill', () => {
    it('应该清除当前 Skill', () => {
      useSkillStore.setState({
        currentSkill: mockSkill,
      })

      act(() => {
        useSkillStore.getState().clearCurrentSkill()
      })

      expect(useSkillStore.getState().currentSkill).toBeNull()
    })
  })

  describe('loadMore', () => {
    it('应该加载更多结果并追加', async () => {
      useSkillStore.setState({
        searchParams: { sort: 'downloads', per_page: 20, page: 1 },
        searchResults: [mockSkill],
        searchTotal: 3,
      })

      mockSkillService.search.mockResolvedValueOnce({
        results: [mockSkill2],
        total: 3,
        page: 2,
        per_page: 20,
      })

      await act(async () => {
        await useSkillStore.getState().loadMore()
      })

      const state = useSkillStore.getState()
      expect(state.searchResults).toHaveLength(2)
      expect(state.searchParams.page).toBe(2)
    })
  })
})
