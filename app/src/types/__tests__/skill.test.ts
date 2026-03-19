/**
 * Skill 类型测试
 *
 * 测试覆盖：
 * - 类型定义
 * - 类型守卫
 * - 数据验证
 */

import { describe, it, expect } from 'vitest'
import type {
  Skill,
  SkillVersion,
  SkillLike,
  SkillFavorite,
  SkillInstall,
  SkillSearchParams,
  SkillSearchResult,
  CreateSkillRequest,
  UpdateSkillRequest,
  PublishVersionRequest,
  DownloadSkillRequest,
  DownloadSkillResponse,
  UserSkillStats,
  SkillVisibility,
  SkillPlatform,
  InstallType,
} from '@/types/skill'

// ============================================
// 测试套件
// ============================================

describe('Skill Types', () => {
  describe('SkillVisibility', () => {
    it('应该接受有效的可见性值', () => {
      const validVisibilities: SkillVisibility[] = ['draft', 'public', 'private']

      validVisibilities.forEach((visibility) => {
        expect(['draft', 'public', 'private']).toContain(visibility)
      })
    })
  })

  describe('SkillPlatform', () => {
    it('应该接受有效的平台值', () => {
      const validPlatforms: SkillPlatform[] = ['qoder', 'cursor', 'claude', 'cline', 'windsurf']

      validPlatforms.forEach((platform) => {
        expect(['qoder', 'cursor', 'claude', 'cline', 'windsurf']).toContain(platform)
      })
    })
  })

  describe('InstallType', () => {
    it('应该接受有效的安装类型', () => {
      const validTypes: InstallType[] = ['web', 'cli']

      validTypes.forEach((type) => {
        expect(['web', 'cli']).toContain(type)
      })
    })
  })

  describe('Skill', () => {
    it('应该定义完整的 Skill 对象', () => {
      const skill: Skill = {
        id: 'skill-1',
        author_id: 'author-1',
        name: 'Test Skill',
        slug: 'test-skill',
        description: 'A test skill',
        readme: '# Test',
        visibility: 'public',
        tags: ['test'],
        platforms: ['qoder'],
        latest_version: '1.0.0',
        downloads_count: 100,
        likes_count: 10,
        favorites_count: 5,
        created_at: '2024-01-01T00:00:00.000Z',
        updated_at: '2024-01-01T00:00:00.000Z',
        published_at: '2024-01-01T00:00:00.000Z',
      }

      expect(skill.id).toBe('skill-1')
      expect(skill.visibility).toBe('public')
      expect(skill.tags).toContain('test')
    })

    it('应该支持可选的关联数据', () => {
      const skillWithAuthor: Skill = {
        id: 'skill-1',
        author_id: 'author-1',
        name: 'Test Skill',
        slug: 'test-skill',
        description: null,
        readme: null,
        visibility: 'public',
        tags: [],
        platforms: ['qoder'],
        latest_version: null,
        downloads_count: 0,
        likes_count: 0,
        favorites_count: 0,
        created_at: '2024-01-01T00:00:00.000Z',
        updated_at: '2024-01-01T00:00:00.000Z',
        published_at: null,
        author: {
          id: 'author-1',
          full_name: 'Test Author',
          avatar_url: null,
        },
        versions: [],
        is_liked: false,
        is_favorited: false,
      }

      expect(skillWithAuthor.author).toBeDefined()
      expect(skillWithAuthor.versions).toEqual([])
      expect(skillWithAuthor.is_liked).toBe(false)
    })
  })

  describe('SkillVersion', () => {
    it('应该定义完整的 SkillVersion 对象', () => {
      const version: SkillVersion = {
        id: 'version-1',
        skill_id: 'skill-1',
        version: '1.0.0',
        storage_path: 'skills/skill-1/1.0.0.zip',
        file_size: 1024,
        file_hash: 'abc123',
        readme: '# README',
        changelog: 'Initial release',
        metadata: {},
        created_at: '2024-01-01T00:00:00.000Z',
      }

      expect(version.version).toBe('1.0.0')
      expect(version.file_size).toBe(1024)
    })
  })

  describe('SkillSearchParams', () => {
    it('应该支持所有搜索参数', () => {
      const params: SkillSearchParams = {
        query: 'react',
        tags: ['typescript', 'hooks'],
        platforms: ['qoder', 'cursor'],
        author_id: 'author-1',
        sort: 'downloads',
        page: 1,
        per_page: 20,
      }

      expect(params.query).toBe('react')
      expect(params.tags).toHaveLength(2)
      expect(params.sort).toBe('downloads')
    })

    it('应该支持所有排序选项', () => {
      const sortOptions: SkillSearchParams['sort'][] = [
        'downloads',
        'likes',
        'created_at',
        'relevance',
      ]

      sortOptions.forEach((sort) => {
        const params: SkillSearchParams = { sort }
        expect(params.sort).toBe(sort)
      })
    })
  })

  describe('SkillSearchResult', () => {
    it('应该定义搜索结果结构', () => {
      const result: SkillSearchResult = {
        results: [],
        total: 0,
        page: 1,
        per_page: 20,
      }

      expect(result.results).toEqual([])
      expect(result.total).toBe(0)
    })
  })

  describe('CreateSkillRequest', () => {
    it('应该定义创建请求结构', () => {
      const request: CreateSkillRequest = {
        name: 'New Skill',
        description: 'A new skill',
        tags: ['new'],
        platforms: ['qoder'],
        visibility: 'public',
        readme: '# New Skill',
      }

      expect(request.name).toBe('New Skill')
      expect(request.visibility).toBe('public')
    })
  })

  describe('UpdateSkillRequest', () => {
    it('应该支持部分更新', () => {
      const request: UpdateSkillRequest = {
        name: 'Updated Skill',
      }

      expect(request.name).toBe('Updated Skill')
      expect(request.description).toBeUndefined()
    })
  })

  describe('PublishVersionRequest', () => {
    it('应该定义发布版本请求', () => {
      const request: PublishVersionRequest = {
        skill_id: 'skill-1',
        version: '1.1.0',
        changelog: 'Bug fixes',
        readme: '# Updated README',
        file_size: 2048,
      }

      expect(request.version).toBe('1.1.0')
      expect(request.file_size).toBe(2048)
    })
  })

  describe('DownloadSkillRequest', () => {
    it('应该定义下载请求', () => {
      const request: DownloadSkillRequest = {
        skill_slug: 'test-skill',
        version: '1.0.0',
        install_type: 'web',
        client_info: {
          platform: 'macos',
          version: '1.0.0',
          os: 'darwin',
        },
      }

      expect(request.skill_slug).toBe('test-skill')
      expect(request.install_type).toBe('web')
    })
  })

  describe('DownloadSkillResponse', () => {
    it('应该定义下载响应', () => {
      const response: DownloadSkillResponse = {
        download_url: 'https://example.com/skill.zip',
        version: '1.0.0',
        file_size: 1024,
        file_hash: 'abc123',
      }

      expect(response.download_url).toBe('https://example.com/skill.zip')
    })
  })

  describe('UserSkillStats', () => {
    it('应该定义用户统计', () => {
      const stats: UserSkillStats = {
        total_skills: 10,
        total_downloads: 1000,
        total_likes: 100,
        total_favorites: 50,
      }

      expect(stats.total_skills).toBe(10)
      expect(stats.total_downloads).toBe(1000)
    })
  })

  describe('SkillLike', () => {
    it('应该定义点赞记录', () => {
      const like: SkillLike = {
        id: 'like-1',
        skill_id: 'skill-1',
        user_id: 'user-1',
        created_at: '2024-01-01T00:00:00.000Z',
      }

      expect(like.skill_id).toBe('skill-1')
    })
  })

  describe('SkillFavorite', () => {
    it('应该定义收藏记录', () => {
      const favorite: SkillFavorite = {
        id: 'favorite-1',
        skill_id: 'skill-1',
        user_id: 'user-1',
        created_at: '2024-01-01T00:00:00.000Z',
      }

      expect(favorite.skill_id).toBe('skill-1')
    })
  })

  describe('SkillInstall', () => {
    it('应该定义安装记录', () => {
      const install: SkillInstall = {
        id: 'install-1',
        skill_id: 'skill-1',
        skill_version_id: 'version-1',
        user_id: 'user-1',
        install_type: 'cli',
        client_info: { platform: 'macos' },
        created_at: '2024-01-01T00:00:00.000Z',
      }

      expect(install.install_type).toBe('cli')
    })
  })
})
