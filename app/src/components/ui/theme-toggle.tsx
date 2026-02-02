import { Sun, Moon, Monitor } from 'lucide-react'
import { useTheme, type Theme } from '@/hooks/useTheme'
import { Button } from './button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from './dropdown-menu'
import { cn } from '@/lib/utils'

interface ThemeToggleProps {
  /** 是否显示为下拉菜单（包含 system 选项） */
  variant?: 'dropdown' | 'simple'
  /** 按钮大小 */
  size?: 'sm' | 'default'
  /** 自定义类名 */
  className?: string
}

/**
 * 主题切换组件
 * 
 * @example
 * ```tsx
 * // 简单切换（light <-> dark）
 * <ThemeToggle variant="simple" />
 * 
 * // 下拉菜单（包含 system 选项）
 * <ThemeToggle variant="dropdown" />
 * ```
 */
export function ThemeToggle({ 
  variant = 'dropdown', 
  size = 'default',
  className 
}: ThemeToggleProps) {
  const { theme, setTheme, isDark } = useTheme()

  // 简单模式：直接切换 light/dark
  if (variant === 'simple') {
    return (
      <Button
        variant="ghost"
        size={size === 'sm' ? 'sm' : 'icon'}
        onClick={() => setTheme(isDark ? 'light' : 'dark')}
        className={cn('transition-colors', className)}
        title={isDark ? '切换到浅色模式' : '切换到深色模式'}
      >
        {isDark ? (
          <Sun className="h-5 w-5" />
        ) : (
          <Moon className="h-5 w-5" />
        )}
        <span className="sr-only">切换主题</span>
      </Button>
    )
  }

  // 下拉菜单模式：包含 system 选项
  const themeOptions: { value: Theme; label: string; icon: React.ReactNode }[] = [
    { value: 'light', label: '浅色', icon: <Sun className="h-4 w-4" /> },
    { value: 'dark', label: '深色', icon: <Moon className="h-4 w-4" /> },
    { value: 'system', label: '跟随系统', icon: <Monitor className="h-4 w-4" /> },
  ]

  const currentIcon = theme === 'system' 
    ? <Monitor className="h-5 w-5" />
    : isDark 
      ? <Moon className="h-5 w-5" /> 
      : <Sun className="h-5 w-5" />

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size={size === 'sm' ? 'sm' : 'icon'}
          className={cn('transition-colors', className)}
          title="切换主题"
        >
          {currentIcon}
          <span className="sr-only">切换主题</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {themeOptions.map((option) => (
          <DropdownMenuItem
            key={option.value}
            onClick={() => setTheme(option.value)}
            className={cn(
              'flex items-center gap-2 cursor-pointer',
              theme === option.value && 'bg-accent'
            )}
          >
            {option.icon}
            <span>{option.label}</span>
            {theme === option.value && (
              <span className="ml-auto text-emerald-600 dark:text-emerald-400">✓</span>
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
