/**
 * ChangeRoleDialog - 修改角色对话框
 * @description 变更组织成员角色（admin/manager/member），包含角色说明
 */
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Shield, ChevronDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import type { Profile } from '@/lib/supabase/organizationTypes'

interface ChangeRoleDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  member: Profile | null
  onChangeRole: (userId: string, newRole: 'manager' | 'member') => Promise<void>
}

const roleKeys = {
  admin: 'admin',
  manager: 'manager',
  member: 'member',
} as const

export function ChangeRoleDialog({
  open,
  onOpenChange,
  member,
  onChangeRole,
}: ChangeRoleDialogProps) {
  const { t } = useTranslation('components')
  const { t: tCommon } = useTranslation('common')
  const [selectedRole, setSelectedRole] = useState<'manager' | 'member'>(
    member?.role === 'admin' ? 'member' : ((member?.role || 'member') as 'manager' | 'member')
  )
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!member) return

    setIsSubmitting(true)
    try {
      await onChangeRole(member.id, selectedRole)
      onOpenChange(false)
    } catch (error) {
      console.error('Failed to change role:', error)
      alert(error instanceof Error ? error.message : t('organization.changeRole.changeFailed'))
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!member) return null

  const isCurrentlyAdmin = member.role === 'admin'

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{t('organization.changeRole.title')}</DialogTitle>
            <DialogDescription>
              {t('organization.changeRole.description', { name: member.full_name })}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="p-4 bg-accent/50 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-linear-to-br from-avatar-from to-avatar-to flex items-center justify-center text-white font-semibold">
                  {member.full_name ? member.full_name.charAt(0).toUpperCase() : '?'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium">{member.full_name || t('organization.unnamed')}</p>
                  <p className="text-sm text-muted-foreground">
                    {t('organization.changeRole.currentRole', {
                      role: t(`organization.roles.${roleKeys[member.role]}`),
                    })}
                  </p>
                </div>
              </div>
            </div>

            {isCurrentlyAdmin ? (
              <div className="p-4 bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-lg space-y-2">
                <div className="text-sm text-amber-800 dark:text-amber-200">
                  {t('organization.adminChangeWarning')}
                </div>
                <div className="text-sm text-amber-700 dark:text-amber-300">
                  {t('organization.adminChangeInstruction')}
                </div>
                <pre className="p-2 bg-amber-100 dark:bg-amber-900 rounded text-xs overflow-x-auto">
                  UPDATE profiles {'\n'}
                  SET role = 'member'{'\n'} -- 或 'manager'{'\n'}
                  WHERE id = '{member.id}';
                </pre>
              </div>
            ) : (
              <div className="space-y-2">
                <Label htmlFor="role">{t('organization.changeRole.newRoleLabel')}</Label>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" className="w-full justify-between">
                      {t(`organization.roles.${selectedRole}`)}
                      <ChevronDown className="h-4 w-4 opacity-50" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-full">
                    <DropdownMenuItem onClick={() => setSelectedRole('member')}>
                      {t('organization.roles.member')}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setSelectedRole('manager')}>
                      {t('organization.roles.manager')}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                <p className="text-xs text-muted-foreground">
                  {t(`organization.roleDescriptions.${selectedRole}`)}
                </p>
                <p className="text-xs text-amber-600">{t('organization.adminRoleHint')}</p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              {isCurrentlyAdmin ? tCommon('close') : tCommon('cancel')}
            </Button>
            {!isCurrentlyAdmin && (
              <Button type="submit" disabled={isSubmitting || selectedRole === member.role}>
                {isSubmitting ? (
                  t('organization.changeRole.changing')
                ) : (
                  <>
                    <Shield className="h-4 w-4 mr-2" />
                    {t('organization.changeRole.submit')}
                  </>
                )}
              </Button>
            )}
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
