/**
 * Sidebar - 侧边栏导航组件
 * @description 提供主要页面导航链接，支持折叠/展开，集成 Agent 按钮入口
 */
import { Link, useLocation } from 'react-router-dom'
import { Home, Users, User, Settings, X, ChevronLeft, ChevronRight } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'
import { AgentButton } from '@/components/agent/AgentButton'

const menuItems = [
  { path: '/', labelKey: 'sidebar.nav.home', icon: Home },
  { path: '/persons', labelKey: 'sidebar.nav.persons', icon: Users },
  { path: '/profile', labelKey: 'sidebar.nav.profile', icon: User },
  { path: '/settings', labelKey: 'sidebar.nav.settings', icon: Settings },
] as const

interface SidebarProps {
  /** 移动端是否展开 */
  isOpen?: boolean
  /** 移动端关闭回调 */
  onClose?: () => void
  /** 桌面端是否折叠 */
  isCollapsed?: boolean
  /** 桌面端折叠切换回调 */
  onToggleCollapse?: () => void
}

export function Sidebar({
  isOpen = false,
  onClose,
  isCollapsed = false,
  onToggleCollapse,
}: SidebarProps) {
  const { t } = useTranslation('layout')
  const location = useLocation()

  const handleNavClick = () => {
    onClose?.()
  }

  return (
    <>
      {isOpen && (
        <div className="fixed inset-0 bg-foreground/50 z-40 md:hidden" onClick={onClose} />
      )}

      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 bg-card border-r border-border flex flex-col',
          'transform transition-all duration-300 ease-in-out',
          isOpen ? 'translate-x-0' : '-translate-x-full',
          'w-64',
          'md:relative md:translate-x-0 md:z-0',
          isCollapsed ? 'md:w-16' : 'md:w-64'
        )}
      >
        <div
          className={cn(
            'p-4 md:p-4 border-b border-border flex items-center bg-card',
            isCollapsed ? 'md:justify-center' : 'justify-between'
          )}
        >
          {isCollapsed ? (
            <div className="hidden md:flex w-8 h-8 bg-primary rounded-lg items-center justify-center">
              <span className="text-primary-foreground font-bold text-sm">O</span>
            </div>
          ) : (
            <div>
              <h1 className="text-xl md:text-xl font-bold text-foreground">OPC-Starter</h1>
              <p className="text-xs text-muted-foreground mt-1">{t('sidebar.tagline')}</p>
            </div>
          )}
          <div className="md:hidden">
            <div className={cn(isCollapsed ? 'hidden' : 'block')}>
              <h1 className="text-xl font-bold text-foreground">OPC-Starter</h1>
              <p className="text-xs text-muted-foreground mt-1">{t('sidebar.tagline')}</p>
            </div>
          </div>
          <button className="p-2 hover:bg-secondary rounded-lg md:hidden" onClick={onClose}>
            <X className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>

        <nav
          className={cn('flex-1 overflow-y-auto bg-card', isCollapsed ? 'md:p-2' : 'p-3 md:p-4')}
        >
          <ul className="space-y-1 md:space-y-2">
            {menuItems.map((item) => {
              const Icon = item.icon
              const isActive = location.pathname === item.path

              return (
                <li key={item.path}>
                  <Link
                    to={item.path}
                    onClick={handleNavClick}
                    className={cn(
                      'flex items-center rounded-lg transition-colors',
                      isCollapsed
                        ? 'md:justify-center md:px-0 md:py-2.5 px-3 py-2.5 gap-3'
                        : 'gap-3 px-3 md:px-4 py-2.5 md:py-3',
                      isActive
                        ? 'bg-primary text-primary-foreground'
                        : 'text-foreground hover:bg-secondary hover:text-secondary-foreground'
                    )}
                  >
                    <Icon className="w-5 h-5 flex-shrink-0" />
                    <span
                      className={cn('font-medium text-sm md:text-base', isCollapsed && 'md:hidden')}
                    >
                      {t(item.labelKey)}
                    </span>
                  </Link>
                </li>
              )
            })}
          </ul>
        </nav>

        <div className={cn('border-t border-border bg-card', isCollapsed ? 'p-2' : 'p-3 md:p-4')}>
          <AgentButton isCollapsed={isCollapsed} />
        </div>

        <div className="hidden md:block p-2 border-t border-border bg-card">
          <button
            onClick={onToggleCollapse}
            className={cn(
              'w-full flex items-center justify-center p-2 rounded-lg',
              'text-muted-foreground hover:bg-secondary hover:text-secondary-foreground transition-colors'
            )}
            title={isCollapsed ? t('sidebar.expand') : t('sidebar.collapse')}
          >
            {isCollapsed ? (
              <ChevronRight className="w-5 h-5" />
            ) : (
              <div className="flex items-center gap-2">
                <ChevronLeft className="w-5 h-5" />
                <span className="text-sm">{t('sidebar.collapseShort')}</span>
              </div>
            )}
          </button>
        </div>

        <div
          className={cn('p-3 md:p-4 border-t border-border bg-card', isCollapsed && 'md:hidden')}
        >
          <p className="text-xs text-muted-foreground text-center">© 2026 OPC-Starter</p>
        </div>
      </aside>
    </>
  )
}
