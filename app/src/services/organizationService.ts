import { supabase } from '@/lib/supabase/client';
import { memoryCache } from '@/services/cache/memoryCache';
import type {
  Organization,
  CreateOrganizationInput,
  UpdateOrganizationInput,
  OrganizationTreeNode,
  UserOrganizationInfo,
  Profile,
} from '@/lib/supabase/organizationTypes';

export class OrganizationService {
  // 并发去重：同 key 请求未完成时复用 Promise
  private orgDetailPromises = new Map<string, Promise<Organization | null>>();
  private userOrgInfoPromises = new Map<string, Promise<UserOrganizationInfo>>();
  private orgMembersPromises = new Map<string, Promise<Profile[]>>();
  private orgTreePromises = new Map<string, Promise<OrganizationTreeNode[]>>();

  async createOrganization(input: CreateOrganizationInput, _userId: string): Promise<Organization> {
    void _userId
    // 使用 SECURITY DEFINER 函数绕过 RLS 限制
    // 函数内部会验证用户是否为 admin
    const { data: newOrgId, error: rpcError } = await supabase
      .rpc('admin_create_organization', {
        p_name: input.name,
        p_display_name: input.display_name,
        p_description: input.description || null,
        p_parent_id: input.parent_id || null,
      });

    if (rpcError) throw new Error('Failed to create organization: ' + rpcError.message);
    
    // 获取新创建的组织详情
    const { data: org, error: fetchError } = await supabase
      .from('organizations')
      .select('*')
      .eq('id', newOrgId)
      .single();
    
    if (fetchError) throw new Error('Failed to fetch created organization: ' + fetchError.message);
    
    // 失效组织缓存 (Epic-18)
    memoryCache.invalidateOrganizations();
    
    return org;
  }

  async updateOrganization(id: string, input: UpdateOrganizationInput, userId: string): Promise<Organization> {
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .maybeSingle();

    if (profileError) throw new Error('Failed to get user profile');
    if (!profile || profile.role !== 'admin') throw new Error('Permission denied: Only admins can update organizations');

    const updateData: Record<string, string | null> = {};
    if (input.name !== undefined) updateData.name = input.name;
    if (input.display_name !== undefined) updateData.display_name = input.display_name;
    if (input.description !== undefined) updateData.description = input.description;

    const { data, error } = await supabase
      .from('organizations')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw new Error('Failed to update organization: ' + error.message);

    if (input.name) {
      await this.updateDescendantPaths(id);
    }

    // 失效组织缓存 (Epic-18)
    memoryCache.invalidateOrganizations();

    return data;
  }

  async deleteOrganization(id: string, _userId: string): Promise<void> {
    void _userId
    // 使用 SECURITY DEFINER 函数绕过 RLS 限制
    // 函数内部会验证用户是否为 admin，以及是否有子组织
    const { error } = await supabase
      .rpc('admin_delete_organization', { p_org_id: id });

    if (error) throw new Error('Failed to delete organization: ' + error.message);
    
    // 失效组织缓存 (Epic-18)
    memoryCache.invalidateOrganizations();
  }

  async getOrganization(id: string): Promise<Organization | null> {
    // 检查缓存 (Epic-18)
    const cacheKey = `${memoryCache.KEYS.ORG_DETAIL}${id}`;
    const cached = memoryCache.get<Organization>(cacheKey);
    if (cached) {
      return cached;
    }

    if (this.orgDetailPromises.has(id)) {
      return this.orgDetailPromises.get(id)!;
    }

    const promise = (async () => {
      try {
        const { data, error } = await supabase
          .from('organizations')
          .select('*')
          .eq('id', id)
          .maybeSingle();
        
        if (error) {
          throw new Error('Failed to get organization: ' + error.message);
        }
        if (data) {
          memoryCache.set(cacheKey, data, memoryCache.ORG_TTL);
        }
        return data;
      } finally {
        this.orgDetailPromises.delete(id);
      }
    })();

    this.orgDetailPromises.set(id, promise);
    return promise;
  }

  async getOrganizationTree(rootId?: string): Promise<OrganizationTreeNode[]> {
    // 检查缓存 (Epic-18)
    const cacheKey = rootId ? `${memoryCache.KEYS.ORG_TREE}:${rootId}` : memoryCache.KEYS.ORG_TREE;
    const cached = memoryCache.get<OrganizationTreeNode[]>(cacheKey);
    if (cached) {
      return cached;
    }

    const promiseKey = rootId || '__root__';
    if (this.orgTreePromises.has(promiseKey)) {
      return this.orgTreePromises.get(promiseKey)!;
    }

    const promise = (async () => {
      try {
        const { data: orgs, error } = await supabase
          .from('organizations')
          .select('*')
          .order('level', { ascending: true })
          .order('display_name', { ascending: true });

        if (error) throw new Error('Failed to get organization tree: ' + error.message);

        // 如果指定了 rootId，在 JS 中筛选该组织及其子组织
        let filteredOrgs = orgs || [];
        if (rootId) {
          const root = filteredOrgs.find(o => o.id === rootId);
          if (root) {
            filteredOrgs = filteredOrgs.filter(o => 
              o.id === rootId || 
              (o.path && o.path.startsWith(root.path + '.'))
            );
          }
        }

        // Get member counts for each organization
        const filteredOrgIds = filteredOrgs.map((org) => org.id);
        const memberCountMap = new Map<string, number>();

        if (filteredOrgIds.length > 0) {
          const { data: memberRows, error: memberCountError } = await supabase
            .from('profiles')
            .select('organization_id')
            .in('organization_id', filteredOrgIds)
            .eq('is_active', true);

          if (memberCountError) {
            throw new Error('Failed to get member counts: ' + memberCountError.message);
          }

          memberRows?.forEach((row) => {
            const orgId = row.organization_id as string;
            memberCountMap.set(orgId, (memberCountMap.get(orgId) || 0) + 1);
          });
        }

        const orgsWithCounts = filteredOrgs.map((org) => ({
          ...org,
          member_count: memberCountMap.get(org.id) ?? 0,
        }));

        const tree = this.buildTree(orgsWithCounts, rootId);
        
        // 写入缓存
        memoryCache.set(cacheKey, tree, memoryCache.ORG_TTL);
        
        return tree;
      } finally {
        this.orgTreePromises.delete(promiseKey);
      }
    })();

    this.orgTreePromises.set(promiseKey, promise);
    return promise;
  }

  async getOrganizationChildren(parentId: string): Promise<Organization[]> {
    const { data, error } = await supabase
      .from('organizations')
      .select('*')
      .eq('parent_id', parentId)
      .order('display_name', { ascending: true });

    if (error) throw new Error('Failed to get organization children: ' + error.message);
    return data;
  }

  async getOrganizationAncestors(id: string): Promise<Organization[]> {
    const { data: org, error: orgError } = await supabase
      .from('organizations')
      .select('path')
      .eq('id', id)
      .maybeSingle();

    if (orgError || !org) throw new Error('Organization not found');

    const pathParts = org.path.split('.');
    const ancestorPaths = [];
    for (let i = 0; i < pathParts.length - 1; i++) {
      ancestorPaths.push(pathParts.slice(0, i + 1).join('.'));
    }

    if (ancestorPaths.length === 0) return [];

    const { data, error } = await supabase
      .from('organizations')
      .select('*')
      .in('path', ancestorPaths)
      .order('level', { ascending: true });

    if (error) throw new Error('Failed to get ancestors: ' + error.message);
    return data;
  }

  async getUserOrganizationInfo(userId: string): Promise<UserOrganizationInfo> {
    const cacheKey = `${memoryCache.KEYS.USER_ORG_INFO}${userId}`;
    const cached = memoryCache.get<UserOrganizationInfo>(cacheKey);
    if (cached) {
      return cached;
    }

    if (this.userOrgInfoPromises.has(userId)) {
      return this.userOrgInfoPromises.get(userId)!;
    }

    const promise = (async () => {
      try {
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('organization_id, role')
          .eq('id', userId)
          .maybeSingle();

        if (profileError) throw new Error('Failed to get user profile');

        if (!profile || !profile.organization_id) {
          const info: UserOrganizationInfo = {
            organization: null,
            ancestors: [],
            role: profile?.role || 'member',
          };
          memoryCache.set(cacheKey, info, memoryCache.PROFILE_TTL);
          return info;
        }

        const organization = await this.getOrganization(profile.organization_id);
        const ancestors = await this.getOrganizationAncestors(profile.organization_id);

        const info: UserOrganizationInfo = {
          organization,
          ancestors,
          role: profile.role,
        };

        memoryCache.set(cacheKey, info, memoryCache.PROFILE_TTL);
        return info;
      } finally {
        this.userOrgInfoPromises.delete(userId);
      }
    })();

    this.userOrgInfoPromises.set(userId, promise);
    return promise;
  }

  async getOrganizationMembers(organizationId: string): Promise<Profile[]> {
    // 检查缓存 (Epic-18)
    const cacheKey = `${memoryCache.KEYS.ORG_MEMBERS}${organizationId}`;
    const cached = memoryCache.get<Profile[]>(cacheKey);
    if (cached) {
      return cached;
    }

    if (this.orgMembersPromises.has(organizationId)) {
      return this.orgMembersPromises.get(organizationId)!;
    }

    const promise = (async () => {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('organization_id', organizationId)
          .eq('is_active', true)
          .order('full_name', { ascending: true });

        if (error) throw new Error('Failed to get organization members: ' + error.message);
        memoryCache.set(cacheKey, data || [], memoryCache.PROFILE_TTL);
        return data || [];
      } finally {
        this.orgMembersPromises.delete(organizationId);
      }
    })();

    this.orgMembersPromises.set(organizationId, promise);
    return promise;
  }

  async getOrganizationMemberNames(organizationId: string): Promise<string[]> {
    // 复用 getOrganizationMembers 的缓存
    const members = await this.getOrganizationMembers(organizationId);
    return members.map(p => p.full_name).filter(Boolean) as string[];
  }

  async updateUserOrganization(
    userId: string,
    organizationId: string | null,
    operatorId: string
  ): Promise<void> {
    const { data: operator, error: operatorError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', operatorId)
      .maybeSingle();

    if (operatorError) throw new Error('Failed to get operator profile');
    if (!operator || operator.role !== 'admin') throw new Error('Permission denied: Only admins can update user organization');

    const { error } = await supabase
      .from('profiles')
      .update({ organization_id: organizationId })
      .eq('id', userId);

    if (error) throw new Error('Failed to update user organization: ' + error.message);
    
    // 失效相关缓存 (Epic-18)
    memoryCache.invalidateOrganizations();
    memoryCache.invalidateProfiles();
  }

  async addMemberToOrganization(
    userId: string,
    organizationId: string,
    role: 'manager' | 'member',
    operatorId: string
  ): Promise<void> {
    const { data: operator, error: operatorError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', operatorId)
      .maybeSingle();

    if (operatorError) throw new Error('Failed to get operator profile');
    if (!operator || operator.role !== 'admin') {
      throw new Error('Permission denied: Only admins can add members');
    }

    const { error } = await supabase
      .from('profiles')
      .update({ 
        organization_id: organizationId,
        role: role,
      })
      .eq('id', userId);

    if (error) throw new Error('Failed to add member: ' + error.message);
    
    // 失效相关缓存 (Epic-18)
    memoryCache.invalidateOrganizations(); // 组织成员计数会变化
    memoryCache.invalidateProfiles(); // 用户资料变化
  }

  async removeMemberFromOrganization(userId: string, operatorId: string): Promise<void> {
    const { data: operator, error: operatorError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', operatorId)
      .maybeSingle();

    if (operatorError) throw new Error('Failed to get operator profile');
    if (!operator || operator.role !== 'admin') {
      throw new Error('Permission denied: Only admins can remove members');
    }

    const { error } = await supabase
      .from('profiles')
      .update({ 
        organization_id: null,
        role: 'member',
      })
      .eq('id', userId);

    if (error) throw new Error('Failed to remove member: ' + error.message);
    
    // 失效相关缓存 (Epic-18)
    memoryCache.invalidateOrganizations();
    memoryCache.invalidateProfiles();
  }

  async updateUserRole(
    userId: string,
    newRole: 'manager' | 'member',
    operatorId: string
  ): Promise<void> {
    const { data: operator, error: operatorError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', operatorId)
      .maybeSingle();

    if (operatorError) throw new Error('Failed to get operator profile');
    if (!operator || operator.role !== 'admin') {
      throw new Error('Permission denied: Only admins can change user roles');
    }

    const { data: targetUser, error: targetError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .maybeSingle();

    if (targetError) throw new Error('Failed to get target user');
    if (targetUser?.role === 'admin') {
      throw new Error('Cannot change admin role through API. Please use Supabase Dashboard directly for security.');
    }

    const { error } = await supabase
      .from('profiles')
      .update({ role: newRole })
      .eq('id', userId);

    if (error) throw new Error('Failed to update user role: ' + error.message);
    
    // 失效相关缓存 (Epic-18)
    memoryCache.invalidateProfiles();
  }

  async getAllUsers(): Promise<Profile[]> {
    // 检查缓存 (Epic-18)
    const cached = memoryCache.get<Profile[]>(memoryCache.KEYS.ALL_USERS);
    if (cached) {
      return cached;
    }

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('is_active', true)
      .order('full_name', { ascending: true });

    if (error) throw new Error('Failed to get users: ' + error.message);
    
    // 写入缓存
    memoryCache.set(memoryCache.KEYS.ALL_USERS, data, memoryCache.PROFILE_TTL);
    
    return data;
  }

  async searchUsers(query: string): Promise<Profile[]> {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('is_active', true)
      .or(`full_name.ilike.%${query}%,email.ilike.%${query}%`)
      .order('full_name', { ascending: true })
      .limit(20);

    if (error) throw new Error('Failed to search users: ' + error.message);
    return data;
  }

  async getUploadableOrganizations(userId: string): Promise<Organization[]> {
    const cacheKey = `org:uploadable:${userId}`;
    
    return memoryCache.getOrFetch(cacheKey, async () => {
      const { data, error } = await supabase
        .rpc('get_user_uploadable_organizations', { user_uuid: userId });

      if (error) throw new Error('Failed to get uploadable organizations: ' + error.message);
      
      if (!data || data.length === 0) return [];

      const orgIds = data.map((row: { organization_id: string }) => row.organization_id);
      
      const { data: orgs, error: orgsError } = await supabase
        .from('organizations')
        .select('*')
        .in('id', orgIds)
        .order('path', { ascending: true });

      if (orgsError) throw new Error('Failed to fetch organization details: ' + orgsError.message);

      return orgs || [];
    }, memoryCache.ORG_TTL);
  }

  async getViewableOrganizations(userId: string): Promise<Organization[]> {
    // 使用与 getUploadableOrganizations 相同的逻辑
    // 用户可以查看其所属组织及子组织的照片
    return this.getUploadableOrganizations(userId);
  }

  private buildTree(
    organizations: (Organization & { member_count?: number })[],
    rootId?: string
  ): OrganizationTreeNode[] {
    const orgMap = new Map<string, OrganizationTreeNode>();
    const rootNodes: OrganizationTreeNode[] = [];

    organizations.forEach(org => {
      const node: OrganizationTreeNode = {
        ...org,
        children: [],
        member_count: org.member_count || 0,
      };
      orgMap.set(org.id, node);
    });

    organizations.forEach(org => {
      const node = orgMap.get(org.id)!;
      if (org.parent_id && orgMap.has(org.parent_id)) {
        const parent = orgMap.get(org.parent_id)!;
        if (!parent.children) parent.children = [];
        parent.children.push(node);
      } else if (!rootId || org.id === rootId) {
        rootNodes.push(node);
      }
    });

    return rootNodes;
  }

  private async updateDescendantPaths(organizationId: string): Promise<void> {
    const { data: org, error: orgError } = await supabase
      .from('organizations')
      .select('*')
      .eq('id', organizationId)
      .maybeSingle();

    if (orgError || !org) throw new Error('Organization not found');

    const { data: descendants, error: descError } = await supabase
      .from('organizations')
      .select('*')
      .like('path', `${org.path}.%`);

    if (descError) throw new Error('Failed to get descendants');

    const updates = descendants.map(desc => {
      const suffix = desc.path.substring(org.path.length);
      return {
        id: desc.id,
        path: org.path + suffix,
      };
    });

    for (const update of updates) {
      await supabase
        .from('organizations')
        .update({ path: update.path })
        .eq('id', update.id);
    }
  }
}

export const organizationService = new OrganizationService();