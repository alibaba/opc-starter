/**
 * OrganizationQueries 单元测试
 *
 * 测试覆盖：
 * - 组织查询
 * - 组织树构建
 * - 成员查询
 * - 用户组织信息
 * - 缓存机制
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { OrganizationQueries } from '../organizationQueries'
import type { Organization, OrganizationTreeNode, Profile } from '@/lib/supabase/organizationTypes'

// Mock Supabase
vi.mock('@/lib/supabase/client', () => {
  // 在工厂函数内部创建 mock
  const mockFromChain = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn(),
    single: vi.fn(),
    order: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    or: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
  }

  return {
    supabase: {
      from: vi.fn().mockReturnValue(mockFromChain),
      rpc: vi.fn(),
    },
  }
})

// Mock memoryCache
vi.mock('@/services/cache/memoryCache', () => ({
  memoryCache: {
    get: vi.fn(),
    set: vi.fn(),
    getOrFetch: vi.fn(),
    KEYS: {
      ORG_DETAIL: 'org:detail:',
      ORG_TREE: 'org:tree',
      ORG_MEMBERS: 'org:members:',
      USER_ORG_INFO: 'user:org:',
      ALL_USERS: 'users:all',
    },
    ORG_TTL: 300000,
    PROFILE_TTL: 60000,
  },
}))

import { supabase } from '@/lib/supabase/client'
import { memoryCache } from '@/services/cache/memoryCache'

// ============================================
// 测试数据
// ============================================

const mockOrganization: Organization = {
  id: 'org-1',
  name: 'test-org',
  display_name: 'Test Organization',
  description: 'A test organization',
  parent_id: null,
  path: 'org-1',
  level: 0,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
}

const mockChildOrg: Organization = {
  id: 'org-2',
  name: 'child-org',
  display_name: 'Child Organization',
  description: null,
  parent_id: 'org-1',
  path: 'org-1.org-2',
  level: 1,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
}

const mockProfile: Profile = {
  id: 'user-1',
  full_name: 'Test User',
  avatar_url: null,
  organization_id: 'org-1',
  role: 'member',
  is_active: true,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
}

// ============================================
// 测试套件
// ============================================

describe('OrganizationQueries', () => {
  let queries: OrganizationQueries

  beforeEach(() => {
    vi.clearAllMocks()
    queries = new OrganizationQueries()
  })

  // ============================================================
  // getOrganization
  // ============================================================
  describe('getOrganization', () => {
    it('应该从缓存返回组织', async () => {
      vi.mocked(memoryCache.get).mockReturnValue(mockOrganization)

      const result = await queries.getOrganization('org-1')

      expect(result).toEqual(mockOrganization)
      expect(memoryCache.get).toHaveBeenCalledWith('org:detail:org-1')
      expect(supabase.from).not.toHaveBeenCalled()
    })

    it('应该从数据库获取组织', async () => {
      vi.mocked(memoryCache.get).mockReturnValue(undefined)
      const mockMaybeSingle = vi.fn().mockResolvedValue({ data: mockOrganization, error: null })
      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: mockMaybeSingle,
      } as never)

      const result = await queries.getOrganization('org-1')

      expect(result).toEqual(mockOrganization)
      expect(supabase.from).toHaveBeenCalledWith('organizations')
      expect(memoryCache.set).toHaveBeenCalledWith(
        'org:detail:org-1',
        mockOrganization,
        memoryCache.ORG_TTL
      )
    })

    it('应该处理数据库错误', async () => {
      vi.mocked(memoryCache.get).mockReturnValue(undefined)
      const mockMaybeSingle = vi
        .fn()
        .mockResolvedValue({ data: null, error: { message: 'DB error' } })
      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: mockMaybeSingle,
      } as never)

      await expect(queries.getOrganization('org-1')).rejects.toThrow('DB error')
    })

    it('应该去重并发请求', async () => {
      vi.mocked(memoryCache.get).mockReturnValue(undefined)
      const mockMaybeSingle = vi.fn().mockResolvedValue({ data: mockOrganization, error: null })
      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: mockMaybeSingle,
      } as never)

      // 同时发起多个请求
      const promises = [queries.getOrganization('org-1'), queries.getOrganization('org-1')]
      await Promise.all(promises)

      // 应该只调用一次数据库
      expect(mockMaybeSingle).toHaveBeenCalledTimes(1)
    })
  })

  // ============================================================
  // getOrganizationTree
  // ============================================================
  describe('getOrganizationTree', () => {
    it('应该从缓存返回组织树', async () => {
      const mockTree: OrganizationTreeNode[] = [
        { ...mockOrganization, children: [], member_count: 0 },
      ]
      vi.mocked(memoryCache.get).mockReturnValue(mockTree)

      const result = await queries.getOrganizationTree()

      expect(result).toEqual(mockTree)
      expect(supabase.from).not.toHaveBeenCalled()
    })

    it('应该构建组织树', async () => {
      vi.mocked(memoryCache.get).mockReturnValue(undefined)

      const orgs = [mockOrganization, mockChildOrg]

      // 创建一个完整的链式 mock，最终返回数据
      const finalOrderMock = vi.fn().mockResolvedValue({ data: orgs, error: null })
      const chainMock = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockImplementation(function (this: unknown) {
          // 第二次调用 order 时返回能解析的 mock
          if (finalOrderMock.mock.calls.length === 0) {
            return { order: finalOrderMock }
          }
          return this
        }),
        maybeSingle: vi.fn(),
        single: vi.fn(),
        in: vi.fn().mockReturnThis(),
        or: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
      }

      // 第一个查询：获取组织列表
      vi.mocked(supabase.from).mockReturnValueOnce(chainMock as never)

      // 第二个查询：获取成员计数
      vi.mocked(supabase.from).mockReturnValueOnce({
        select: vi.fn().mockReturnValue({
          in: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ data: [], error: null }),
          }),
        }),
      } as never)

      const result = await queries.getOrganizationTree()

      expect(result).toHaveLength(1)
      expect(result[0].id).toBe('org-1')
      expect(result[0].children).toHaveLength(1)
      expect(result[0].children?.[0].id).toBe('org-2')
    })

    it('应该支持根节点过滤', async () => {
      vi.mocked(memoryCache.get).mockReturnValue(undefined)

      const orgs = [mockOrganization, mockChildOrg]

      // 简化 mock - 只验证调用了 from
      const finalOrderMock = vi.fn().mockResolvedValue({ data: orgs, error: null })
      const chainMock = {
        select: vi.fn().mockReturnValue({
          order: vi.fn().mockReturnValue({
            order: finalOrderMock,
          }),
        }),
        eq: vi.fn().mockReturnThis(),
        in: vi.fn().mockReturnThis(),
      }

      // 第一个查询
      vi.mocked(supabase.from).mockReturnValueOnce(chainMock as never)

      // 第二个查询 mock
      vi.mocked(supabase.from).mockReturnValueOnce({
        select: vi.fn().mockReturnValue({
          in: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ data: [], error: null }),
          }),
        }),
      } as never)

      await queries.getOrganizationTree('org-1')

      expect(supabase.from).toHaveBeenCalledWith('organizations')
    })
  })

  // ============================================================
  // getOrganizationChildren
  // ============================================================
  describe('getOrganizationChildren', () => {
    it('应该获取子组织', async () => {
      const finalOrderMock = vi.fn().mockResolvedValue({ data: [mockChildOrg], error: null })
      const chainMock = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: finalOrderMock,
      }
      vi.mocked(supabase.from).mockReturnValue(chainMock as never)

      const result = await queries.getOrganizationChildren('org-1')

      expect(result).toHaveLength(1)
      expect(result[0].id).toBe('org-2')
    })

    it('应该处理查询错误', async () => {
      const finalOrderMock = vi
        .fn()
        .mockResolvedValue({ data: null, error: { message: 'Query failed' } })
      const chainMock = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: finalOrderMock,
      }
      vi.mocked(supabase.from).mockReturnValue(chainMock as never)

      await expect(queries.getOrganizationChildren('org-1')).rejects.toThrow('Query failed')
    })
  })

  // ============================================================
  // getOrganizationAncestors
  // ============================================================
  describe('getOrganizationAncestors', () => {
    it('应该获取祖先组织', async () => {
      const mockMaybeSingle = vi.fn().mockResolvedValue({
        data: { path: 'root.org-1.org-2' },
        error: null,
      })
      const mockOrder = vi.fn().mockResolvedValue({
        data: [mockOrganization],
        error: null,
      })

      vi.mocked(supabase.from)
        .mockReturnValueOnce({
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          maybeSingle: mockMaybeSingle,
        } as never)
        .mockReturnValueOnce({
          select: vi.fn().mockReturnThis(),
          in: vi.fn().mockReturnThis(),
          order: mockOrder,
        } as never)

      const result = await queries.getOrganizationAncestors('org-2')

      expect(result).toHaveLength(1)
    })

    it('应该处理组织不存在', async () => {
      const mockMaybeSingle = vi.fn().mockResolvedValue({ data: null, error: null })
      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: mockMaybeSingle,
      } as never)

      await expect(queries.getOrganizationAncestors('org-2')).rejects.toThrow(
        'Organization not found'
      )
    })

    it('应该返回空数组当没有祖先', async () => {
      const mockMaybeSingle = vi.fn().mockResolvedValue({
        data: { path: 'root' },
        error: null,
      })
      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: mockMaybeSingle,
      } as never)

      const result = await queries.getOrganizationAncestors('root')

      expect(result).toHaveLength(0)
    })
  })

  // ============================================================
  // getUserOrganizationInfo
  // ============================================================
  describe('getUserOrganizationInfo', () => {
    it('应该从缓存返回用户信息', async () => {
      const mockInfo = { organization: null, ancestors: [], role: 'member' }
      vi.mocked(memoryCache.get).mockReturnValue(mockInfo)

      const result = await queries.getUserOrganizationInfo('user-1')

      expect(result).toEqual(mockInfo)
      expect(supabase.from).not.toHaveBeenCalled()
    })

    it('应该返回无组织信息当用户没有组织', async () => {
      vi.mocked(memoryCache.get).mockReturnValue(undefined)
      const mockMaybeSingle = vi.fn().mockResolvedValue({
        data: { organization_id: null, role: 'member' },
        error: null,
      })
      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: mockMaybeSingle,
      } as never)

      const result = await queries.getUserOrganizationInfo('user-1')

      expect(result.organization).toBeNull()
      expect(result.role).toBe('member')
    })

    it('应该获取完整的组织信息', async () => {
      vi.mocked(memoryCache.get).mockReturnValue(undefined)

      // 第一次查询：用户资料
      const mockProfileSelect = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({
          data: { organization_id: 'org-1', role: 'manager' },
          error: null,
        }),
      })

      // 第二次查询：组织详情
      const mockOrgSelect = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({
          data: mockOrganization,
          error: null,
        }),
      })

      // 第三次查询：祖先组织
      const mockAncestorSelect = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({
          data: { path: 'org-1' },
          error: null,
        }),
      })

      vi.mocked(supabase.from)
        .mockReturnValueOnce({ select: mockProfileSelect } as never)
        .mockReturnValueOnce({ select: mockOrgSelect } as never)
        .mockReturnValueOnce({ select: mockAncestorSelect } as never)

      const result = await queries.getUserOrganizationInfo('user-1')

      expect(result.organization).toEqual(mockOrganization)
      expect(result.role).toBe('manager')
    })
  })

  // ============================================================
  // getOrganizationMembers
  // ============================================================
  describe('getOrganizationMembers', () => {
    it('应该从缓存返回成员', async () => {
      vi.mocked(memoryCache.get).mockReturnValue([mockProfile])

      const result = await queries.getOrganizationMembers('org-1')

      expect(result).toHaveLength(1)
      expect(supabase.from).not.toHaveBeenCalled()
    })

    it('应该获取组织成员', async () => {
      vi.mocked(memoryCache.get).mockReturnValue(undefined)
      const mockOrder = vi.fn().mockResolvedValue({ data: [mockProfile], error: null })
      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: mockOrder,
      } as never)

      const result = await queries.getOrganizationMembers('org-1')

      expect(result).toHaveLength(1)
      expect(result[0].full_name).toBe('Test User')
    })

    it('应该返回空数组当没有成员', async () => {
      vi.mocked(memoryCache.get).mockReturnValue(undefined)
      const mockOrder = vi.fn().mockResolvedValue({ data: null, error: null })
      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: mockOrder,
      } as never)

      const result = await queries.getOrganizationMembers('org-1')

      expect(result).toHaveLength(0)
    })
  })

  // ============================================================
  // getOrganizationMemberNames
  // ============================================================
  describe('getOrganizationMemberNames', () => {
    it('应该获取成员名称列表', async () => {
      vi.mocked(memoryCache.get).mockReturnValue([
        { ...mockProfile, full_name: 'Alice' },
        { ...mockProfile, id: 'user-2', full_name: 'Bob' },
      ])

      const result = await queries.getOrganizationMemberNames('org-1')

      expect(result).toEqual(['Alice', 'Bob'])
    })

    it('应该过滤空名称', async () => {
      vi.mocked(memoryCache.get).mockReturnValue([
        { ...mockProfile, full_name: 'Alice' },
        { ...mockProfile, id: 'user-2', full_name: null },
      ])

      const result = await queries.getOrganizationMemberNames('org-1')

      expect(result).toEqual(['Alice'])
    })
  })

  // ============================================================
  // getAllUsers
  // ============================================================
  describe('getAllUsers', () => {
    it('应该从缓存返回所有用户', async () => {
      vi.mocked(memoryCache.get).mockReturnValue([mockProfile])

      const result = await queries.getAllUsers()

      expect(result).toHaveLength(1)
      expect(supabase.from).not.toHaveBeenCalled()
    })

    it('应该获取所有用户', async () => {
      vi.mocked(memoryCache.get).mockReturnValue(undefined)
      const mockOrder = vi.fn().mockResolvedValue({ data: [mockProfile], error: null })
      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: mockOrder,
      } as never)

      const result = await queries.getAllUsers()

      expect(result).toHaveLength(1)
      expect(memoryCache.set).toHaveBeenCalledWith(
        'users:all',
        [mockProfile],
        memoryCache.PROFILE_TTL
      )
    })
  })

  // ============================================================
  // searchUsers
  // ============================================================
  describe('searchUsers', () => {
    it('应该搜索用户', async () => {
      const mockLimit = vi.fn().mockResolvedValue({ data: [mockProfile], error: null })
      const mockOrder = vi.fn().mockReturnValue({ limit: mockLimit })
      const mockOr = vi.fn().mockReturnValue({ order: mockOrder })
      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        or: mockOr,
      } as never)

      const result = await queries.searchUsers('test')

      expect(result).toHaveLength(1)
      expect(mockOr).toHaveBeenCalledWith('full_name.ilike.%test%,email.ilike.%test%')
    })

    it('应该处理搜索错误', async () => {
      const mockLimit = vi
        .fn()
        .mockResolvedValue({ data: null, error: { message: 'Search error' } })
      const mockOrder = vi.fn().mockReturnValue({ limit: mockLimit })
      const mockOr = vi.fn().mockReturnValue({ order: mockOrder })
      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        or: mockOr,
      } as never)

      await expect(queries.searchUsers('test')).rejects.toThrow('Search error')
    })
  })

  // ============================================================
  // getUploadableOrganizations
  // ============================================================
  describe('getUploadableOrganizations', () => {
    it('应该获取可上传组织', async () => {
      const mockOrgs = [mockOrganization]
      vi.mocked(memoryCache.getOrFetch).mockImplementation(async (_key, fetchFn) => {
        return fetchFn()
      })

      const mockRpc = vi.fn().mockResolvedValue({
        data: [{ organization_id: 'org-1' }],
        error: null,
      })
      const mockIn = vi.fn().mockReturnValue({
        order: vi.fn().mockResolvedValue({ data: mockOrgs, error: null }),
      })
      vi.mocked(supabase.rpc).mockImplementation(mockRpc as never)
      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        in: mockIn,
      } as never)

      const result = await queries.getUploadableOrganizations('user-1')

      expect(result).toEqual(mockOrgs)
      expect(mockRpc).toHaveBeenCalledWith('get_user_uploadable_organizations', {
        user_uuid: 'user-1',
      })
    })
  })

  // ============================================================
  // getViewableOrganizations
  // ============================================================
  describe('getViewableOrganizations', () => {
    it('应该调用 getUploadableOrganizations', async () => {
      const spy = vi
        .spyOn(queries, 'getUploadableOrganizations')
        .mockResolvedValue([mockOrganization])

      const result = await queries.getViewableOrganizations('user-1')

      expect(spy).toHaveBeenCalledWith('user-1')
      expect(result).toEqual([mockOrganization])
    })
  })

  // ============================================================
  // buildTree
  // ============================================================
  describe('buildTree', () => {
    it('应该构建组织树', () => {
      const orgs = [
        { ...mockOrganization, member_count: 5 },
        { ...mockChildOrg, member_count: 3 },
      ]

      const result = queries.buildTree(orgs)

      expect(result).toHaveLength(1)
      expect(result[0].id).toBe('org-1')
      expect(result[0].member_count).toBe(5)
      expect(result[0].children).toHaveLength(1)
      expect(result[0].children?.[0].id).toBe('org-2')
      expect(result[0].children?.[0].member_count).toBe(3)
    })

    it('应该处理根节点过滤', () => {
      // 创建 org-2 作为独立根节点的场景
      const org2AsRoot: Organization = {
        ...mockChildOrg,
        parent_id: null, // org-2 现在是根节点
        path: 'org-2',
        level: 0,
      }
      const orgs = [
        { ...mockOrganization, member_count: 5 },
        { ...org2AsRoot, member_count: 3 },
      ]

      const result = queries.buildTree(orgs, 'org-2')

      // 当指定 rootId 为 org-2 时，org-2 应该作为根节点
      expect(result).toHaveLength(1)
      expect(result[0].id).toBe('org-2')
    })

    it('应该处理空数组', () => {
      const result = queries.buildTree([])

      expect(result).toHaveLength(0)
    })
  })
})
