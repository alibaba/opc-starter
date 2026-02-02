import { describe, it, expect, beforeEach, vi } from 'vitest'
import { navigationTool, setNavigateCallback } from './index'

describe('navigationTool', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    setNavigateCallback(null)
  })

  it('should have correct metadata', () => {
    expect(navigationTool.meta.name).toBe('navigateToPage')
    expect(navigationTool.meta.category).toBe('navigation')
  })

  it('should validate page parameter', async () => {
    const result = await navigationTool.validateAndExecute({
      page: 'invalid-page',
    })
    expect(result.success).toBe(false)
    expect(result.error).toContain('参数验证失败')
  })

  it('should return error when navigate callback not set', async () => {
    const result = await navigationTool.execute({
      page: 'home',
    })

    expect(result.success).toBe(false)
    expect(result.error).toContain('导航服务未初始化')
  })

  it('should navigate to home', async () => {
    const mockNavigate = vi.fn()
    setNavigateCallback(mockNavigate)

    const result = await navigationTool.execute({
      page: 'home',
    })

    expect(result.success).toBe(true)
    expect(mockNavigate).toHaveBeenCalledWith('/')
  })

  it('should navigate to persons', async () => {
    const mockNavigate = vi.fn()
    setNavigateCallback(mockNavigate)

    const result = await navigationTool.execute({
      page: 'persons',
    })

    expect(result.success).toBe(true)
    expect(mockNavigate).toHaveBeenCalledWith('/persons')
  })

  it('should navigate to profile', async () => {
    const mockNavigate = vi.fn()
    setNavigateCallback(mockNavigate)

    const result = await navigationTool.execute({
      page: 'profile',
    })

    expect(result.success).toBe(true)
    expect(mockNavigate).toHaveBeenCalledWith('/profile')
  })

  it('should navigate to settings', async () => {
    const mockNavigate = vi.fn()
    setNavigateCallback(mockNavigate)

    const result = await navigationTool.execute({
      page: 'settings',
    })

    expect(result.success).toBe(true)
    expect(mockNavigate).toHaveBeenCalledWith('/settings')
  })

  it('should navigate to storage', async () => {
    const mockNavigate = vi.fn()
    setNavigateCallback(mockNavigate)

    const result = await navigationTool.execute({
      page: 'storage',
    })

    expect(result.success).toBe(true)
    expect(mockNavigate).toHaveBeenCalledWith('/settings/cloud-storage')
  })
})
