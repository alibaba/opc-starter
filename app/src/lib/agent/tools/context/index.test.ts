/**
 * Context Tools 测试
 * @version 2.0.0 - 适配 OPC-Starter 简化版本
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { getCurrentContextTool } from './getCurrent'

describe('getCurrentContextTool', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should have correct metadata', () => {
    expect(getCurrentContextTool.meta.name).toBe('getCurrentContext')
    expect(getCurrentContextTool.meta.category).toBe('context')
  })

  it('should return current context successfully', async () => {
    // Mock window.location.pathname
    Object.defineProperty(window, 'location', {
      value: { pathname: '/dashboard' },
      writable: true,
    })

    // Mock document.title
    Object.defineProperty(document, 'title', {
      value: 'OPC-Starter - Dashboard',
      writable: true,
    })

    const result = await getCurrentContextTool.execute({})

    expect(result.success).toBe(true)
    expect(result.data?.currentPath).toBe('/dashboard')
    expect(result.data?.pageTitle).toBe('OPC-Starter - Dashboard')
    expect(result.data?.timestamp).toBeDefined()
    expect(result.data?.timezone).toBeDefined()
    expect(result.ui?.type).toBe('text')
  })

  it('should include timestamp in ISO format', async () => {
    const result = await getCurrentContextTool.execute({})

    expect(result.success).toBe(true)
    // 验证时间戳格式
    const timestamp = result.data?.timestamp as string
    expect(() => new Date(timestamp)).not.toThrow()
  })
})
