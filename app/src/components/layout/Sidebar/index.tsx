import { Link, useLocation } from 'react-router-dom';
import { Home, Users, User, Settings, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { AgentButton } from '@/components/agent/AgentButton';

/**
 * 导航菜单项配置 - OPC-Starter
 */
const menuItems = [
  { path: '/', label: '首页', icon: Home },
  { path: '/persons', label: '组织管理', icon: Users },
  { path: '/profile', label: '个人中心', icon: User },
  { path: '/settings', label: '设置', icon: Settings },
];

interface SidebarProps {
  /** 移动端是否展开 */
  isOpen?: boolean;
  /** 移动端关闭回调 */
  onClose?: () => void;
  /** 桌面端是否折叠 */
  isCollapsed?: boolean;
  /** 桌面端折叠切换回调 */
  onToggleCollapse?: () => void;
}

export function Sidebar({ isOpen = false, onClose, isCollapsed = false, onToggleCollapse }: SidebarProps) {
  const location = useLocation();

  const handleNavClick = () => {
    // 移动端点击导航后自动关闭侧边栏
    onClose?.();
  };

  return (
    <>
      {/* 移动端遮罩层 */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-foreground/50 z-40 md:hidden"
          onClick={onClose}
        />
      )}
      
      {/* 侧边栏 - Mobile First: 默认隐藏，md 及以上显示 */}
      <aside 
        className={cn(
          // Mobile First: 默认固定定位、隐藏在左侧
          // 移动端使用白色背景确保可见
          'fixed inset-y-0 left-0 z-50 bg-card border-r border-border flex flex-col',
          'transform transition-all duration-300 ease-in-out',
          // 移动端：根据 isOpen 控制显示，始终使用完整宽度
          isOpen ? 'translate-x-0' : '-translate-x-full',
          'w-64',
          // md 及以上：始终显示，relative 定位，根据 isCollapsed 调整宽度
          'md:relative md:translate-x-0 md:z-0',
          isCollapsed ? 'md:w-16' : 'md:w-64'
        )}
      >
        {/* Logo区域 */}
        <div className={cn(
          "p-4 md:p-4 border-b border-border flex items-center bg-card",
          isCollapsed ? "md:justify-center" : "justify-between"
        )}>
          {/* Logo 内容 - 折叠时只显示首字母 */}
          {isCollapsed ? (
            <div className="hidden md:flex w-8 h-8 bg-primary rounded-lg items-center justify-center">
              <span className="text-primary-foreground font-bold text-sm">O</span>
            </div>
          ) : (
            <div>
              <h1 className="text-xl md:text-xl font-bold text-foreground">OPC-Starter</h1>
              <p className="text-xs text-muted-foreground mt-1">一人公司启动器</p>
            </div>
          )}
          {/* 移动端关闭按钮 - 展开时显示完整内容 */}
          <div className="md:hidden">
            <div className={cn(isCollapsed ? "hidden" : "block")}>
              <h1 className="text-xl font-bold text-foreground">OPC-Starter</h1>
              <p className="text-xs text-muted-foreground mt-1">一人公司启动器</p>
            </div>
          </div>
          {/* 移动端关闭按钮 */}
          <button 
            className="p-2 hover:bg-secondary rounded-lg md:hidden"
            onClick={onClose}
          >
            <X className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>

        {/* 导航菜单 */}
        <nav className={cn(
          "flex-1 overflow-y-auto bg-card",
          isCollapsed ? "md:p-2" : "p-3 md:p-4"
        )}>
          <ul className="space-y-1 md:space-y-2">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;

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
                    <span className={cn(
                      "font-medium text-sm md:text-base",
                      isCollapsed && "md:hidden"
                    )}>
                      {item.label}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* AI 助手按钮 */}
        <div className={cn(
          "border-t border-border bg-card",
          isCollapsed ? "p-2" : "p-3 md:p-4"
        )}>
          <AgentButton isCollapsed={isCollapsed} />
        </div>

        {/* 折叠/展开按钮 - 仅桌面端显示 */}
        <div className="hidden md:block p-2 border-t border-border bg-card">
          <button
            onClick={onToggleCollapse}
            className={cn(
              "w-full flex items-center justify-center p-2 rounded-lg",
              "text-muted-foreground hover:bg-secondary hover:text-secondary-foreground transition-colors"
            )}
            title={isCollapsed ? "展开侧边栏" : "收起侧边栏"}
          >
            {isCollapsed ? (
              <ChevronRight className="w-5 h-5" />
            ) : (
              <div className="flex items-center gap-2">
                <ChevronLeft className="w-5 h-5" />
                <span className="text-sm">收起</span>
              </div>
            )}
          </button>
        </div>

        {/* 底部信息 - 折叠时隐藏 */}
        <div className={cn(
          "p-3 md:p-4 border-t border-border bg-card",
          isCollapsed && "md:hidden"
        )}>
          <p className="text-xs text-muted-foreground text-center">
            © 2026 OPC-Starter
          </p>
        </div>
      </aside>
    </>
  );
}
