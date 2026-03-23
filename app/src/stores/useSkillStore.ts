/**
 * Skill Store - Skills Hub 状态管理
 * 使用 Zustand
 */

import { create } from 'zustand'
import { skillService } from '@/services/skill'
import type { Skill, SkillSearchParams } from '@/types/skill'

interface SkillState {
  // 错误状态
  error: string | null

  // 搜索状态
  searchParams: SkillSearchParams
  searchResults: Skill[]
  isSearching: boolean
  searchTotal: number

  // 首页数据
  popularSkills: Skill[]
  latestSkills: Skill[]
  isLoadingPopular: boolean
  isLoadingLatest: boolean

  // 当前 Skill
  currentSkill: Skill | null
  isLoadingSkill: boolean

  // 用户数据
  userSkills: Skill[]
  userFavorites: Skill[]
  isLoadingUserSkills: boolean
  isLoadingUserFavorites: boolean

  // Actions
  setError: (error: string | null) => void
  clearError: () => void
  setSearchParams: (params: Partial<SkillSearchParams>) => void
  search: () => Promise<void>
  loadMore: () => Promise<void>
  loadPopular: () => Promise<void>
  loadLatest: () => Promise<void>
  loadSkill: (slug: string) => Promise<void>
  loadUserSkills: () => Promise<void>
  loadUserFavorites: () => Promise<void>
  like: (skillId: string) => Promise<void>
  unlike: (skillId: string) => Promise<void>
  favorite: (skillId: string) => Promise<void>
  unfavorite: (skillId: string) => Promise<void>
  clearSearch: () => void
  clearCurrentSkill: () => void
}

export const useSkillStore = create<SkillState>((set, get) => ({
  // 初始状态
  error: null,

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

  // Error Actions
  setError: (error) => set({ error }),
  clearError: () => set({ error: null }),

  // Actions
  setSearchParams: (params) => {
    set((state) => ({
      searchParams: { ...state.searchParams, ...params, page: 1 },
    }))
  },

  search: async () => {
    const { searchParams } = get()
    set({ isSearching: true, error: null })

    try {
      const result = await skillService.search(searchParams)
      set({
        searchResults: result.results,
        searchTotal: result.total,
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : '搜索失败，请重试'
      console.error('Search failed:', error)
      set({ searchResults: [], searchTotal: 0, error: message })
    } finally {
      set({ isSearching: false })
    }
  },

  loadMore: async () => {
    const { searchParams, searchResults } = get()
    const nextPage = (searchParams.page || 1) + 1

    set({ isSearching: true, error: null })

    try {
      const result = await skillService.search({
        ...searchParams,
        page: nextPage,
      })
      set({
        searchResults: [...searchResults, ...result.results],
        searchParams: { ...searchParams, page: nextPage },
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : '加载更多失败，请重试'
      console.error('Load more failed:', error)
      set({ error: message })
    } finally {
      set({ isSearching: false })
    }
  },

  loadPopular: async () => {
    set({ isLoadingPopular: true, error: null })
    try {
      const skills = await skillService.getPopular(10)
      set({ popularSkills: skills })
    } catch (error) {
      const message = error instanceof Error ? error.message : '加载热门 Skill 失败'
      console.error('Load popular failed:', error)
      set({ error: message })
    } finally {
      set({ isLoadingPopular: false })
    }
  },

  loadLatest: async () => {
    set({ isLoadingLatest: true, error: null })
    try {
      const skills = await skillService.getLatest(10)
      set({ latestSkills: skills })
    } catch (error) {
      const message = error instanceof Error ? error.message : '加载最新 Skill 失败'
      console.error('Load latest failed:', error)
      set({ error: message })
    } finally {
      set({ isLoadingLatest: false })
    }
  },

  loadSkill: async (slug: string) => {
    set({ isLoadingSkill: true, currentSkill: null, error: null })
    try {
      const skill = await skillService.getBySlug(slug)
      if (skill) {
        // 获取当前用户的点赞/收藏状态
        const { likes, favorites } = await skillService.getUserInteractions([skill.id])
        skill.is_liked = likes.has(skill.id)
        skill.is_favorited = favorites.has(skill.id)
      }
      set({ currentSkill: skill })
    } catch (error) {
      const message = error instanceof Error ? error.message : '加载 Skill 详情失败'
      console.error('Load skill failed:', error)
      set({ error: message })
    } finally {
      set({ isLoadingSkill: false })
    }
  },

  loadUserSkills: async () => {
    set({ isLoadingUserSkills: true, error: null })
    try {
      const { supabase } = await import('@/lib/supabase/client')
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (user) {
        const skills = await skillService.getUserSkills(user.id)
        set({ userSkills: skills })
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : '加载我的 Skill 失败'
      console.error('Load user skills failed:', error)
      set({ error: message })
    } finally {
      set({ isLoadingUserSkills: false })
    }
  },

  loadUserFavorites: async () => {
    set({ isLoadingUserFavorites: true, error: null })
    try {
      const { supabase } = await import('@/lib/supabase/client')
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (user) {
        const skills = await skillService.getUserFavorites(user.id)
        set({ userFavorites: skills })
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : '加载收藏失败'
      console.error('Load user favorites failed:', error)
      set({ error: message })
    } finally {
      set({ isLoadingUserFavorites: false })
    }
  },

  like: async (skillId: string) => {
    try {
      await skillService.like(skillId)
      const { currentSkill, searchResults } = get()

      // 更新当前 Skill
      if (currentSkill?.id === skillId) {
        set({
          currentSkill: {
            ...currentSkill,
            is_liked: true,
            likes_count: currentSkill.likes_count + 1,
          },
        })
      }

      // 更新搜索结果
      set({
        searchResults: searchResults.map((s) =>
          s.id === skillId ? { ...s, is_liked: true, likes_count: s.likes_count + 1 } : s
        ),
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : '点赞失败，请重试'
      console.error('Like failed:', error)
      set({ error: message })
    }
  },

  unlike: async (skillId: string) => {
    try {
      await skillService.unlike(skillId)
      const { currentSkill, searchResults } = get()

      if (currentSkill?.id === skillId) {
        set({
          currentSkill: {
            ...currentSkill,
            is_liked: false,
            likes_count: Math.max(0, currentSkill.likes_count - 1),
          },
        })
      }

      set({
        searchResults: searchResults.map((s) =>
          s.id === skillId
            ? {
                ...s,
                is_liked: false,
                likes_count: Math.max(0, s.likes_count - 1),
              }
            : s
        ),
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : '取消点赞失败，请重试'
      console.error('Unlike failed:', error)
      set({ error: message })
    }
  },

  favorite: async (skillId: string) => {
    try {
      await skillService.favorite(skillId)
      const { currentSkill, searchResults } = get()

      if (currentSkill?.id === skillId) {
        set({
          currentSkill: {
            ...currentSkill,
            is_favorited: true,
            favorites_count: currentSkill.favorites_count + 1,
          },
        })
      }

      set({
        searchResults: searchResults.map((s) =>
          s.id === skillId
            ? { ...s, is_favorited: true, favorites_count: s.favorites_count + 1 }
            : s
        ),
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : '收藏失败，请重试'
      console.error('Favorite failed:', error)
      set({ error: message })
    }
  },

  unfavorite: async (skillId: string) => {
    try {
      await skillService.unfavorite(skillId)
      const { currentSkill, searchResults, userFavorites } = get()

      if (currentSkill?.id === skillId) {
        set({
          currentSkill: {
            ...currentSkill,
            is_favorited: false,
            favorites_count: Math.max(0, currentSkill.favorites_count - 1),
          },
        })
      }

      set({
        searchResults: searchResults.map((s) =>
          s.id === skillId
            ? {
                ...s,
                is_favorited: false,
                favorites_count: Math.max(0, s.favorites_count - 1),
              }
            : s
        ),
        // 从收藏列表中移除
        userFavorites: userFavorites.filter((s) => s.id !== skillId),
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : '取消收藏失败，请重试'
      console.error('Unfavorite failed:', error)
      set({ error: message })
    }
  },

  clearSearch: () => {
    set({
      searchParams: { sort: 'downloads', per_page: 20, page: 1 },
      searchResults: [],
      searchTotal: 0,
    })
  },

  clearCurrentSkill: () => {
    set({ currentSkill: null })
  },
}))
