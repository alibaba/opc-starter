/**
 * Skills Hub 类型定义
 * 对应数据库表: skills, skill_versions, skill_likes, skill_favorites, skill_installs
 */

/** Skill 可见性 */
export type SkillVisibility = 'draft' | 'public' | 'private'

/** 支持的平台 */
export type SkillPlatform = 'qoder' | 'cursor' | 'claude' | 'cline' | 'windsurf'

/** 安装类型 */
export type InstallType = 'web' | 'cli'

/** Skill 作者信息 */
export interface SkillAuthor {
  id: string
  full_name: string | null
  avatar_url: string | null
}

/** Skill 主表 */
export interface Skill {
  id: string
  author_id: string
  name: string
  slug: string
  description: string | null
  readme: string | null
  visibility: SkillVisibility
  tags: string[]
  platforms: SkillPlatform[]
  latest_version: string | null
  downloads_count: number
  likes_count: number
  favorites_count: number
  created_at: string
  updated_at: string
  published_at: string | null

  // 关联数据（查询时可选包含）
  author?: SkillAuthor
  versions?: SkillVersion[]
  is_liked?: boolean
  is_favorited?: boolean
}

/** Skill 版本 */
export interface SkillVersion {
  id: string
  skill_id: string
  version: string
  storage_path: string
  file_size: number | null
  file_hash: string | null
  readme: string | null
  changelog: string | null
  metadata: Record<string, unknown>
  created_at: string
}

/** 点赞记录 */
export interface SkillLike {
  id: string
  skill_id: string
  user_id: string
  created_at: string
}

/** 收藏记录 */
export interface SkillFavorite {
  id: string
  skill_id: string
  user_id: string
  created_at: string
}

/** 安装记录 */
export interface SkillInstall {
  id: string
  skill_id: string
  skill_version_id: string | null
  user_id: string | null
  install_type: InstallType
  client_info: Record<string, unknown>
  created_at: string
}

/** 搜索参数 */
export interface SkillSearchParams {
  query?: string
  tags?: string[]
  platforms?: SkillPlatform[]
  author_id?: string
  sort?: 'downloads' | 'likes' | 'created_at' | 'relevance'
  page?: number
  per_page?: number
}

/** 搜索结果 */
export interface SkillSearchResult {
  results: Skill[]
  total: number
  page: number
  per_page: number
}

/** 发布 Skill 请求 */
export interface CreateSkillRequest {
  name: string
  description: string
  tags: string[]
  platforms: SkillPlatform[]
  visibility: SkillVisibility
  readme?: string
}

/** 更新 Skill 请求 */
export interface UpdateSkillRequest {
  name?: string
  description?: string
  tags?: string[]
  platforms?: SkillPlatform[]
  visibility?: SkillVisibility
  readme?: string
}

/** 发布版本请求 */
export interface PublishVersionRequest {
  skill_id: string
  version: string
  changelog?: string
  readme?: string
  file_size: number
}

/** 下载请求 */
export interface DownloadSkillRequest {
  skill_slug: string
  version?: string
  install_type: InstallType
  client_info?: {
    platform?: string
    version?: string
    os?: string
  }
}

/** 下载响应 */
export interface DownloadSkillResponse {
  download_url: string
  version: string
  file_size: number
  file_hash: string | null
}

/** 用户 Skill 统计 */
export interface UserSkillStats {
  total_skills: number
  total_downloads: number
  total_likes: number
  total_favorites: number
}
