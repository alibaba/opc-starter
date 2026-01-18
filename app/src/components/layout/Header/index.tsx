import { Bell, Settings, LogOut, Shield, Menu } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/stores/useAuthStore'
import { usePermission } from '@/hooks/usePermission'
import { Button } from '@/components/ui/button'
import { SyncStatusIndicator } from '@/components/ui/sync-status-indicator'
import { TooltipProvider } from '@/components/ui/tooltip'
import { ThemeToggle } from '@/components/ui/theme-toggle'

interface HeaderProps {
  /** 移动端菜单点击回调 */
  onMenuClick?: () => void
}

export function Header({ onMenuClick }: HeaderProps) {
  const navigate = useNavigate()
  const { user, signOut } = useAuthStore()
  const { isAdmin } = usePermission()

  const handleProfileClick = () => {
    navigate('/profile')
  }

  const handleSettingsClick = () => {
    navigate('/settings/cloud-storage')
  }

  const handleSignOut = async () => {
    await signOut()
    navigate('/login')
  }

  // 获取用户显示名称
  const displayName = user?.user_metadata?.display_name || user?.email?.split('@')[0] || '用户'

  // 获取用户头像首字母
  const avatarInitial = displayName.charAt(0).toUpperCase()

  return (
    <header className="h-14 md:h-16 bg-card border-b border-border flex items-center justify-between px-3 md:px-6">
      {/* 左侧区域 */}
      <div className="flex items-center gap-2 md:gap-4 flex-1">
        {/* 移动端汉堡菜单按钮 */}
        <button className="p-2 hover:bg-accent rounded-lg md:hidden" onClick={onMenuClick}>
          <Menu className="w-5 h-5" />
        </button>
      </div>

      {/* 右侧操作区 */}
      <div className="flex items-center gap-1 md:gap-4">
        {/* 管理员入口 - 移动端隐藏文字 */}
        {isAdmin && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/persons')}
            className="gap-1 md:gap-2 px-2 md:px-3"
          >
            <Shield className="w-4 h-4" />
            <span className="hidden md:inline">组织管理</span>
          </Button>
        )}

        {/* 同步状态指示器 (Epic-18: S18-5) */}
        <TooltipProvider>
          <SyncStatusIndicator />
        </TooltipProvider>

        {/* 主题切换 */}
        <ThemeToggle variant="dropdown" />

        {/* 通知 - 保持图标按钮 */}
        <button className="p-2 hover:bg-accent rounded-lg transition-colors">
          <Bell className="w-5 h-5 text-muted-foreground" />
        </button>

        {/* 设置 - 保持图标按钮 */}
        <button
          className="p-2 hover:bg-accent rounded-lg transition-colors"
          onClick={handleSettingsClick}
          title="云存储设置"
        >
          <Settings className="w-5 h-5 text-muted-foreground" />
        </button>

        {/* 用户信息 */}
        {user && (
          <div className="flex items-center gap-1 md:gap-3 pl-2 md:pl-3 border-l border-border">
            {/* 用户头像 - 移动端只显示头像 */}
            <button
              onClick={handleProfileClick}
              className="flex items-center gap-2 hover:bg-secondary rounded-lg px-1 md:px-2 py-1 transition-colors cursor-pointer"
              title="个人中心"
            >
              <div className="w-7 h-7 md:w-8 md:h-8 bg-primary rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-xs md:text-sm font-medium text-primary-foreground">
                  {avatarInitial}
                </span>
              </div>
              <span className="hidden md:inline text-sm font-medium">{displayName}</span>
            </button>

            {/* 登出按钮 - 移动端只显示图标 */}
            <Button
              variant="ghost"
              size="sm"
              onClick={handleSignOut}
              className="gap-1 md:gap-2 px-2"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden md:inline">登出</span>
            </Button>
          </div>
        )}
      </div>
    </header>
  )
}
