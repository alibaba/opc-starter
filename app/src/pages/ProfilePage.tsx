/**
 * ProfilePage Component
 * 个人中心页面
 */

import { useEffect, useState, useRef } from 'react'
import { useTranslation } from 'react-i18next'
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
  const { t } = useTranslation('pages')
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
          <p className="text-muted-foreground">{t('profile.loading')}</p>
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
          <h2 className="text-xl font-semibold text-foreground mb-2">{t('profile.loadFailed')}</h2>
          <p className="text-muted-foreground mb-4">{error}</p>
          <button
            onClick={loadProfile}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
          >
            {t('profile.retry')}
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
            <h1 className="text-2xl font-bold text-foreground">{t('profile.title')}</h1>
          </div>
          <p className="text-muted-foreground mt-1">{t('profile.subtitle')}</p>
        </div>
      </div>

      {/* 主内容区域 */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 组织信息卡片 */}
        <div className="bg-card rounded-lg shadow-sm border p-6 mb-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-semibold">{t('profile.orgInfo')}</h2>
            </div>
            {isCurrentUserAdmin && (
              <Button variant="outline" size="sm" onClick={() => setAssignDialogOpen(true)}>
                <Edit3 className="h-4 w-4 mr-2" />
                {t('profile.changeTeam')}
              </Button>
            )}
          </div>

          {orgLoading ? (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-sm">{t('profile.loadingOrg')}</span>
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
              <h2 className="text-lg font-semibold mb-4">{t('profile.avatar')}</h2>
              <AvatarUploader />
              <div className="mt-6 p-4 bg-primary/10 rounded-lg">
                <p className="text-sm text-primary">{t('profile.avatarTip')}</p>
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
          <p className="text-sm text-muted-foreground text-center">{t('profile.mobileTip')}</p>
        </div>
      </div>

      {/* 分配团队对话框 */}
      {isCurrentUserAdmin && userId && (
        <AssignTeamDialog
          open={assignDialogOpen}
          onOpenChange={setAssignDialogOpen}
          userId={userId}
          userName={profile?.fullName || t('profile.currentUser')}
          currentOrg={userOrgInfo?.organization || null}
          organizationTree={tree}
          onSubmit={handleAssignTeam}
        />
      )}
    </div>
  )
}

export default ProfilePage
