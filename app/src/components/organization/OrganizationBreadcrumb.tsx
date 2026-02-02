import { ChevronRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import type { Organization } from '@/lib/supabase/organizationTypes';

interface OrganizationBreadcrumbProps {
  ancestors: Organization[];
  currentOrg: Organization | null;
  role: 'admin' | 'manager' | 'member';
  className?: string;
}

function getRoleBadgeVariant(role: 'admin' | 'manager' | 'member') {
  switch (role) {
    case 'admin':
      return 'destructive';
    case 'manager':
      return 'default';
    case 'member':
      return 'secondary';
  }
}

function getRoleLabel(role: 'admin' | 'manager' | 'member'): string {
  switch (role) {
    case 'admin':
      return '管理员';
    case 'manager':
      return '经理';
    case 'member':
      return '成员';
  }
}

export function OrganizationBreadcrumb({
  ancestors,
  currentOrg,
  role,
  className = '',
}: OrganizationBreadcrumbProps) {
  if (!currentOrg) {
    return (
      <div className={className}>
        <p className="text-sm text-muted-foreground">未分配组织</p>
      </div>
    );
  }

  const allOrgs = [...ancestors, currentOrg];

  return (
    <div className={className}>
      <div className="flex items-center flex-wrap gap-2">
        {allOrgs.map((org, index) => (
          <div key={org.id} className="flex items-center gap-2">
            {index > 0 && <ChevronRight className="h-4 w-4 text-muted-foreground" />}
            <span
              className={
                index === allOrgs.length - 1
                  ? 'font-medium text-foreground'
                  : 'text-muted-foreground'
              }
            >
              {org.display_name}
            </span>
          </div>
        ))}
        <Badge variant={getRoleBadgeVariant(role)} className="ml-2">
          {getRoleLabel(role)}
        </Badge>
      </div>
    </div>
  );
}
