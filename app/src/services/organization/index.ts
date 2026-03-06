/**
 * 组织服务 - 统一导出门面
 *
 * 将查询和变更操作组合为单一服务实例，对外保持 API 不变。
 * 查询操作见 organizationQueries.ts，变更操作见 organizationMutations.ts。
 */

import { OrganizationQueries } from './organizationQueries'
import { OrganizationMutations } from './organizationMutations'
import type {
  Organization,
  CreateOrganizationInput,
  UpdateOrganizationInput,
  OrganizationTreeNode,
  UserOrganizationInfo,
  Profile,
} from '@/lib/supabase/organizationTypes'

class OrganizationService {
  private queries = new OrganizationQueries()
  private mutations = new OrganizationMutations()

  async createOrganization(input: CreateOrganizationInput, userId: string): Promise<Organization> {
    return this.mutations.createOrganization(input, userId)
  }
  async updateOrganization(
    id: string,
    input: UpdateOrganizationInput,
    userId: string
  ): Promise<Organization> {
    return this.mutations.updateOrganization(id, input, userId)
  }
  async deleteOrganization(id: string, userId: string): Promise<void> {
    return this.mutations.deleteOrganization(id, userId)
  }
  async getOrganization(id: string): Promise<Organization | null> {
    return this.queries.getOrganization(id)
  }
  async getOrganizationTree(rootId?: string): Promise<OrganizationTreeNode[]> {
    return this.queries.getOrganizationTree(rootId)
  }
  async getOrganizationChildren(parentId: string): Promise<Organization[]> {
    return this.queries.getOrganizationChildren(parentId)
  }
  async getOrganizationAncestors(id: string): Promise<Organization[]> {
    return this.queries.getOrganizationAncestors(id)
  }
  async getUserOrganizationInfo(userId: string): Promise<UserOrganizationInfo> {
    return this.queries.getUserOrganizationInfo(userId)
  }
  async getOrganizationMembers(organizationId: string): Promise<Profile[]> {
    return this.queries.getOrganizationMembers(organizationId)
  }
  async getOrganizationMemberNames(organizationId: string): Promise<string[]> {
    return this.queries.getOrganizationMemberNames(organizationId)
  }
  async updateUserOrganization(
    userId: string,
    organizationId: string | null,
    operatorId: string
  ): Promise<void> {
    return this.mutations.updateUserOrganization(userId, organizationId, operatorId)
  }
  async addMemberToOrganization(
    userId: string,
    organizationId: string,
    role: 'manager' | 'member',
    operatorId: string
  ): Promise<void> {
    return this.mutations.addMemberToOrganization(userId, organizationId, role, operatorId)
  }
  async removeMemberFromOrganization(userId: string, operatorId: string): Promise<void> {
    return this.mutations.removeMemberFromOrganization(userId, operatorId)
  }
  async updateUserRole(
    userId: string,
    newRole: 'manager' | 'member',
    operatorId: string
  ): Promise<void> {
    return this.mutations.updateUserRole(userId, newRole, operatorId)
  }
  async getAllUsers(): Promise<Profile[]> {
    return this.queries.getAllUsers()
  }
  async searchUsers(query: string): Promise<Profile[]> {
    return this.queries.searchUsers(query)
  }
  async getUploadableOrganizations(userId: string): Promise<Organization[]> {
    return this.queries.getUploadableOrganizations(userId)
  }
  async getViewableOrganizations(userId: string): Promise<Organization[]> {
    return this.queries.getViewableOrganizations(userId)
  }
}

export const organizationService = new OrganizationService()
