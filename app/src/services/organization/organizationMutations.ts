/**
 * 组织变更服务 - 写操作
 *
 * 提供组织创建、更新、删除以及成员管理等变更操作。
 * 所有变更操作完成后自动失效相关缓存。
 */

import { supabase } from '@/lib/supabase/client'
import { memoryCache } from '@/services/cache/memoryCache'
import type {
  Organization,
  CreateOrganizationInput,
  UpdateOrganizationInput,
} from '@/lib/supabase/organizationTypes'

export class OrganizationMutations {
  async createOrganization(input: CreateOrganizationInput, _userId: string): Promise<Organization> {
    void _userId
    const { data: newOrgId, error: rpcError } = await supabase.rpc('admin_create_organization', {
      p_name: input.name,
      p_display_name: input.display_name,
      p_description: input.description || null,
      p_parent_id: input.parent_id || null,
    })

    if (rpcError) throw new Error('Failed to create organization: ' + rpcError.message)

    const { data: org, error: fetchError } = await supabase
      .from('organizations')
      .select('*')
      .eq('id', newOrgId)
      .single()

    if (fetchError) throw new Error('Failed to fetch created organization: ' + fetchError.message)

    memoryCache.invalidateOrganizations()
    return org
  }

  async updateOrganization(
    id: string,
    input: UpdateOrganizationInput,
    userId: string
  ): Promise<Organization> {
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .maybeSingle()

    if (profileError) throw new Error('Failed to get user profile')
    if (!profile || profile.role !== 'admin')
      throw new Error('Permission denied: Only admins can update organizations')

    const updateData: Record<string, string | null> = {}
    if (input.name !== undefined) updateData.name = input.name
    if (input.display_name !== undefined) updateData.display_name = input.display_name
    if (input.description !== undefined) updateData.description = input.description

    const { data, error } = await supabase
      .from('organizations')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) throw new Error('Failed to update organization: ' + error.message)

    if (input.name) {
      await this.updateDescendantPaths(id)
    }

    memoryCache.invalidateOrganizations()
    return data
  }

  async deleteOrganization(id: string, _userId: string): Promise<void> {
    void _userId
    const { error } = await supabase.rpc('admin_delete_organization', { p_org_id: id })

    if (error) throw new Error('Failed to delete organization: ' + error.message)
    memoryCache.invalidateOrganizations()
  }

  async updateUserOrganization(
    userId: string,
    organizationId: string | null,
    operatorId: string
  ): Promise<void> {
    await this.requireAdmin(operatorId)

    const { error } = await supabase
      .from('profiles')
      .update({ organization_id: organizationId })
      .eq('id', userId)

    if (error) throw new Error('Failed to update user organization: ' + error.message)
    memoryCache.invalidateOrganizations()
    memoryCache.invalidateProfiles()
  }

  async addMemberToOrganization(
    userId: string,
    organizationId: string,
    role: 'manager' | 'member',
    operatorId: string
  ): Promise<void> {
    await this.requireAdmin(operatorId)

    const { error } = await supabase
      .from('profiles')
      .update({
        organization_id: organizationId,
        role: role,
      })
      .eq('id', userId)

    if (error) throw new Error('Failed to add member: ' + error.message)
    memoryCache.invalidateOrganizations()
    memoryCache.invalidateProfiles()
  }

  async removeMemberFromOrganization(userId: string, operatorId: string): Promise<void> {
    await this.requireAdmin(operatorId)

    const { error } = await supabase
      .from('profiles')
      .update({
        organization_id: null,
        role: 'member',
      })
      .eq('id', userId)

    if (error) throw new Error('Failed to remove member: ' + error.message)
    memoryCache.invalidateOrganizations()
    memoryCache.invalidateProfiles()
  }

  async updateUserRole(
    userId: string,
    newRole: 'manager' | 'member',
    operatorId: string
  ): Promise<void> {
    await this.requireAdmin(operatorId)

    const { data: targetUser, error: targetError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .maybeSingle()

    if (targetError) throw new Error('Failed to get target user')
    if (targetUser?.role === 'admin') {
      throw new Error(
        'Cannot change admin role through API. Please use Supabase Dashboard directly for security.'
      )
    }

    const { error } = await supabase.from('profiles').update({ role: newRole }).eq('id', userId)

    if (error) throw new Error('Failed to update user role: ' + error.message)
    memoryCache.invalidateProfiles()
  }

  private async requireAdmin(operatorId: string): Promise<void> {
    const { data: operator, error: operatorError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', operatorId)
      .maybeSingle()

    if (operatorError) throw new Error('Failed to get operator profile')
    if (!operator || operator.role !== 'admin') {
      throw new Error('Permission denied: Only admins can perform this action')
    }
  }

  private async updateDescendantPaths(organizationId: string): Promise<void> {
    const { data: org, error: orgError } = await supabase
      .from('organizations')
      .select('*')
      .eq('id', organizationId)
      .maybeSingle()

    if (orgError || !org) throw new Error('Organization not found')

    const { data: descendants, error: descError } = await supabase
      .from('organizations')
      .select('*')
      .like('path', `${org.path}.%`)

    if (descError) throw new Error('Failed to get descendants')

    const updates = descendants.map((desc) => {
      const suffix = desc.path.substring(org.path.length)
      return {
        id: desc.id,
        path: org.path + suffix,
      }
    })

    for (const update of updates) {
      await supabase.from('organizations').update({ path: update.path }).eq('id', update.id)
    }
  }
}
