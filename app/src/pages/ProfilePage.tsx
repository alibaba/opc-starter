/**
 * ProfilePage Component
 * 个人中心页面
 */

import { useEffect, useState, useRef } from 'react'
import { Loader2, User, Building2, Edit3 } from 'lucide-react'
import { useProfileStore } from '@/stores/useProfileStore'
import { useAuthStore } from '@/stores/useAuthStore'
import { useOrganization } from '@/hooks/useOrganization'
import { AvatarUploader } from '@/components/business/AvatarUploader'
import { ProfileForm } from '@/components/business/ProfileForm'
import { OrganizationBreadcrumb } from '@/components/organization/OrganizationBreadcrumb'
import { AssignTeamDialog } from '@/components/organization/AssignTeamDialog'
import { Button } from '@/components/ui/button'

function ProfilePage() {
  const { profile, isLoading, loadProfile, error } = useProfileStore()
  const { user } = useAuthStore()
  const userId = user?.id || ''
  const profileFetchRef = useRef(false)
  const orgFetchRef = useRef<string | null>(null)

  const {
    tree,
    userOrgInfo,
    isLoading: orgLoading,
    loadTree,
    getUserOrgInfo,
    updateUserOrganization,
  } = useOrganization(userId)

  const [assignDialogOpen, setAssignDialogOpen] = useState(false)

  useEffect(() => {
    // 避免 React StrictMode 下重复拉取 profile
    if (profileFetchRef.current) return
    profileFetchRef.current = true
    loadProfile()
  }, [loadProfile])

  useEffect(() => {
    // 避免同一 userId 多次拉取组织信息
    if (!userId) return
    if (orgFetchRef.current === userId) return
    orgFetchRef.current = userId

    loadTree()
    getUserOrgInfo(userId)
  }, [userId, loadTree, getUserOrgInfo])

  const handleAssignTeam = async (targetUserId: string, organizationId: string | null) => {
    await updateUserOrganization(targetUserId, organizationId)
    await getUserOrgInfo(userId)
  }

  const isCurrentUserAdmin = userOrgInfo?.role === 'admin'

  // 加载状态
  if (isLoading && !profile) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">加载个人信息中...</p>
        </div>
      </div>
    )
  }

  // 错误状态
  if (error && !profile) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <User className="w-8 h-8 text-destructive" />
          </div>
          <h2 className="text-xl font-semibold text-foreground mb-2">加载失败</h2>
          <p className="text-muted-foreground mb-4">{error}</p>
          <button
            onClick={loadProfile}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
          >
            重试
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {/* 页面头部 */}
      <div className="bg-card border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center gap-3">
            <User className="w-6 h-6 text-primary" />
            <h1 className="text-2xl font-bold text-foreground">个人中心</h1>
          </div>
          <p className="text-muted-foreground mt-1">管理您的个人信息和头像</p>
        </div>
      </div>

      {/* 主内容区域 */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 组织信息卡片 */}
        <div className="bg-card rounded-lg shadow-sm border p-6 mb-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-semibold">组织信息</h2>
            </div>
            {isCurrentUserAdmin && (
              <Button variant="outline" size="sm" onClick={() => setAssignDialogOpen(true)}>
                <Edit3 className="h-4 w-4 mr-2" />
                修改团队
              </Button>
            )}
          </div>

          {orgLoading ? (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-sm">加载组织信息...</span>
            </div>
          ) : (
            <OrganizationBreadcrumb
              ancestors={userOrgInfo?.ancestors || []}
              currentOrg={userOrgInfo?.organization || null}
              role={userOrgInfo?.role || 'member'}
            />
          )}
        </div>

        {/* 响应式布局 */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* 左侧：头像上传区域 */}
          <div className="lg:col-span-1">
            <div className="bg-card rounded-lg shadow-sm border p-6">
              <h2 className="text-lg font-semibold mb-4">头像</h2>
              <AvatarUploader />
              <div className="mt-6 p-4 bg-primary/10 rounded-lg">
                <p className="text-sm text-primary">
                  <strong>提示：</strong>上传的头像将用于 AI 人脸识别，帮助系统在照片中自动标注您。
                </p>
              </div>
            </div>
          </div>

          {/* 右侧：个人信息表单 */}
          <div className="lg:col-span-2">
            <ProfileForm />
          </div>
        </div>

        {/* 移动端提示 */}
        <div className="mt-8 p-4 bg-secondary rounded-lg lg:hidden">
          <p className="text-sm text-muted-foreground text-center">
            💡 在桌面端可以获得更好的编辑体验
          </p>
        </div>
      </div>

      {/* 分配团队对话框 */}
      {isCurrentUserAdmin && userId && (
        <AssignTeamDialog
          open={assignDialogOpen}
          onOpenChange={setAssignDialogOpen}
          userId={userId}
          userName={profile?.fullName || '当前用户'}
          currentOrg={userOrgInfo?.organization || null}
          organizationTree={tree}
          onSubmit={handleAssignTeam}
        />
      )}
    </div>
  )
}

export default ProfilePage
