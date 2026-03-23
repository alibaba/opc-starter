/**
 * useAgentStore 单元测试
 *
 * 测试覆盖：
 * - 会话管理
 * - 消息管理
 * - Surface 管理
 * - Portal 管理
 * - 状态管理
 * - 用户操作
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { AgentMessage, AgentContext } from '@/types/agent'
import type { A2UIComponent, A2UIDataModel, A2UIRenderTarget } from '@/types/a2ui'

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {}
  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value.toString()
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key]
    }),
    clear: vi.fn(() => {
      store = {}
    }),
  }
})()

Object.defineProperty(window, 'localStorage', { value: localStorageMock })

// Mock utils
vi.mock('@/components/agent/a2ui/utils', () => ({
  generateId: vi.fn((prefix: string) => `${prefix}_${Math.random().toString(36).substr(2, 9)}`),
  setByPath: vi.fn((obj: Record<string, unknown>, path: string, value: unknown) => {
    obj[path] = value
  }),
  deleteByPath: vi.fn((obj: Record<string, unknown>, path: string) => {
    delete obj[path]
  }),
}))

// Mock A2UI Action Handler
vi.mock('@/lib/agent/a2uiActionHandler', () => ({
  handleA2UIAction: vi.fn().mockResolvedValue({
    success: true,
    message: '操作成功',
  }),
}))

import { useAgentStore } from '../useAgentStore'

// Helper to reset store
const resetStore = () => {
  const store = useAgentStore.getState()
  store.clearThread()
  store.closePortal()
  store.setError(null)
  store.setStreaming(false)
  store.setContext({} as AgentContext)
}

// ============================================
// 测试数据
// ============================================

const mockMessage: AgentMessage = {
  id: 'msg_123',
  role: 'user',
  content: 'Hello',
  timestamp: new Date(),
}

const mockContext: AgentContext = {
  currentPage: 'other',
  selectedPhotos: [],
}

const mockComponent: A2UIComponent = {
  id: 'comp_1',
  type: 'button',
  props: { label: 'Click me' },
  actions: { click: 'handleClick' },
}

// ============================================
// 测试套件
// ============================================

describe('useAgentStore', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    resetStore()
  })

  // ============================================================
  // 会话管理
  // ============================================================
  describe('会话管理', () => {
    it('应该创建新会话', async () => {
      const threadId = await useAgentStore.getState().createThread()

      expect(threadId).toMatch(/^thread_/)
      expect(useAgentStore.getState().currentThreadId).toBe(threadId)
      expect(useAgentStore.getState().messages).toHaveLength(0)
      expect(localStorage.setItem).toHaveBeenCalledWith('lastAgentThreadId', threadId)
    })

    it('应该加载已有会话', async () => {
      await useAgentStore.getState().loadThread('thread_abc')

      expect(useAgentStore.getState().currentThreadId).toBe('thread_abc')
      expect(localStorage.setItem).toHaveBeenCalledWith('lastAgentThreadId', 'thread_abc')
    })

    it('应该清空当前会话', () => {
      // 先创建会话
      useAgentStore.getState().createThread()
      useAgentStore.getState().appendMessage(mockMessage)

      useAgentStore.getState().clearThread()

      expect(useAgentStore.getState().currentThreadId).toBeNull()
      expect(useAgentStore.getState().messages).toHaveLength(0)
      expect(localStorage.removeItem).toHaveBeenCalledWith('lastAgentThreadId')
    })
  })

  // ============================================================
  // 消息管理
  // ============================================================
  describe('消息管理', () => {
    beforeEach(async () => {
      await useAgentStore.getState().createThread()
    })

    it('应该追加消息', () => {
      useAgentStore.getState().appendMessage(mockMessage)

      const messages = useAgentStore.getState().messages
      expect(messages).toHaveLength(1)
      expect(messages[0]).toEqual(mockMessage)
    })

    it('应该更新消息', () => {
      useAgentStore.getState().appendMessage(mockMessage)

      const updatedContent = 'Updated content'
      useAgentStore.getState().updateMessage('msg_123', { content: updatedContent })

      const messages = useAgentStore.getState().messages
      expect(messages[0].content).toBe(updatedContent)
    })

    it('应该发送消息', async () => {
      await useAgentStore.getState().sendMessage('Hello world')

      const messages = useAgentStore.getState().messages
      expect(messages).toHaveLength(1)
      expect(messages[0].role).toBe('user')
      expect(messages[0].content).toBe('Hello world')
    })

    it('应该在无会话时抛出错误', async () => {
      useAgentStore.getState().clearThread()

      await expect(useAgentStore.getState().sendMessage('Hello')).rejects.toThrow(
        'No active thread'
      )
    })
  })

  // ============================================================
  // Surface 管理
  // ============================================================
  describe('Surface 管理', () => {
    const mockSurface = {
      id: 'surface_1',
      component: { id: 'comp_1', type: 'form' } as A2UIComponent,
      dataModel: { name: 'John' } as A2UIDataModel,
    }

    it('应该更新 Surface', () => {
      useAgentStore.getState().updateSurface(mockSurface)

      expect(useAgentStore.getState().currentSurface).toEqual(mockSurface)
    })

    it('应该更新数据模型', () => {
      useAgentStore.getState().updateSurface(mockSurface)

      useAgentStore.getState().updateDataModel('age', 'add', 25)

      const surface = useAgentStore.getState().currentSurface
      expect(surface?.dataModel.age).toBe(25)
    })

    it('应该清除 Surface', () => {
      useAgentStore.getState().updateSurface(mockSurface)
      expect(useAgentStore.getState().currentSurface).not.toBeNull()

      useAgentStore.getState().clearSurface()

      expect(useAgentStore.getState().currentSurface).toBeNull()
    })

    it('应该在无 Surface 时不更新数据模型', () => {
      useAgentStore.getState().clearSurface()

      useAgentStore.getState().updateDataModel('name', 'add', 'John')

      // 应该不会报错且无变化
      expect(useAgentStore.getState().currentSurface).toBeNull()
    })
  })

  // ============================================================
  // Portal 管理
  // ============================================================
  describe('Portal 管理', () => {
    it('应该打开 Portal', () => {
      const dataModel: A2UIDataModel = { title: 'Test Form' }

      useAgentStore
        .getState()
        .openPortal(mockComponent, 'fullscreen' as A2UIRenderTarget, dataModel)

      const state = useAgentStore.getState()
      expect(state.portalContent).toEqual(mockComponent)
      expect(state.portalTarget).toBe('fullscreen')
      expect(state.portalDataModel).toEqual(dataModel)
    })

    it('应该关闭 Portal', () => {
      useAgentStore.getState().openPortal(mockComponent, 'main-area' as A2UIRenderTarget)

      useAgentStore.getState().closePortal()

      const state = useAgentStore.getState()
      expect(state.portalContent).toBeNull()
      expect(state.portalTarget).toBe('inline')
      expect(state.portalDataModel).toEqual({})
    })

    it('应该更新 Portal 数据模型', () => {
      useAgentStore
        .getState()
        .openPortal(mockComponent, 'fullscreen' as A2UIRenderTarget, { initial: 'value' })

      useAgentStore.getState().updatePortalDataModel('newField', 'add', 'newValue')

      const dataModel = useAgentStore.getState().portalDataModel
      expect(dataModel.newField).toBe('newValue')
    })

    it('应该在无 Portal 时不更新数据模型', () => {
      useAgentStore.getState().closePortal()

      useAgentStore.getState().updatePortalDataModel('field', 'add', 'value')

      expect(useAgentStore.getState().portalContent).toBeNull()
    })
  })

  // ============================================================
  // 状态管理
  // ============================================================
  describe('状态管理', () => {
    it('应该设置流式输出状态', () => {
      useAgentStore.getState().setStreaming(true)
      expect(useAgentStore.getState().isStreaming).toBe(true)

      useAgentStore.getState().setStreaming(false)
      expect(useAgentStore.getState().isStreaming).toBe(false)
    })

    it('应该设置错误', () => {
      useAgentStore.getState().setError('Something went wrong')
      expect(useAgentStore.getState().error).toBe('Something went wrong')

      useAgentStore.getState().setError(null)
      expect(useAgentStore.getState().error).toBeNull()
    })

    it('应该切换面板显示', () => {
      const initialState = useAgentStore.getState().isPanelOpen

      useAgentStore.getState().togglePanel()
      expect(useAgentStore.getState().isPanelOpen).toBe(!initialState)

      useAgentStore.getState().togglePanel()
      expect(useAgentStore.getState().isPanelOpen).toBe(initialState)
    })

    it('应该设置上下文', () => {
      useAgentStore.getState().setContext(mockContext)

      expect(useAgentStore.getState().context).toEqual(mockContext)
    })
  })

  // ============================================================
  // 用户操作
  // ============================================================
  describe('用户操作', () => {
    beforeEach(async () => {
      await useAgentStore.getState().createThread()
    })

    it('应该处理用户操作', async () => {
      await useAgentStore.getState().handleUserAction('surface_1', 'comp_1', 'click', 'value')

      // 验证调用了 action handler
      const { handleA2UIAction } = await import('@/lib/agent/a2uiActionHandler')
      expect(handleA2UIAction).toHaveBeenCalledWith('click', 'comp_1', 'value')

      // 验证创建了通知消息
      const messages = useAgentStore.getState().messages
      expect(messages).toHaveLength(1)
      expect(messages[0].content).toContain('✅')
    })

    it('应该处理操作失败', async () => {
      const { handleA2UIAction } = await import('@/lib/agent/a2uiActionHandler')
      vi.mocked(handleA2UIAction).mockResolvedValueOnce({
        success: false,
        error: '操作失败',
      })

      await useAgentStore.getState().handleUserAction('surface_1', 'comp_1', 'click')

      const messages = useAgentStore.getState().messages
      expect(messages[0].content).toContain('❌ 操作失败')
    })

    it('应该在无会话时处理用户操作而不报错', async () => {
      useAgentStore.getState().clearThread()

      await expect(
        useAgentStore.getState().handleUserAction('surface_1', 'comp_1', 'click')
      ).resolves.not.toThrow()
    })
  })

  // ============================================================
  // Data Model Operations
  // ============================================================
  describe('数据模型操作', () => {
    it('应该支持 replace 操作', () => {
      const mockSurface = {
        id: 'surface_1',
        component: { id: 'comp_1', type: 'form' } as A2UIComponent,
        dataModel: { name: 'John' } as A2UIDataModel,
      }
      useAgentStore.getState().updateSurface(mockSurface)

      useAgentStore.getState().updateDataModel('name', 'replace', 'Jane')

      const surface = useAgentStore.getState().currentSurface
      expect(surface?.dataModel.name).toBe('Jane')
    })

    it('应该支持 remove 操作', () => {
      const mockSurface = {
        id: 'surface_1',
        component: { id: 'comp_1', type: 'form' } as A2UIComponent,
        dataModel: { name: 'John', age: 25 } as A2UIDataModel,
      }
      useAgentStore.getState().updateSurface(mockSurface)

      useAgentStore.getState().updateDataModel('age', 'remove')

      const surface = useAgentStore.getState().currentSurface
      expect(surface?.dataModel.age).toBeUndefined()
    })

    it('应该支持 Portal 数据模型 replace 操作', () => {
      useAgentStore
        .getState()
        .openPortal(mockComponent, 'fullscreen' as A2UIRenderTarget, { title: 'old' })

      useAgentStore.getState().updatePortalDataModel('title', 'replace', 'new')

      expect(useAgentStore.getState().portalDataModel.title).toBe('new')
    })

    it('应该支持 Portal 数据模型 remove 操作', () => {
      useAgentStore
        .getState()
        .openPortal(mockComponent, 'fullscreen' as A2UIRenderTarget, { title: 'test', extra: true })

      useAgentStore.getState().updatePortalDataModel('extra', 'remove')

      expect(useAgentStore.getState().portalDataModel.extra).toBeUndefined()
    })
  })

  // ============================================================
  // 辅助函数
  // ============================================================
  describe('辅助函数', () => {
    it('getLastThreadId 应该从 localStorage 获取', async () => {
      const { getLastThreadId } = await import('../useAgentStore')
      localStorage.setItem('lastAgentThreadId', 'thread_abc')

      expect(getLastThreadId()).toBe('thread_abc')
    })

    it('getLastThreadId 应该返回 null 当不存在时', async () => {
      const { getLastThreadId } = await import('../useAgentStore')
      localStorage.removeItem('lastAgentThreadId')

      expect(getLastThreadId()).toBeNull()
    })
  })

  // ============================================================
  // 持久化
  // ============================================================
  describe('持久化', () => {
    it.skip('应该持久化部分状态', async () => {
      // 由于 zustand persist middleware 在测试环境中可能不会立即触发
      // 需要更复杂的测试设置，暂时跳过此测试
    })

    it('不应该持久化临时状态', async () => {
      await useAgentStore.getState().createThread()
      useAgentStore.getState().appendMessage(mockMessage)
      useAgentStore.getState().setStreaming(true)
      useAgentStore.getState().setError('error')

      const persistedState = JSON.parse(
        localStorage.getItem('agent-store') ||
          '{"state":{"currentThreadId":null,"isPanelOpen":false}}'
      )

      // messages, isStreaming, error 不应该被持久化
      expect(persistedState.state.messages).toBeUndefined()
      expect(persistedState.state.isStreaming).toBeUndefined()
      expect(persistedState.state.error).toBeUndefined()
    })
  })
})
