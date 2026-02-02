/**
 * Agent 上下文感知推荐配置测试
 * @description 测试根据页面和上下文状态生成智能推荐的逻辑
 * @version 2.0.0 - 适配 OPC-Starter 简化页面类型
 */

import { describe, it, expect } from 'vitest'
import { getContextualSuggestions, PAGE_SUGGESTIONS, GLOBAL_SUGGESTIONS } from '../agentSuggestions'
import type { AgentContext } from '@/types/agent'

// 创建基础上下文
function createBaseContext(
  currentPage: AgentContext['currentPage'],
  overrides: Partial<AgentContext> = {}
): AgentContext {
  return {
    currentPage,
    selectedPhotos: [],
    ...overrides,
  }
}

describe('agentSuggestions', () => {
  describe('PAGE_SUGGESTIONS 配置', () => {
    it('应该为每个页面类型定义推荐配置', () => {
      const expectedPages: AgentContext['currentPage'][] = [
        'dashboard',
        'persons',
        'profile',
        'settings',
        'cloud-storage',
        'other',
      ]

      expectedPages.forEach((page) => {
        expect(PAGE_SUGGESTIONS[page]).toBeDefined()
        expect(PAGE_SUGGESTIONS[page].suggestions).toBeInstanceOf(Array)
        expect(PAGE_SUGGESTIONS[page].suggestions.length).toBeGreaterThan(0)
      })
    })

    it('dashboard 页面应该有组织管理和个人信息推荐', () => {
      const dashboardSuggestions = PAGE_SUGGESTIONS.dashboard.suggestions

      const hasOrgSuggestion = dashboardSuggestions.some((s) => s.text.includes('组织'))
      const hasProfileSuggestion = dashboardSuggestions.some((s) => s.text.includes('个人'))

      expect(hasOrgSuggestion).toBe(true)
      expect(hasProfileSuggestion).toBe(true)
    })

    it('persons 页面应该有创建组织和添加成员推荐', () => {
      const personsSuggestions = PAGE_SUGGESTIONS.persons.suggestions

      const hasCreateOrg = personsSuggestions.some((s) => s.text.includes('创建'))
      const hasAddMember = personsSuggestions.some((s) => s.text.includes('添加'))

      expect(hasCreateOrg).toBe(true)
      expect(hasAddMember).toBe(true)
    })

    it('profile 页面应该有更新信息和修改头像推荐', () => {
      const profileSuggestions = PAGE_SUGGESTIONS.profile.suggestions

      const hasUpdateInfo = profileSuggestions.some(
        (s) => s.text.includes('更新') || s.text.includes('修改')
      )

      expect(hasUpdateInfo).toBe(true)
    })
  })

  describe('getContextualSuggestions', () => {
    describe('dashboard 页面', () => {
      it('应该返回 dashboard 页面的推荐', () => {
        const context = createBaseContext('dashboard')
        const result = getContextualSuggestions(context)

        expect(result.suggestions.length).toBeGreaterThan(0)
        expect(result.contextInfo).toContain('dashboard')
      })
    })

    describe('persons 页面', () => {
      it('应该返回组织管理相关推荐', () => {
        const context = createBaseContext('persons')
        const result = getContextualSuggestions(context)

        expect(result.suggestions.length).toBeGreaterThan(0)
        expect(result.contextInfo).toContain('persons')
      })
    })

    describe('profile 页面', () => {
      it('应该返回个人信息相关推荐', () => {
        const context = createBaseContext('profile')
        const result = getContextualSuggestions(context)

        expect(result.suggestions.length).toBeGreaterThan(0)
        expect(result.contextInfo).toContain('profile')
      })
    })

    describe('settings 页面', () => {
      it('应该返回设置相关推荐', () => {
        const context = createBaseContext('settings')
        const result = getContextualSuggestions(context)

        expect(result.suggestions.length).toBeGreaterThan(0)
        expect(result.contextInfo).toContain('settings')
      })
    })

    describe('cloud-storage 页面', () => {
      it('应该返回云存储相关推荐', () => {
        const context = createBaseContext('cloud-storage')
        const result = getContextualSuggestions(context)

        expect(result.suggestions.length).toBeGreaterThan(0)
        expect(result.contextInfo).toContain('cloud-storage')
      })
    })

    describe('other 页面', () => {
      it('应该返回通用导航推荐', () => {
        const context = createBaseContext('other')
        const result = getContextualSuggestions(context)

        expect(result.suggestions.length).toBeGreaterThan(0)
        // 应该有回到首页的推荐
        const hasHomeNav = result.suggestions.some((s) => s.text.includes('首页'))
        expect(hasHomeNav).toBe(true)
      })
    })
  })

  describe('GLOBAL_SUGGESTIONS', () => {
    it('应该包含通用推荐', () => {
      expect(GLOBAL_SUGGESTIONS.length).toBeGreaterThan(0)
      expect(GLOBAL_SUGGESTIONS.some((s) => s.text.includes('搜索'))).toBe(true)
    })
  })
})
