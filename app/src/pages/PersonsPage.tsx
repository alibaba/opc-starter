import { useEffect, useState, useRef } from 'react';
import { Plus, Settings, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { OrgTree } from '@/components/organization/OrgTree';
import { TeamMembersList } from '@/components/organization/TeamMembersList';
import { CreateOrgDialog } from '@/components/organization/CreateOrgDialog';
import { AddMemberDialog } from '@/components/organization/AddMemberDialog';
import { ChangeRoleDialog } from '@/components/organization/ChangeRoleDialog';
import { useOrganization } from '@/hooks/useOrganization';
import { useAuthStore } from '@/stores/useAuthStore';
import type { OrganizationTreeNode, Profile } from '@/lib/supabase/organizationTypes';

function PersonsPage() {
  const { user } = useAuthStore();
  const userId = user?.id || '';
  const initializedRef = useRef(false);

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
  } = useOrganization(userId);

  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [parentOrgForCreate, setParentOrgForCreate] = useState<OrganizationTreeNode | null>(null);
  const [addMemberDialogOpen, setAddMemberDialogOpen] = useState(false);
  const [changeRoleDialogOpen, setChangeRoleDialogOpen] = useState(false);
  const [selectedMemberForRole, setSelectedMemberForRole] = useState<Profile | null>(null);

  useEffect(() => {
    if (!userId || initializedRef.current) return;
    initializedRef.current = true;
    
    loadTree();
    getUserOrgInfo(userId);
  }, [userId, loadTree, getUserOrgInfo]);

  const handleSelectOrg = (node: OrganizationTreeNode) => {
    selectOrganization(node);
  };

  const handleCreateOrg = () => {
    setParentOrgForCreate(selectedOrg as OrganizationTreeNode | null);
    setCreateDialogOpen(true);
  };

  const handleDeleteOrg = async () => {
    if (!selectedOrg) return;
    
    if (!confirm(`确定要删除组织 "${selectedOrg.display_name}" 吗？此操作不可撤销。`)) {
      return;
    }

    try {
      await deleteOrganization(selectedOrg.id);
    } catch (err) {
      alert(err instanceof Error ? err.message : '删除失败');
    }
  };

  const handleAddMember = () => {
    setAddMemberDialogOpen(true);
  };

  const handleRemoveMember = async (member: Profile) => {
    if (!confirm(`确定要将 ${member.full_name} 从组织中移除吗？`)) {
      return;
    }

    try {
      await removeMember(member.id);
    } catch (err) {
      alert(err instanceof Error ? err.message : '移除失败');
    }
  };

  const handleChangeRole = (member: Profile) => {
    setSelectedMemberForRole(member);
    setChangeRoleDialogOpen(true);
  };

  const handleAddMemberSubmit = async (targetUserId: string, role: 'manager' | 'member') => {
    if (!selectedOrg) return;
    await addMember(targetUserId, selectedOrg.id, role);
  };

  const handleChangeRoleSubmit = async (targetUserId: string, newRole: 'manager' | 'member') => {
    await changeRole(targetUserId, newRole);
  };

  const currentUserRole = userOrgInfo?.role || 'member';
  const isAdmin = currentUserRole === 'admin';

  if (!userId) {
    return (
      <div className="max-w-7xl mx-auto p-4">
        <p className="text-muted-foreground">请先登录</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-4 h-[calc(100vh-4rem)]">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-3xl font-bold">组织架构与人员管理</h1>
          <p className="text-sm text-muted-foreground mt-1">
            管理团队组织结构和成员信息
          </p>
        </div>
        {isAdmin && (
          <div className="flex gap-2">
            <Button onClick={handleCreateOrg} size="sm">
              <Plus className="h-4 w-4 mr-2" />
              创建{selectedOrg ? '子' : ''}组织
            </Button>
            {selectedOrg && (
              <>
                <Button variant="outline" size="sm">
                  <Settings className="h-4 w-4 mr-2" />
                  编辑组织
                </Button>
                <Button variant="destructive" size="sm" onClick={handleDeleteOrg}>
                  <Trash2 className="h-4 w-4 mr-2" />
                  删除组织
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

      <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-4 h-[calc(100%-5rem)]">
        <div className="border rounded-lg p-4 overflow-y-auto bg-card">
          <h2 className="text-lg font-semibold mb-3">组织树</h2>
          {isLoading && !tree.length ? (
            <p className="text-sm text-muted-foreground">加载中...</p>
          ) : (
            <OrgTree
              tree={tree}
              selectedId={selectedOrg?.id || null}
              onSelect={handleSelectOrg}
            />
          )}
        </div>

        <div className="border rounded-lg p-4 overflow-hidden bg-card">
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
              <p className="text-sm">请从左侧选择一个组织查看成员</p>
            </div>
          )}
        </div>
      </div>

      <CreateOrgDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        parentOrg={parentOrgForCreate}
        onSubmit={async (input) => { await createOrganization(input); }}
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
  );
}

export default PersonsPage;