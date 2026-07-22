/**
 * ThemeToggle - 主题切换组件，支持浅色/深色/跟随系统
 */
import { Sun, Moon, Monitor } from 'lucide-react'
import { useTranslation } from 'react-i18next'
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

export function ThemeToggle({
  variant = 'dropdown',
  size = 'default',
  className,
}: ThemeToggleProps) {
  const { t } = useTranslation('layout')
  const { theme, setTheme, isDark } = useTheme()

  if (variant === 'simple') {
    return (
      <Button
        variant="ghost"
        size={size === 'sm' ? 'sm' : 'icon'}
        onClick={() => setTheme(isDark ? 'light' : 'dark')}
        className={cn('transition-colors', className)}
        title={isDark ? t('theme.switchToLight') : t('theme.switchToDark')}
      >
        {isDark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
        <span className="sr-only">{t('theme.toggle')}</span>
      </Button>
    )
  }

  const themeOptions: {
    value: Theme
    labelKey: 'theme.light' | 'theme.dark' | 'theme.system'
    icon: React.ReactNode
  }[] = [
    { value: 'light', labelKey: 'theme.light', icon: <Sun className="h-4 w-4" /> },
    { value: 'dark', labelKey: 'theme.dark', icon: <Moon className="h-4 w-4" /> },
    { value: 'system', labelKey: 'theme.system', icon: <Monitor className="h-4 w-4" /> },
  ]

  const currentIcon =
    theme === 'system' ? (
      <Monitor className="h-5 w-5" />
    ) : isDark ? (
      <Moon className="h-5 w-5" />
    ) : (
      <Sun className="h-5 w-5" />
    )

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size={size === 'sm' ? 'sm' : 'icon'}
          className={cn('transition-colors', className)}
          title={t('theme.toggle')}
        >
          {currentIcon}
          <span className="sr-only">{t('theme.toggle')}</span>
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
            <span>{t(option.labelKey)}</span>
            {theme === option.value && (
              <span className="ml-auto text-emerald-600 dark:text-emerald-400">✓</span>
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
