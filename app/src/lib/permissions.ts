export type UserRole = 'admin' | 'manager' | 'member';

export interface PermissionConfig {
  minRole: UserRole;
  description?: string;
}

const roleHierarchy: Record<UserRole, number> = {
  admin: 3,
  manager: 2,
  member: 1,
};

export function hasPermission(userRole: UserRole, requiredRole: UserRole): boolean {
  return roleHierarchy[userRole] >= roleHierarchy[requiredRole];
}

export const permissions = {
  organization: {
    create: { minRole: 'admin' as UserRole, description: 'Create organization' },
    update: { minRole: 'admin' as UserRole, description: 'Update organization' },
    delete: { minRole: 'admin' as UserRole, description: 'Delete organization' },
    viewAll: { minRole: 'member' as UserRole, description: 'View organization tree' },
  },
  member: {
    add: { minRole: 'admin' as UserRole, description: 'Add member to organization' },
    remove: { minRole: 'admin' as UserRole, description: 'Remove member from organization' },
    changeRole: { minRole: 'admin' as UserRole, description: 'Change member role' },
    assignTeam: { minRole: 'admin' as UserRole, description: 'Assign team to member' },
  },
  photo: {
    upload: { minRole: 'member' as UserRole, description: 'Upload photos' },
    editOwn: { minRole: 'member' as UserRole, description: 'Edit own photos' },
    editAny: { minRole: 'admin' as UserRole, description: 'Edit any photo' },
    deleteOwn: { minRole: 'member' as UserRole, description: 'Delete own photos' },
    deleteAny: { minRole: 'admin' as UserRole, description: 'Delete any photo' },
  },
} as const;

export function checkPermission(
  userRole: UserRole,
  permission: PermissionConfig
): { allowed: boolean; message?: string } {
  const allowed = hasPermission(userRole, permission.minRole);
  return {
    allowed,
    message: allowed
      ? undefined
      : `需要 ${getRoleLabel(permission.minRole)} 权限`,
  };
}

export function getRoleLabel(role: UserRole): string {
  switch (role) {
    case 'admin':
      return '管理员';
    case 'manager':
      return '经理';
    case 'member':
      return '成员';
  }
}

export function canManageOrganization(userRole: UserRole): boolean {
  return hasPermission(userRole, 'admin');
}

export function canManageMembers(userRole: UserRole): boolean {
  return hasPermission(userRole, 'admin');
}

export function canEditPhoto(userRole: UserRole, isOwner: boolean): boolean {
  if (isOwner) {
    return hasPermission(userRole, 'member');
  }
  return hasPermission(userRole, 'admin');
}

export function canDeletePhoto(userRole: UserRole, isOwner: boolean): boolean {
  if (isOwner) {
    return hasPermission(userRole, 'member');
  }
  return hasPermission(userRole, 'admin');
}
