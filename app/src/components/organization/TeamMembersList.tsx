/**
 * TeamMembersList - 团队成员列表组件
 * @description 展示团队成员及角色，支持移除成员、修改角色和分配团队操作
 */
import { UserMinus, UserPlus, Shield, User } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import type { Profile } from '@/lib/supabase/organizationTypes'

interface TeamMembersListProps {
  members: Profile[]
  organizationName: string
  currentUserId: string
  currentUserRole: 'admin' | 'manager' | 'member'
  onAddMember?: () => void
  onRemoveMember?: (member: Profile) => void
  onChangeRole?: (member: Profile) => void
  className?: string
}

function getRoleBadge(role: 'admin' | 'manager' | 'member', t: (key: string) => string) {
  switch (role) {
    case 'admin':
      return (
        <Badge variant="destructive" className="gap-1">
          <Shield className="h-3 w-3" />
          <span>{t('organization.roles.admin')}</span>
        </Badge>
      )
    case 'manager':
      return (
        <Badge variant="default" className="gap-1">
          <UserPlus className="h-3 w-3" />
          <span>{t('organization.roles.manager')}</span>
        </Badge>
      )
    case 'member':
      return (
        <Badge variant="secondary" className="gap-1">
          <User className="h-3 w-3" />
          <span>{t('organization.roles.member')}</span>
        </Badge>
      )
  }
}

export function TeamMembersList({
  members,
  organizationName,
  currentUserId,
  currentUserRole,
  onAddMember,
  onRemoveMember,
  onChangeRole,
  className,
}: TeamMembersListProps) {
  const { t } = useTranslation('components')
  const canManageMembers = currentUserRole === 'admin'
  const activeMembers = members.filter((m) => m.is_active)

  return (
    <div className={cn('flex flex-col h-full', className)}>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-xl font-semibold">{organizationName}</h2>
          <p className="text-sm text-muted-foreground">
            {t('organization.memberCount', { count: activeMembers.length })}
          </p>
        </div>
        {canManageMembers && onAddMember && (
          <Button onClick={onAddMember} size="sm">
            <UserPlus className="h-4 w-4 mr-2" />
            {t('organization.addMember')}
          </Button>
        )}
      </div>

      {activeMembers.length === 0 ? (
        <div className="flex-1 flex items-center justify-center text-muted-foreground">
          <p className="text-sm">{t('organization.noMembers')}</p>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto">
          <div className="space-y-2">
            {activeMembers.map((member) => {
              const isCurrentUser = member.id === currentUserId
              return (
                <div
                  key={member.id}
                  className={cn(
                    'flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors',
                    isCurrentUser && 'border-primary'
                  )}
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="flex-shrink-0 w-10 h-10 rounded-full bg-linear-to-br from-avatar-from to-avatar-to flex items-center justify-center text-white font-semibold">
                      {member.full_name ? member.full_name.charAt(0).toUpperCase() : '?'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium truncate">
                          {member.full_name || t('organization.unnamed')}
                        </p>
                        {isCurrentUser && (
                          <Badge variant="outline" className="text-xs">
                            {t('organization.me')}
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground truncate">{member.id}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    {getRoleBadge(member.role, t)}

                    {canManageMembers && !isCurrentUser && (
                      <div className="flex gap-1">
                        {onChangeRole && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onChangeRole(member)}
                            title={t('organization.changeRoleTitle', {
                              role: t(`organization.roles.${member.role}`),
                            })}
                          >
                            <Shield className="h-4 w-4" />
                          </Button>
                        )}
                        {onRemoveMember && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onRemoveMember(member)}
                            title={t('organization.removeMemberTitle')}
                          >
                            <UserMinus className="h-4 w-4 text-destructive" />
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
