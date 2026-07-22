/**
 * AddMemberDialog - 添加成员对话框
 * @description 搜索并邀请用户加入当前组织/团队，支持角色选择
 */
import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Search, UserPlus, ChevronDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Badge } from '@/components/ui/badge'
import type { Profile } from '@/lib/supabase/organizationTypes'

interface AddMemberDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  organizationId: string
  organizationName: string
  currentMembers: Profile[]
  onSearchUsers: (query: string) => Promise<Profile[]>
  onAddMember: (userId: string, role: 'manager' | 'member') => Promise<void>
}

const roleKeys = {
  manager: 'manager',
  member: 'member',
} as const

export function AddMemberDialog({
  open,
  onOpenChange,
  organizationName,
  currentMembers,
  onSearchUsers,
  onAddMember,
}: AddMemberDialogProps) {
  const { t } = useTranslation('components')
  const { t: tCommon } = useTranslation('common')
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<Profile[]>([])
  const [selectedUser, setSelectedUser] = useState<Profile | null>(null)
  const [selectedRole, setSelectedRole] = useState<'manager' | 'member'>('member')
  const [isSearching, setIsSearching] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (!open) {
      setSearchQuery('')
      setSearchResults([])
      setSelectedUser(null)
      setSelectedRole('member')
    }
  }, [open])

  useEffect(() => {
    const searchTimer = setTimeout(async () => {
      if (searchQuery.trim().length >= 2) {
        setIsSearching(true)
        try {
          const results = await onSearchUsers(searchQuery.trim())
          const currentMemberIds = new Set(currentMembers.map((m) => m.id))
          const filteredResults = results.filter((user) => !currentMemberIds.has(user.id))
          setSearchResults(filteredResults)
        } catch (error) {
          console.error('Failed to search users:', error)
          setSearchResults([])
        } finally {
          setIsSearching(false)
        }
      } else {
        setSearchResults([])
      }
    }, 300)

    return () => clearTimeout(searchTimer)
  }, [searchQuery, onSearchUsers, currentMembers])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedUser) return

    setIsSubmitting(true)
    try {
      await onAddMember(selectedUser.id, selectedRole)
      onOpenChange(false)
    } catch (error) {
      console.error('Failed to add member:', error)
      alert(error instanceof Error ? error.message : t('organization.addMemberDialog.addFailed'))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>
              {t('organization.addMemberDialog.title', { name: organizationName })}
            </DialogTitle>
            <DialogDescription>{t('organization.addMemberDialog.description')}</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="search">{t('organization.addMemberDialog.searchLabel')}</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="search"
                  placeholder={t('organization.addMemberDialog.searchPlaceholder')}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {isSearching && (
              <p className="text-sm text-muted-foreground">
                {t('organization.addMemberDialog.searching')}
              </p>
            )}

            {searchQuery.trim().length >= 2 && !isSearching && searchResults.length === 0 && (
              <p className="text-sm text-muted-foreground">
                {t('organization.addMemberDialog.noResults')}
              </p>
            )}

            {searchResults.length > 0 && (
              <div className="space-y-2 max-h-[300px] overflow-y-auto border rounded-lg p-2">
                {searchResults.map((user) => (
                  <button
                    key={user.id}
                    type="button"
                    onClick={() => setSelectedUser(user)}
                    className={`w-full flex items-center gap-3 p-3 rounded-lg border transition-colors ${
                      selectedUser?.id === user.id
                        ? 'border-primary bg-accent'
                        : 'border-border hover:bg-accent/50'
                    }`}
                  >
                    <div className="flex-shrink-0 w-10 h-10 rounded-full bg-linear-to-br from-avatar-from to-avatar-to flex items-center justify-center text-white font-semibold">
                      {user.full_name ? user.full_name.charAt(0).toUpperCase() : '?'}
                    </div>
                    <div className="flex-1 min-w-0 text-left">
                      <p className="font-medium truncate">
                        {user.full_name || t('organization.unnamed')}
                      </p>
                      <p className="text-sm text-muted-foreground truncate">{user.id}</p>
                    </div>
                    {user.organization_id && (
                      <Badge variant="secondary" className="text-xs">
                        {t('organization.inOtherOrg')}
                      </Badge>
                    )}
                  </button>
                ))}
              </div>
            )}

            {selectedUser && (
              <div className="space-y-2 p-4 bg-accent/50 rounded-lg">
                <p className="text-sm font-medium">
                  {t('organization.addMemberDialog.selectedUser')}
                </p>
                <div className="flex items-center gap-3">
                  <div className="flex-shrink-0 w-10 h-10 rounded-full bg-linear-to-br from-avatar-from to-avatar-to flex items-center justify-center text-white font-semibold">
                    {selectedUser.full_name ? selectedUser.full_name.charAt(0).toUpperCase() : '?'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium">
                      {selectedUser.full_name || t('organization.unnamed')}
                    </p>
                    <p className="text-sm text-muted-foreground truncate">{selectedUser.id}</p>
                  </div>
                </div>

                <div className="space-y-2 mt-4">
                  <Label htmlFor="role">{t('organization.addMemberDialog.roleLabel')}</Label>
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
                    {t(`organization.roleDescriptions.${roleKeys[selectedRole]}`)}
                  </p>
                  <p className="text-xs text-amber-600">{t('organization.adminRoleHint')}</p>
                </div>
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
              {tCommon('cancel')}
            </Button>
            <Button type="submit" disabled={!selectedUser || isSubmitting}>
              {isSubmitting ? (
                t('organization.addMemberDialog.adding')
              ) : (
                <>
                  <UserPlus className="h-4 w-4 mr-2" />
                  {t('organization.addMemberDialog.submit')}
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
