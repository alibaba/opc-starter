/**
 * useAgentContext - generateContextSummary 纯函数测试
 */
import { describe, it, expect } from 'vitest'
import { generateContextSummary } from '../useAgentContext'
import type { AgentContext } from '@/types/agent'

describe('generateContextSummary', () => {
  const baseContext: AgentContext = {
    currentPage: 'dashboard',
    selectedPhotos: [],
    editingState: undefined,
    currentAlbum: undefined,
    viewContext: {
      viewMode: 'mine' as const,
      teamId: null,
      teamName: null,
    },
  }

  it('应该生成 dashboard 页面摘要', () => {
    const result = generateContextSummary({ ...baseContext, currentPage: 'dashboard' })
    expect(result).toContain('首页')
  })

  it('应该生成 persons 页面摘要', () => {
    const result = generateContextSummary({ ...baseContext, currentPage: 'persons' })
    expect(result).toContain('组织管理')
  })

  it('应该生成 profile 页面摘要', () => {
    const result = generateContextSummary({ ...baseContext, currentPage: 'profile' })
    expect(result).toContain('个人中心')
  })

  it('应该生成 settings 页面摘要', () => {
    const result = generateContextSummary({ ...baseContext, currentPage: 'settings' })
    expect(result).toContain('系统设置')
  })

  it('应该生成 cloud-storage 页面摘要', () => {
    const result = generateContextSummary({ ...baseContext, currentPage: 'cloud-storage' })
    expect(result).toContain('云存储设置')
  })

  it('应该生成 other 页面摘要', () => {
    const result = generateContextSummary({ ...baseContext, currentPage: 'other' })
    expect(result).toContain('其他页面')
  })

  it('应该包含"当前页面"文本', () => {
    const result = generateContextSummary(baseContext)
    expect(result).toContain('当前页面')
  })
})
