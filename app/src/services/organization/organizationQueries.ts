/**
 * 组织查询服务 - 只读操作
 *
 * 提供组织树、成员列表、用户组织信息等查询功能。
 * 所有查询都带有内存缓存和并发去重（dedup）机制。
 */

import { supabase } from '@/lib/supabase/client'
import { memoryCache } from '@/services/cache/memoryCache'
import type {
  Organization,
  OrganizationTreeNode,
  UserOrganizationInfo,
  Profile,
} from '@/lib/supabase/organizationTypes'

export class OrganizationQueries {
  private orgDetailPromises = new Map<string, Promise<Organization | null>>()
  private userOrgInfoPromises = new Map<string, Promise<UserOrganizationInfo>>()
  private orgMembersPromises = new Map<string, Promise<Profile[]>>()
  private orgTreePromises = new Map<string, Promise<OrganizationTreeNode[]>>()

  async getOrganization(id: string): Promise<Organization | null> {
    const cacheKey = `${memoryCache.KEYS.ORG_DETAIL}${id}`
    const cached = memoryCache.get<Organization>(cacheKey)
    if (cached) return cached

    if (this.orgDetailPromises.has(id)) {
      return this.orgDetailPromises.get(id)!
    }

    const promise = (async () => {
      try {
        const { data, error } = await supabase
          .from('organizations')
          .select('*')
          .eq('id', id)
          .maybeSingle()

        if (error) throw new Error('Failed to get organization: ' + error.message)
        if (data) memoryCache.set(cacheKey, data, memoryCache.ORG_TTL)
        return data
      } finally {
        this.orgDetailPromises.delete(id)
      }
    })()

    this.orgDetailPromises.set(id, promise)
    return promise
  }

  async getOrganizationTree(rootId?: string): Promise<OrganizationTreeNode[]> {
    const cacheKey = rootId ? `${memoryCache.KEYS.ORG_TREE}:${rootId}` : memoryCache.KEYS.ORG_TREE
    const cached = memoryCache.get<OrganizationTreeNode[]>(cacheKey)
    if (cached) return cached

    const promiseKey = rootId || '__root__'
    if (this.orgTreePromises.has(promiseKey)) {
      return this.orgTreePromises.get(promiseKey)!
    }

    const promise = (async () => {
      try {
        const { data: orgs, error } = await supabase
          .from('organizations')
          .select('*')
          .order('level', { ascending: true })
          .order('display_name', { ascending: true })

        if (error) throw new Error('Failed to get organization tree: ' + error.message)

        let filteredOrgs = orgs || []
        if (rootId) {
          const root = filteredOrgs.find((o) => o.id === rootId)
          if (root) {
            filteredOrgs = filteredOrgs.filter(
              (o) => o.id === rootId || (o.path && o.path.startsWith(root.path + '.'))
            )
          }
        }

        const filteredOrgIds = filteredOrgs.map((org) => org.id)
        const memberCountMap = new Map<string, number>()

        if (filteredOrgIds.length > 0) {
          const { data: memberRows, error: memberCountError } = await supabase
            .from('profiles')
            .select('organization_id')
            .in('organization_id', filteredOrgIds)
            .eq('is_active', true)

          if (memberCountError) {
            throw new Error('Failed to get member counts: ' + memberCountError.message)
          }

          memberRows?.forEach((row) => {
            const orgId = row.organization_id as string
            memberCountMap.set(orgId, (memberCountMap.get(orgId) || 0) + 1)
          })
        }

        const orgsWithCounts = filteredOrgs.map((org) => ({
          ...org,
          member_count: memberCountMap.get(org.id) ?? 0,
        }))

        const tree = this.buildTree(orgsWithCounts, rootId)
        memoryCache.set(cacheKey, tree, memoryCache.ORG_TTL)
        return tree
      } finally {
        this.orgTreePromises.delete(promiseKey)
      }
    })()

    this.orgTreePromises.set(promiseKey, promise)
    return promise
  }

  async getOrganizationChildren(parentId: string): Promise<Organization[]> {
    const { data, error } = await supabase
      .from('organizations')
      .select('*')
      .eq('parent_id', parentId)
      .order('display_name', { ascending: true })

    if (error) throw new Error('Failed to get organization children: ' + error.message)
    return data
  }

  async getOrganizationAncestors(id: string): Promise<Organization[]> {
    const { data: org, error: orgError } = await supabase
      .from('organizations')
      .select('path')
      .eq('id', id)
      .maybeSingle()

    if (orgError || !org) throw new Error('Organization not found')

    const pathParts = org.path.split('.')
    const ancestorPaths = []
    for (let i = 0; i < pathParts.length - 1; i++) {
      ancestorPaths.push(pathParts.slice(0, i + 1).join('.'))
    }

    if (ancestorPaths.length === 0) return []

    const { data, error } = await supabase
      .from('organizations')
      .select('*')
      .in('path', ancestorPaths)
      .order('level', { ascending: true })

    if (error) throw new Error('Failed to get ancestors: ' + error.message)
    return data
  }

  async getUserOrganizationInfo(userId: string): Promise<UserOrganizationInfo> {
    const cacheKey = `${memoryCache.KEYS.USER_ORG_INFO}${userId}`
    const cached = memoryCache.get<UserOrganizationInfo>(cacheKey)
    if (cached) return cached

    if (this.userOrgInfoPromises.has(userId)) {
      return this.userOrgInfoPromises.get(userId)!
    }

    const promise = (async () => {
      try {
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('organization_id, role')
          .eq('id', userId)
          .maybeSingle()

        if (profileError) throw new Error('Failed to get user profile')

        if (!profile || !profile.organization_id) {
          const info: UserOrganizationInfo = {
            organization: null,
            ancestors: [],
            role: profile?.role || 'member',
          }
          memoryCache.set(cacheKey, info, memoryCache.PROFILE_TTL)
          return info
        }

        const organization = await this.getOrganization(profile.organization_id)
        const ancestors = await this.getOrganizationAncestors(profile.organization_id)

        const info: UserOrganizationInfo = {
          organization,
          ancestors,
          role: profile.role,
        }

        memoryCache.set(cacheKey, info, memoryCache.PROFILE_TTL)
        return info
      } finally {
        this.userOrgInfoPromises.delete(userId)
      }
    })()

    this.userOrgInfoPromises.set(userId, promise)
    return promise
  }

  async getOrganizationMembers(organizationId: string): Promise<Profile[]> {
    const cacheKey = `${memoryCache.KEYS.ORG_MEMBERS}${organizationId}`
    const cached = memoryCache.get<Profile[]>(cacheKey)
    if (cached) return cached

    if (this.orgMembersPromises.has(organizationId)) {
      return this.orgMembersPromises.get(organizationId)!
    }

    const promise = (async () => {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('organization_id', organizationId)
          .eq('is_active', true)
          .order('full_name', { ascending: true })

        if (error) throw new Error('Failed to get organization members: ' + error.message)
        memoryCache.set(cacheKey, data || [], memoryCache.PROFILE_TTL)
        return data || []
      } finally {
        this.orgMembersPromises.delete(organizationId)
      }
    })()

    this.orgMembersPromises.set(organizationId, promise)
    return promise
  }

  async getOrganizationMemberNames(organizationId: string): Promise<string[]> {
    const members = await this.getOrganizationMembers(organizationId)
    return members.map((p) => p.full_name).filter(Boolean) as string[]
  }

  async getAllUsers(): Promise<Profile[]> {
    const cached = memoryCache.get<Profile[]>(memoryCache.KEYS.ALL_USERS)
    if (cached) return cached

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('is_active', true)
      .order('full_name', { ascending: true })

    if (error) throw new Error('Failed to get users: ' + error.message)
    memoryCache.set(memoryCache.KEYS.ALL_USERS, data, memoryCache.PROFILE_TTL)
    return data
  }

  async searchUsers(query: string): Promise<Profile[]> {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('is_active', true)
      .or(`full_name.ilike.%${query}%,email.ilike.%${query}%`)
      .order('full_name', { ascending: true })
      .limit(20)

    if (error) throw new Error('Failed to search users: ' + error.message)
    return data
  }

  async getUploadableOrganizations(userId: string): Promise<Organization[]> {
    const cacheKey = `org:uploadable:${userId}`

    return memoryCache.getOrFetch(
      cacheKey,
      async () => {
        const { data, error } = await supabase.rpc('get_user_uploadable_organizations', {
          user_uuid: userId,
        })

        if (error) throw new Error('Failed to get uploadable organizations: ' + error.message)

        if (!data || data.length === 0) return []

        const orgIds = data.map((row: { organization_id: string }) => row.organization_id)

        const { data: orgs, error: orgsError } = await supabase
          .from('organizations')
          .select('*')
          .in('id', orgIds)
          .order('path', { ascending: true })

        if (orgsError) throw new Error('Failed to fetch organization details: ' + orgsError.message)

        return orgs || []
      },
      memoryCache.ORG_TTL
    )
  }

  async getViewableOrganizations(userId: string): Promise<Organization[]> {
    return this.getUploadableOrganizations(userId)
  }

  buildTree(
    organizations: (Organization & { member_count?: number })[],
    rootId?: string
  ): OrganizationTreeNode[] {
    const orgMap = new Map<string, OrganizationTreeNode>()
    const rootNodes: OrganizationTreeNode[] = []

    organizations.forEach((org) => {
      const node: OrganizationTreeNode = {
        ...org,
        children: [],
        member_count: org.member_count || 0,
      }
      orgMap.set(org.id, node)
    })

    organizations.forEach((org) => {
      const node = orgMap.get(org.id)!
      if (org.parent_id && orgMap.has(org.parent_id)) {
        const parent = orgMap.get(org.parent_id)!
        if (!parent.children) parent.children = []
        parent.children.push(node)
      } else if (!rootId || org.id === rootId) {
        rootNodes.push(node)
      }
    })

    return rootNodes
  }
}
