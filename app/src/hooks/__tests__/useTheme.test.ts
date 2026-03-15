/**
 * useTheme 单元测试
 * 测试主题切换 Hook
 */

import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useTheme } from '../useTheme'

const THEME_STORAGE_KEY = 'photo-wall-theme'

describe('useTheme', () => {
  let mockLocalStorage: Record<string, string>
  let mockMatchMedia: ReturnType<typeof vi.fn>

  beforeEach(() => {
    mockLocalStorage = {}
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(
      (key: string) => mockLocalStorage[key] ?? null
    )
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation((key: string, value: string) => {
      mockLocalStorage[key] = value
    })

    mockMatchMedia = vi.fn().mockReturnValue({
      matches: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })
    Object.defineProperty(window, 'matchMedia', {
      value: mockMatchMedia,
      writable: true,
    })

    document.documentElement.classList.remove('dark')
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('初始主题默认为 system', () => {
    const { result } = renderHook(() => useTheme())
    expect(result.current.theme).toBe('system')
  })

  it('setTheme("dark") 更新主题并写入 localStorage', () => {
    const { result } = renderHook(() => useTheme())

    act(() => {
      result.current.setTheme('dark')
    })

    expect(result.current.theme).toBe('dark')
    expect(result.current.effectiveTheme).toBe('dark')
    expect(localStorage.setItem).toHaveBeenCalledWith(THEME_STORAGE_KEY, 'dark')
    expect(document.documentElement.classList.contains('dark')).toBe(true)
  })

  it('setTheme("light") 更新主题并写入 localStorage', () => {
    const { result } = renderHook(() => useTheme())

    act(() => {
      result.current.setTheme('light')
    })

    expect(result.current.theme).toBe('light')
    expect(result.current.effectiveTheme).toBe('light')
    expect(localStorage.setItem).toHaveBeenCalledWith(THEME_STORAGE_KEY, 'light')
    expect(document.documentElement.classList.contains('dark')).toBe(false)
  })

  it('effectiveTheme 为 dark 时 theme 为 dark', () => {
    const { result } = renderHook(() => useTheme())

    act(() => {
      result.current.setTheme('dark')
    })

    expect(result.current.effectiveTheme).toBe('dark')
    expect(result.current.isDark).toBe(true)
  })

  it('theme 为 system 时 effectiveTheme 遵循系统偏好', () => {
    mockMatchMedia.mockReturnValue({
      matches: true,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })

    const { result } = renderHook(() => useTheme())

    expect(result.current.theme).toBe('system')
    expect(result.current.effectiveTheme).toBe('dark')
    expect(result.current.isDark).toBe(true)
  })

  it('theme 为 system 且系统偏好为 light 时 effectiveTheme 为 light', () => {
    mockMatchMedia.mockReturnValue({
      matches: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })

    const { result } = renderHook(() => useTheme())

    expect(result.current.theme).toBe('system')
    expect(result.current.effectiveTheme).toBe('light')
    expect(result.current.isDark).toBe(false)
  })
})
