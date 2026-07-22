/**
 * PersonsPage - 人员/组织管理页面
 * @description 展示组织树、团队成员列表，支持创建组织、添加成员、分配团队等操作
 */
import { useEffect, useState, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { Plus, Settings, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { OrgTree } from '@/components/organization/OrgTree'
import { TeamMembersList } from '@/components/organization/TeamMembersList'
import { CreateOrgDialog } from '@/components/organization/CreateOrgDialog'
import { AddMemberDialog } from '@/components/organization/AddMemberDialog'
import { ChangeRoleDialog } from '@/components/organization/ChangeRoleDialog'
import { useOrganization } from '@/hooks/useOrganization'
import { useAuthStore } from '@/stores/useAuthStore'
import type { OrganizationTreeNode, Profile } from '@/lib/supabase/organizationTypes'

function PersonsPage() {
  const { t } = useTranslation('pages')
  const { user } = useAuthStore()
  const userId = user?.id || ''
  const initializedRef = useRef(false)

  const {
    tree,
    selectedOrg,
    members,
    userOrgInfo,
    isLoading,
    error,
    loadTree,
    selectOrganization,
    createOrganization,
    deleteOrganization,
    getUserOrgInfo,
    addMember,
    removeMember,
    changeRole,
    searchUsers,
  } = useOrganization(userId)

  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [parentOrgForCreate, setParentOrgForCreate] = useState<OrganizationTreeNode | null>(null)
  const [addMemberDialogOpen, setAddMemberDialogOpen] = useState(false)
  const [changeRoleDialogOpen, setChangeRoleDialogOpen] = useState(false)
  const [selectedMemberForRole, setSelectedMemberForRole] = useState<Profile | null>(null)

  useEffect(() => {
    if (!userId || initializedRef.current) return
    initializedRef.current = true

    loadTree()
    getUserOrgInfo(userId)
  }, [userId, loadTree, getUserOrgInfo])

  const handleSelectOrg = (node: OrganizationTreeNode) => {
    selectOrganization(node)
  }

  const handleCreateOrg = () => {
    setParentOrgForCreate(selectedOrg as OrganizationTreeNode | null)
    setCreateDialogOpen(true)
  }

  const handleDeleteOrg = async () => {
    if (!selectedOrg) return

    if (!confirm(t('persons.deleteConfirm', { name: selectedOrg.display_name }))) {
      return
    }

    try {
      await deleteOrganization(selectedOrg.id)
    } catch (err) {
      alert(err instanceof Error ? err.message : t('persons.deleteFailed'))
    }
  }

  const handleAddMember = () => {
    setAddMemberDialogOpen(true)
  }

  const handleRemoveMember = async (member: Profile) => {
    if (!confirm(t('persons.removeConfirm', { name: member.full_name }))) {
      return
    }

    try {
      await removeMember(member.id)
    } catch (err) {
      alert(err instanceof Error ? err.message : t('persons.removeFailed'))
    }
  }

  const handleChangeRole = (member: Profile) => {
    setSelectedMemberForRole(member)
    setChangeRoleDialogOpen(true)
  }

  const handleAddMemberSubmit = async (targetUserId: string, role: 'manager' | 'member') => {
    if (!selectedOrg) return
    await addMember(targetUserId, selectedOrg.id, role)
  }

  const handleChangeRoleSubmit = async (targetUserId: string, newRole: 'manager' | 'member') => {
    await changeRole(targetUserId, newRole)
  }

  const currentUserRole = userOrgInfo?.role || 'member'
  const isAdmin = currentUserRole === 'admin'

  if (!userId) {
    return (
      <div className="max-w-7xl mx-auto p-4">
        <p className="text-muted-foreground">{t('persons.loginRequired')}</p>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto p-4 h-[calc(100vh-4rem)]">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-3xl font-bold">{t('persons.title')}</h1>
          <p className="text-sm text-muted-foreground mt-1">{t('persons.subtitle')}</p>
        </div>
        {isAdmin && (
          <div className="flex gap-2">
            <Button onClick={handleCreateOrg} size="sm">
              <Plus className="h-4 w-4 mr-2" />
              {selectedOrg ? t('persons.createSubOrg') : t('persons.createOrg')}
            </Button>
            {selectedOrg && (
              <>
                <Button variant="outline" size="sm">
                  <Settings className="h-4 w-4 mr-2" />
                  {t('persons.editOrg')}
                </Button>
                <Button variant="destructive" size="sm" onClick={handleDeleteOrg}>
                  <Trash2 className="h-4 w-4 mr-2" />
                  {t('persons.deleteOrg')}
                </Button>
              </>
            )}
          </div>
        )}
      </div>

      {error && (
        <div className="bg-destructive/10 border border-destructive text-destructive px-4 py-3 rounded-md mb-4">
          <p className="text-sm">{error}</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-4 h-[calc(100%-5rem)] items-stretch">
        <div className="border rounded-lg p-4 overflow-y-auto bg-card flex flex-col h-full min-h-0">
          <h2 className="text-lg font-semibold mb-3">{t('persons.orgTree')}</h2>
          <div className="flex flex-1 flex-col min-h-0">
            {isLoading && !tree.length ? (
              <p className="text-sm text-muted-foreground">{t('persons.loading')}</p>
            ) : (
              <OrgTree
                tree={tree}
                selectedId={selectedOrg?.id || null}
                onSelect={handleSelectOrg}
              />
            )}
          </div>
        </div>

        <div className="border rounded-lg p-4 overflow-hidden bg-card flex flex-col h-full min-h-0">
          {selectedOrg ? (
            <TeamMembersList
              members={members}
              organizationName={selectedOrg.display_name}
              currentUserId={userId}
              currentUserRole={currentUserRole}
              onAddMember={handleAddMember}
              onRemoveMember={handleRemoveMember}
              onChangeRole={handleChangeRole}
            />
          ) : (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              <p className="text-sm">{t('persons.selectOrgHint')}</p>
            </div>
          )}
        </div>
      </div>

      <CreateOrgDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        parentOrg={parentOrgForCreate}
        onSubmit={async (input) => {
          await createOrganization(input)
        }}
      />

      {selectedOrg && (
        <AddMemberDialog
          open={addMemberDialogOpen}
          onOpenChange={setAddMemberDialogOpen}
          organizationId={selectedOrg.id}
          organizationName={selectedOrg.display_name}
          currentMembers={members}
          onSearchUsers={searchUsers}
          onAddMember={handleAddMemberSubmit}
        />
      )}

      <ChangeRoleDialog
        open={changeRoleDialogOpen}
        onOpenChange={setChangeRoleDialogOpen}
        member={selectedMemberForRole}
        onChangeRole={handleChangeRoleSubmit}
      />
    </div>
  )
}

export default PersonsPage
