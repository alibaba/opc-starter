/**
 * a2uiActionHandler A2UI action 处理器测试
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { handleA2UIAction } from '../a2uiActionHandler'

describe('a2uiActionHandler', () => {
  let originalHref: string

  beforeEach(() => {
    originalHref = window.location.href
    // Mock window.location
    Object.defineProperty(window, 'location', {
      value: { href: originalHref },
      writable: true,
      configurable: true,
    })
  })

  afterEach(() => {
    Object.defineProperty(window, 'location', {
      value: { href: originalHref },
      writable: true,
      configurable: true,
    })
  })

  describe('导航操作', () => {
    it('应该导航到 dashboard', async () => {
      const result = await handleA2UIAction('navigation.dashboard', 'comp-1')
      expect(result.success).toBe(true)
      expect(result.message).toContain('/')
      expect(window.location.href).toBe('/')
    })

    it('应该导航到 persons', async () => {
      const result = await handleA2UIAction('navigation.persons', 'comp-1')
      expect(result.success).toBe(true)
      expect(window.location.href).toBe('/persons')
    })

    it('应该导航到 profile', async () => {
      const result = await handleA2UIAction('navigation.profile', 'comp-1')
      expect(result.success).toBe(true)
      expect(window.location.href).toBe('/profile')
    })

    it('应该导航到 settings', async () => {
      const result = await handleA2UIAction('navigation.settings', 'comp-1')
      expect(result.success).toBe(true)
      expect(window.location.href).toBe('/settings')
    })

    it('应该导航到 cloudStorage', async () => {
      const result = await handleA2UIAction('navigation.cloudStorage', 'comp-1')
      expect(result.success).toBe(true)
      expect(window.location.href).toBe('/settings/cloud-storage')
    })
  })

  describe('兼容性导航', () => {
    it('timeline 应该导航到首页', async () => {
      const result = await handleA2UIAction('navigation.timeline', 'comp-1')
      expect(result.success).toBe(true)
      expect(window.location.href).toBe('/')
    })

    it('albums 应该导航到首页', async () => {
      const result = await handleA2UIAction('navigation.albums', 'comp-1')
      expect(result.success).toBe(true)
      expect(window.location.href).toBe('/')
    })

    it('search 应该返回错误', async () => {
      const result = await handleA2UIAction('navigation.search', 'comp-1')
      expect(result.success).toBe(false)
      expect(result.error).toContain('搜索功能已移除')
    })
  })

  describe('已移除功能', () => {
    const removedActions = [
      'photo.edit.saveAsNew',
      'photo.edit.reset',
      'photo.edit.undo',
      'photo.edit.redo',
      'photo.edit.confirm',
      'navigation.openEditor',
      'navigation.openAIStudio',
    ]

    removedActions.forEach((actionId) => {
      it(`${actionId} 应该返回错误`, async () => {
        const result = await handleA2UIAction(actionId, 'comp-1')
        expect(result.success).toBe(false)
        expect(result.error).toContain('Photo 编辑功能已移除')
      })
    })
  })

  describe('未知操作', () => {
    it('应该返回错误', async () => {
      const result = await handleA2UIAction('unknown.action', 'comp-1')
      expect(result.success).toBe(false)
      expect(result.error).toContain('未知操作')
      expect(result.error).toContain('unknown.action')
    })
  })
})
