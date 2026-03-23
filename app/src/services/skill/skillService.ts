/**
 * SkillService - Skill CRUD 操作
 * 封装 Supabase 数据库操作
 */

import { supabase } from '@/lib/supabase/client'
import type {
  Skill,
  SkillVersion,
  SkillSearchParams,
  SkillSearchResult,
  CreateSkillRequest,
  UpdateSkillRequest,
  SkillPlatform,
} from '@/types/skill'

/**
 * 转义 LIKE 查询中的特殊字符，防止 SQL 注入
 * PostgREST/ilike 特殊字符: % _ \
 */
function escapeLikePattern(str: string): string {
  return str.replace(/[%_\\]/g, '\\$&')
}

/**
 * 从 Skill 名称生成 slug
 * 规则：小写、空格转连字符、只保留字母数字和连字符、去掉首尾连字符
 */
function generateSlug(name: string): string {
  const base = name
    .toLowerCase()
    .replace(/[\u4e00-\u9fa5]/g, '') // 移除中文字符（可选）
    .replace(/[^a-z0-9\s-]/g, '') // 只保留字母、数字、空格、连字符
    .trim()
    .replace(/\s+/g, '-') // 空格转连字符
    .replace(/-+/g, '-') // 多个连字符合并
    .replace(/^-|-$/g, '') // 去掉首尾连字符
  // 追加随机后缀确保唯一性
  const suffix = Math.random().toString(36).substring(2, 7)
  return base ? `${base}-${suffix}` : `skill-${suffix}`
}

/**
 * 构建搜索查询
 */
function buildSearchQuery(params: SkillSearchParams) {
  let query = supabase
    .from('skills')
    .select(
      '*, author:profiles(id, full_name, avatar_url), versions:skill_versions(id, version, created_at, file_size)',
      { count: 'exact' }
    )
    .eq('visibility', 'public')

  // 关键词搜索（名称、描述、标签）- 使用转义防止注入
  if (params.query) {
    const keyword = escapeLikePattern(params.query.trim())
    query = query.or(`name.ilike.%${keyword}%,description.ilike.%${keyword}%,tags.cs.{${keyword}}`)
  }

  // 标签筛选
  if (params.tags && params.tags.length > 0) {
    query = query.contains('tags', params.tags)
  }

  // 平台筛选
  if (params.platforms && params.platforms.length > 0) {
    query = query.contains('platforms', params.platforms)
  }

  // 作者筛选
  if (params.author_id) {
    query = query.eq('author_id', params.author_id)
  }

  // 排序
  const sort = params.sort || 'downloads'
  switch (sort) {
    case 'downloads':
      query = query.order('downloads_count', { ascending: false })
      break
    case 'likes':
      query = query.order('likes_count', { ascending: false })
      break
    case 'created_at':
      query = query.order('created_at', { ascending: false })
      break
    case 'relevance':
    default:
      query = query.order('downloads_count', { ascending: false })
  }

  // 分页
  const page = params.page || 1
  const perPage = params.per_page || 20
  const from = (page - 1) * perPage
  const to = from + perPage - 1
  query = query.range(from, to)

  return query
}

export const skillService = {
  /**
   * 获取 Skill 详情（通过 slug）
   */
  async getBySlug(slug: string): Promise<Skill | null> {
    const { data, error } = await supabase
      .from('skills')
      .select(
        `*,
        author:profiles(id, full_name, avatar_url),
        versions:skill_versions(id, version, created_at, file_size, changelog)`
      )
      .eq('slug', slug)
      .eq('visibility', 'public')
      .order('created_at', { ascending: false, referencedTable: 'skill_versions' })
      .single()

    if (error) {
      if (error.code === 'PGRST116') return null // 未找到
      throw error
    }

    return data as Skill
  },

  /**
   * 获取 Skill 详情（通过 ID，包含私有）
   */
  async getById(id: string): Promise<Skill | null> {
    const { data, error } = await supabase
      .from('skills')
      .select(
        `*,
        author:profiles(id, full_name, avatar_url),
        versions:skill_versions(id, version, created_at, file_size, changelog)`
      )
      .eq('id', id)
      .order('created_at', { ascending: false, referencedTable: 'skill_versions' })
      .single()

    if (error) {
      if (error.code === 'PGRST116') return null
      throw error
    }

    return data as Skill
  },

  /**
   * 搜索 Skill
   */
  async search(params: SkillSearchParams): Promise<SkillSearchResult> {
    const query = buildSearchQuery(params)
    const { data, error, count } = await query

    if (error) throw error

    return {
      results: (data as Skill[]) || [],
      total: count || 0,
      page: params.page || 1,
      per_page: params.per_page || 20,
    }
  },

  /**
   * 获取热门 Skills
   */
  async getPopular(limit: number = 10): Promise<Skill[]> {
    const { data, error } = await supabase
      .from('skills')
      .select('*, author:profiles(id, full_name, avatar_url)')
      .eq('visibility', 'public')
      .order('downloads_count', { ascending: false })
      .limit(limit)

    if (error) throw error
    return (data as Skill[]) || []
  },

  /**
   * 获取最新 Skills
   */
  async getLatest(limit: number = 10): Promise<Skill[]> {
    const { data, error } = await supabase
      .from('skills')
      .select('*, author:profiles(id, full_name, avatar_url)')
      .eq('visibility', 'public')
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) throw error
    return (data as Skill[]) || []
  },

  /**
   * 创建 Skill
   */
  async create(skill: CreateSkillRequest): Promise<Skill> {
    const { data: userData } = await supabase.auth.getUser()
    if (!userData.user) throw new Error('Unauthorized')

    const { data, error } = await supabase
      .from('skills')
      .insert({
        ...skill,
        author_id: userData.user.id,
        slug: generateSlug(skill.name),
      })
      .select('*, author:profiles(id, full_name, avatar_url)')
      .single()

    if (error) throw error
    return data as Skill
  },

  /**
   * 更新 Skill
   */
  async update(id: string, updates: UpdateSkillRequest): Promise<Skill> {
    const { data, error } = await supabase
      .from('skills')
      .update(updates)
      .eq('id', id)
      .select('*, author:profiles(id, full_name, avatar_url)')
      .single()

    if (error) throw error
    return data as Skill
  },

  /**
   * 删除 Skill
   */
  async delete(id: string): Promise<void> {
    const { error } = await supabase.from('skills').delete().eq('id', id)
    if (error) throw error
  },

  /**
   * 获取用户的 Skills
   */
  async getUserSkills(userId: string): Promise<Skill[]> {
    const { data, error } = await supabase
      .from('skills')
      .select('*, author:profiles(id, full_name, avatar_url)')
      .eq('author_id', userId)
      .order('created_at', { ascending: false })

    if (error) throw error
    return (data as Skill[]) || []
  },

  /**
   * 获取用户收藏的 Skills
   */
  async getUserFavorites(userId: string): Promise<Skill[]> {
    const { data, error } = await supabase
      .from('skill_favorites')
      .select('skill:skills(*, author:profiles(id, full_name, avatar_url))')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (error) throw error
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return data?.map((item: any) => item.skill as Skill) || []
  },

  /**
   * 点赞 Skill
   */
  async like(skillId: string): Promise<void> {
    const { data: userData } = await supabase.auth.getUser()
    if (!userData.user) throw new Error('Unauthorized')

    const { error } = await supabase.from('skill_likes').insert({
      skill_id: skillId,
      user_id: userData.user.id,
    })

    if (error) {
      // 忽略唯一约束冲突（已点赞）
      if (error.code === '23505') return
      throw error
    }
  },

  /**
   * 取消点赞
   */
  async unlike(skillId: string): Promise<void> {
    const { data: userData } = await supabase.auth.getUser()
    if (!userData.user) throw new Error('Unauthorized')

    const { error } = await supabase
      .from('skill_likes')
      .delete()
      .eq('skill_id', skillId)
      .eq('user_id', userData.user.id)

    if (error) throw error
  },

  /**
   * 检查是否已点赞
   */
  async isLiked(skillId: string): Promise<boolean> {
    const { data: userData } = await supabase.auth.getUser()
    if (!userData.user) return false

    const { data, error } = await supabase
      .from('skill_likes')
      .select('id')
      .eq('skill_id', skillId)
      .eq('user_id', userData.user.id)
      .maybeSingle()

    if (error) throw error
    return !!data
  },

  /**
   * 收藏 Skill
   */
  async favorite(skillId: string): Promise<void> {
    const { data: userData } = await supabase.auth.getUser()
    if (!userData.user) throw new Error('Unauthorized')

    const { error } = await supabase.from('skill_favorites').insert({
      skill_id: skillId,
      user_id: userData.user.id,
    })

    if (error) {
      if (error.code === '23505') return
      throw error
    }
  },

  /**
   * 取消收藏
   */
  async unfavorite(skillId: string): Promise<void> {
    const { data: userData } = await supabase.auth.getUser()
    if (!userData.user) throw new Error('Unauthorized')

    const { error } = await supabase
      .from('skill_favorites')
      .delete()
      .eq('skill_id', skillId)
      .eq('user_id', userData.user.id)

    if (error) throw error
  },

  /**
   * 检查是否已收藏
   */
  async isFavorited(skillId: string): Promise<boolean> {
    const { data: userData } = await supabase.auth.getUser()
    if (!userData.user) return false

    const { data, error } = await supabase
      .from('skill_favorites')
      .select('id')
      .eq('skill_id', skillId)
      .eq('user_id', userData.user.id)
      .maybeSingle()

    if (error) throw error
    return !!data
  },

  /**
   * 批量获取当前用户的点赞/收藏状态
   */
  async getUserInteractions(skillIds: string[]): Promise<{
    likes: Set<string>
    favorites: Set<string>
  }> {
    const { data: userData } = await supabase.auth.getUser()
    if (!userData.user || skillIds.length === 0) {
      return { likes: new Set(), favorites: new Set() }
    }

    const [likesResult, favoritesResult] = await Promise.all([
      supabase
        .from('skill_likes')
        .select('skill_id')
        .eq('user_id', userData.user.id)
        .in('skill_id', skillIds),
      supabase
        .from('skill_favorites')
        .select('skill_id')
        .eq('user_id', userData.user.id)
        .in('skill_id', skillIds),
    ])

    return {
      likes: new Set(likesResult.data?.map((item) => item.skill_id) || []),
      favorites: new Set(favoritesResult.data?.map((item) => item.skill_id) || []),
    }
  },

  /**
   * 获取版本详情
   */
  async getVersion(versionId: string): Promise<SkillVersion | null> {
    const { data, error } = await supabase
      .from('skill_versions')
      .select('*')
      .eq('id', versionId)
      .single()

    if (error) {
      if (error.code === 'PGRST116') return null
      throw error
    }

    return data as SkillVersion
  },

  /**
   * 获取 Skill 的所有版本
   */
  async getVersions(skillId: string): Promise<SkillVersion[]> {
    const { data, error } = await supabase
      .from('skill_versions')
      .select('*')
      .eq('skill_id', skillId)
      .order('created_at', { ascending: false })

    if (error) throw error
    return (data as SkillVersion[]) || []
  },

  /**
   * 获取热门标签
   */
  async getPopularTags(limit: number = 20): Promise<string[]> {
    // 使用 RPC 或手动聚合获取热门标签
    const { data, error } = await supabase.rpc('get_popular_tags', {
      limit_count: limit,
    })

    if (error) {
      // 如果 RPC 不存在，返回空数组
      console.warn('get_popular_tags RPC not found:', error.message)
      return []
    }

    return data || []
  },

  /**
   * 获取所有支持的平台
   */
  getSupportedPlatforms(): { value: SkillPlatform; label: string }[] {
    return [
      { value: 'qoder', label: 'Qoder' },
      { value: 'cursor', label: 'Cursor' },
      { value: 'claude', label: 'Claude Code' },
      { value: 'cline', label: 'Cline' },
      { value: 'windsurf', label: 'Windsurf' },
    ]
  },

  /**
   * 获取用户公开资料
   */
  async getUserProfile(
    userId: string
  ): Promise<{ id: string; full_name: string | null; avatar_url: string | null } | null> {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, full_name, avatar_url')
      .eq('id', userId)
      .single()

    if (error || !data) return null
    return data
  },
}
