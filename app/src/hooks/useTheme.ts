import { useEffect, useState, useCallback } from 'react'

export type Theme = 'light' | 'dark' | 'system'

const THEME_STORAGE_KEY = 'photo-wall-theme'

/**
 * 获取系统主题偏好
 */
function getSystemTheme(): 'light' | 'dark' {
  if (typeof window === 'undefined') return 'light'
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

/**
 * 获取存储的主题设置
 */
function getStoredTheme(): Theme {
  if (typeof window === 'undefined') return 'system'
  const stored = localStorage.getItem(THEME_STORAGE_KEY)
  if (stored === 'light' || stored === 'dark' || stored === 'system') {
    return stored
  }
  return 'system'
}

/**
 * 应用主题到 DOM
 */
function applyTheme(theme: Theme) {
  const root = document.documentElement
  const effectiveTheme = theme === 'system' ? getSystemTheme() : theme

  if (effectiveTheme === 'dark') {
    root.classList.add('dark')
  } else {
    root.classList.remove('dark')
  }
}

/**
 * 主题管理 Hook
 *
 * @example
 * ```tsx
 * const { theme, setTheme, effectiveTheme } = useTheme()
 *
 * // 切换主题
 * setTheme('dark')
 *
 * // 循环切换
 * const cycleTheme = () => {
 *   const themes: Theme[] = ['light', 'dark', 'system']
 *   const currentIndex = themes.indexOf(theme)
 *   setTheme(themes[(currentIndex + 1) % themes.length])
 * }
 * ```
 */
export function useTheme() {
  const [theme, setThemeState] = useState<Theme>(() => getStoredTheme())
  const [effectiveTheme, setEffectiveTheme] = useState<'light' | 'dark'>(() => {
    const stored = getStoredTheme()
    return stored === 'system' ? getSystemTheme() : stored
  })

  // 设置主题
  const setTheme = useCallback((newTheme: Theme) => {
    setThemeState(newTheme)
    localStorage.setItem(THEME_STORAGE_KEY, newTheme)
    applyTheme(newTheme)
    setEffectiveTheme(newTheme === 'system' ? getSystemTheme() : newTheme)
  }, [])

  // 初始化时应用主题
  // 注意：这里故意只在组件挂载时执行一次，theme 变化由 setTheme 函数处理
  useEffect(() => {
    applyTheme(theme)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // 监听系统主题变化
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')

    const handleChange = (e: MediaQueryListEvent) => {
      if (theme === 'system') {
        applyTheme('system')
        setEffectiveTheme(e.matches ? 'dark' : 'light')
      }
    }

    mediaQuery.addEventListener('change', handleChange)
    return () => mediaQuery.removeEventListener('change', handleChange)
  }, [theme])

  return {
    /** 用户设置的主题 ('light' | 'dark' | 'system') */
    theme,
    /** 设置主题 */
    setTheme,
    /** 实际生效的主题 ('light' | 'dark') */
    effectiveTheme,
    /** 是否为暗色模式 */
    isDark: effectiveTheme === 'dark',
  }
}

/**
 * 初始化主题（在 App 入口调用）
 * 防止页面加载时的闪烁
 */
export function initializeTheme() {
  const theme = getStoredTheme()
  applyTheme(theme)
}
