import { useState, useCallback, useEffect } from 'react';
import { organizationService } from '@/services/organizationService';
import type {
  Organization,
  OrganizationTreeNode,
  Profile,
  CreateOrganizationInput,
  UpdateOrganizationInput,
  UserOrganizationInfo,
} from '@/lib/supabase/organizationTypes';

export interface UseOrganizationResult {
  tree: OrganizationTreeNode[];
  selectedOrg: Organization | null;
  members: Profile[];
  userOrgInfo: UserOrganizationInfo | null;
  uploadableOrgs: Organization[];
  isLoading: boolean;
  error: string | null;
  loadTree: (rootId?: string) => Promise<void>;
  selectOrganization: (org: Organization) => void;
  loadMembers: (orgId: string) => Promise<void>;
  createOrganization: (input: CreateOrganizationInput) => Promise<Organization>;
  updateOrganization: (id: string, input: UpdateOrganizationInput) => Promise<Organization>;
  deleteOrganization: (id: string) => Promise<void>;
  updateUserOrganization: (userId: string, organizationId: string | null) => Promise<void>;
  getMemberNames: (orgId: string) => Promise<string[]>;
  getUserOrgInfo: (userId: string) => Promise<void>;
  addMember: (userId: string, orgId: string, role: 'manager' | 'member') => Promise<void>;
  removeMember: (userId: string) => Promise<void>;
  changeRole: (userId: string, newRole: 'manager' | 'member') => Promise<void>;
  getAllUsers: () => Promise<Profile[]>;
  searchUsers: (query: string) => Promise<Profile[]>;
  loadUploadableOrgs: () => Promise<void>;
}

const CACHE_TTL = 5 * 60 * 1000; // 5 minutes
const ORG_TREE_CACHE_KEY = 'org-tree:v1';
const UPLOADABLE_ORG_CACHE_PREFIX = 'uploadable-orgs:v1:';

function readCache<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { ts: number; data: T };
    if (!parsed || typeof parsed.ts !== 'number') return null;
    if (Date.now() - parsed.ts > CACHE_TTL) return null;
    return parsed.data;
  } catch {
    return null;
  }
}

function writeCache<T>(key: string, data: T): void {
  try {
    localStorage.setItem(key, JSON.stringify({ ts: Date.now(), data }));
  } catch {
    // ignore write failures (e.g., storage quota)
  }
}

export function useOrganization(userId: string): UseOrganizationResult {
  const [tree, setTree] = useState<OrganizationTreeNode[]>([]);
  const [selectedOrg, setSelectedOrg] = useState<Organization | null>(null);
  const [members, setMembers] = useState<Profile[]>([]);
  const [userOrgInfo, setUserOrgInfo] = useState<UserOrganizationInfo | null>(null);
  const [uploadableOrgs, setUploadableOrgs] = useState<Organization[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadTree = useCallback(async (rootId?: string) => {
    try {
      setIsLoading(true);
      setError(null);
      // 仅缓存完整树（无 rootId）
      if (!rootId) {
        const cachedTree = readCache<OrganizationTreeNode[]>(ORG_TREE_CACHE_KEY);
        if (cachedTree && cachedTree.length > 0) {
          setTree(cachedTree);
          setIsLoading(false);
          return;
        }
      }

      const treeData = await organizationService.getOrganizationTree(rootId);
      setTree(treeData);

      if (!rootId && treeData.length > 0) {
        writeCache(ORG_TREE_CACHE_KEY, treeData);
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to load organization tree';
      setError(errorMsg);
      console.error('Failed to load tree:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const selectOrganization = useCallback((org: Organization) => {
    setSelectedOrg(org);
  }, []);

  const loadMembers = useCallback(async (orgId: string) => {
    try {
      setIsLoading(true);
      setError(null);
      const membersData = await organizationService.getOrganizationMembers(orgId);
      setMembers(membersData);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to load members';
      setError(errorMsg);
      console.error('Failed to load members:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const createOrganization = useCallback(
    async (input: CreateOrganizationInput): Promise<Organization> => {
      try {
        setIsLoading(true);
        setError(null);
        const org = await organizationService.createOrganization(input, userId);
        await loadTree();
        return org;
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Failed to create organization';
        setError(errorMsg);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [userId, loadTree]
  );

  const updateOrganization = useCallback(
    async (id: string, input: UpdateOrganizationInput): Promise<Organization> => {
      try {
        setIsLoading(true);
        setError(null);
        const org = await organizationService.updateOrganization(id, input, userId);
        await loadTree();
        return org;
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Failed to update organization';
        setError(errorMsg);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [userId, loadTree]
  );

  const deleteOrganization = useCallback(
    async (id: string): Promise<void> => {
      try {
        setIsLoading(true);
        setError(null);
        await organizationService.deleteOrganization(id, userId);
        await loadTree();
        if (selectedOrg?.id === id) {
          setSelectedOrg(null);
          setMembers([]);
        }
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Failed to delete organization';
        setError(errorMsg);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [userId, loadTree, selectedOrg]
  );

  const updateUserOrganization = useCallback(
    async (targetUserId: string, organizationId: string | null): Promise<void> => {
      try {
        setIsLoading(true);
        setError(null);
        await organizationService.updateUserOrganization(targetUserId, organizationId, userId);
        if (selectedOrg) {
          await loadMembers(selectedOrg.id);
        }
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Failed to update user organization';
        setError(errorMsg);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [userId, selectedOrg, loadMembers]
  );

  const getMemberNames = useCallback(async (orgId: string): Promise<string[]> => {
    try {
      return await organizationService.getOrganizationMemberNames(orgId);
    } catch (err) {
      console.error('Failed to get member names:', err);
      return [];
    }
  }, []);

  const getUserOrgInfo = useCallback(
    async (targetUserId: string): Promise<void> => {
      try {
        setIsLoading(true);
        setError(null);
        const info = await organizationService.getUserOrganizationInfo(targetUserId);
        setUserOrgInfo(info);
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Failed to get user org info';
        setError(errorMsg);
        console.error('Failed to get user org info:', err);
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  const addMember = useCallback(
    async (targetUserId: string, orgId: string, role: 'manager' | 'member'): Promise<void> => {
      try {
        setIsLoading(true);
        setError(null);
        await organizationService.addMemberToOrganization(targetUserId, orgId, role, userId);
        if (selectedOrg?.id === orgId) {
          await loadMembers(orgId);
        }
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Failed to add member';
        setError(errorMsg);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [userId, selectedOrg, loadMembers]
  );

  const removeMember = useCallback(
    async (targetUserId: string): Promise<void> => {
      try {
        setIsLoading(true);
        setError(null);
        await organizationService.removeMemberFromOrganization(targetUserId, userId);
        if (selectedOrg) {
          await loadMembers(selectedOrg.id);
        }
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Failed to remove member';
        setError(errorMsg);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [userId, selectedOrg, loadMembers]
  );

  const changeRole = useCallback(
    async (targetUserId: string, newRole: 'manager' | 'member'): Promise<void> => {
      try {
        setIsLoading(true);
        setError(null);
        await organizationService.updateUserRole(targetUserId, newRole, userId);
        if (selectedOrg) {
          await loadMembers(selectedOrg.id);
        }
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Failed to change role';
        setError(errorMsg);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [userId, selectedOrg, loadMembers]
  );

  const getAllUsers = useCallback(async (): Promise<Profile[]> => {
    try {
      return await organizationService.getAllUsers();
    } catch (err) {
      console.error('Failed to get all users:', err);
      return [];
    }
  }, []);

  const searchUsers = useCallback(async (query: string): Promise<Profile[]> => {
    try {
      return await organizationService.searchUsers(query);
    } catch (err) {
      console.error('Failed to search users:', err);
      return [];
    }
  }, []);

  const loadUploadableOrgs = useCallback(async (): Promise<void> => {
    try {
      setIsLoading(true);
      setError(null);
      const cacheKey = `${UPLOADABLE_ORG_CACHE_PREFIX}${userId}`;
      const cached = readCache<Organization[]>(cacheKey);
      if (cached && cached.length > 0) {
        setUploadableOrgs(cached);
        setIsLoading(false);
        return;
      }

      const orgs = await organizationService.getUploadableOrganizations(userId);
      setUploadableOrgs(orgs);

      if (orgs.length > 0) {
        writeCache(cacheKey, orgs);
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to load uploadable organizations';
      setError(errorMsg);
      console.error('Failed to load uploadable organizations:', err);
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    if (selectedOrg) {
      loadMembers(selectedOrg.id);
    }
  }, [selectedOrg, loadMembers]);

  return {
    tree,
    selectedOrg,
    members,
    userOrgInfo,
    uploadableOrgs,
    isLoading,
    error,
    loadTree,
    selectOrganization,
    loadMembers,
    createOrganization,
    updateOrganization,
    deleteOrganization,
    updateUserOrganization,
    getMemberNames,
    getUserOrgInfo,
    addMember,
    removeMember,
    changeRole,
    getAllUsers,
    searchUsers,
    loadUploadableOrgs,
  };
}