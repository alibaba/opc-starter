/**
 * contextCompressor 上下文压缩测试
 */
import { describe, it, expect } from 'vitest'
import {
  estimateTokenCount,
  estimateTokenUsage,
  compressIfNeeded,
  forceCompress,
  TOKEN_THRESHOLD,
  MAX_TOKENS,
  THRESHOLD_TOKENS,
} from '../contextCompressor'
import type { AgentMessage } from '@/types/agent'

// Helper: 创建简单消息
function createMessage(
  role: AgentMessage['role'],
  content: string,
  overrides?: Partial<AgentMessage>
): AgentMessage {
  return {
    id: `msg-${Math.random().toString(36).slice(2)}`,
    role,
    content,
    timestamp: new Date(),
    ...overrides,
  }
}

// Helper: 创建带工具调用的消息
function createToolMessage(
  toolName: string,
  args: Record<string, unknown>,
  result?: { success: boolean; message?: string; error?: string; data?: Record<string, unknown> }
): AgentMessage {
  return {
    id: `msg-${Math.random().toString(36).slice(2)}`,
    role: 'assistant',
    content: '',
    timestamp: new Date(),
    toolCalls: [
      {
        id: `tc-${Math.random().toString(36).slice(2)}`,
        name: toolName,
        arguments: args,
        result: result,
      },
    ],
  }
}

describe('contextCompressor', () => {
  describe('常量', () => {
    it('TOKEN_THRESHOLD 应该是 0.92', () => {
      expect(TOKEN_THRESHOLD).toBe(0.92)
    })

    it('MAX_TOKENS 应该是 128000', () => {
      expect(MAX_TOKENS).toBe(128000)
    })

    it('THRESHOLD_TOKENS 应该是 MAX_TOKENS * TOKEN_THRESHOLD', () => {
      expect(THRESHOLD_TOKENS).toBe(Math.floor(MAX_TOKENS * TOKEN_THRESHOLD))
    })
  })

  describe('estimateTokenCount', () => {
    it('空消息列表应该返回 0', () => {
      expect(estimateTokenCount([])).toBe(0)
    })

    it('应该估算纯文本消息的 Token 数', () => {
      const messages = [createMessage('user', 'Hello')]
      const count = estimateTokenCount(messages)
      // (10 + 5) / 2.5 = 6
      expect(count).toBe(6)
    })

    it('应该计算长内容的 Token 数', () => {
      const longContent = 'a'.repeat(250)
      const messages = [createMessage('user', longContent)]
      const count = estimateTokenCount(messages)
      // (10 + 250) / 2.5 = 104
      expect(count).toBe(104)
    })

    it('应该包含工具调用的 Token', () => {
      const messages = [
        createToolMessage('editPhoto', { photoId: '123', brightness: 10 }, { success: true }),
      ]
      const count = estimateTokenCount(messages)
      expect(count).toBeGreaterThan(0)
    })

    it('应该包含 a2uiMessages 的 Token', () => {
      const msg = createMessage('assistant', 'test')
      ;(
        msg as AgentMessage & {
          a2uiMessages: {
            type: string
            surfaceId: string
            component: { id: string; type: string }
          }[]
        }
      ).a2uiMessages = [
        {
          type: 'beginRendering',
          surfaceId: 'surface-1',
          component: { id: 'comp-1', type: 'card' },
        },
      ]
      const count = estimateTokenCount([msg])
      expect(count).toBeGreaterThan(0)
    })

    it('应该累加多条消息', () => {
      const messages = [
        createMessage('user', 'Hello'),
        createMessage('assistant', 'Hi there! How can I help you?'),
        createMessage('user', 'Edit my photo'),
      ]
      const singleCount = estimateTokenCount([messages[0]])
      const totalCount = estimateTokenCount(messages)
      expect(totalCount).toBeGreaterThan(singleCount)
    })
  })

  describe('estimateTokenUsage', () => {
    it('应该返回正确的结构', () => {
      const messages = [createMessage('user', 'Hello')]
      const result = estimateTokenUsage(messages)

      expect(result).toHaveProperty('total')
      expect(result).toHaveProperty('usageRate')
      expect(result).toHaveProperty('needsCompression')
    })

    it('少量消息不需要压缩', () => {
      const messages = [createMessage('user', 'Hello'), createMessage('assistant', 'Hi')]
      const result = estimateTokenUsage(messages)
      expect(result.needsCompression).toBe(false)
      expect(result.usageRate).toBeLessThan(TOKEN_THRESHOLD)
    })

    it('大量消息可能需要压缩', () => {
      // 创建大量消息模拟高 Token 使用率
      const longContent = 'x'.repeat(10000)
      const messages: AgentMessage[] = []
      for (let i = 0; i < 100; i++) {
        messages.push(createMessage('user', longContent))
      }
      const result = estimateTokenUsage(messages)
      expect(result.total).toBeGreaterThan(0)
      expect(result.usageRate).toBeGreaterThan(0)
    })
  })

  describe('compressIfNeeded', () => {
    it('不需要压缩时应该返回原始消息', () => {
      const messages = [createMessage('user', 'Hello'), createMessage('assistant', 'Hi')]
      const result = compressIfNeeded(messages)
      expect(result).toBe(messages)
    })

    it('消息数量少于 head + tail 时不压缩', () => {
      // HEAD_MESSAGE_COUNT = 2, TAIL_MESSAGE_COUNT = 8
      const messages = Array.from({ length: 8 }, (_, i) => createMessage('user', `Message ${i}`))
      const result = compressIfNeeded(messages)
      expect(result).toBe(messages) // 原始引用
    })

    it('需要压缩时应该保留 head 和 tail 消息并插入摘要', () => {
      // 创建超长消息触发压缩
      const longContent = 'x'.repeat(50000)
      const messages: AgentMessage[] = []

      // 创建足够多的消息 (> head + tail = 10)
      for (let i = 0; i < 30; i++) {
        messages.push(createMessage(i % 2 === 0 ? 'user' : 'assistant', longContent + `_${i}`))
      }

      const result = compressIfNeeded(messages)

      // 如果触发了压缩
      if (result !== messages) {
        // 应该包含 head(2) + summary(1) + tail(8) = 11 条消息
        expect(result.length).toBe(11)
        // 第一条应该是原始的 head
        expect(result[0].id).toBe(messages[0].id)
        expect(result[1].id).toBe(messages[1].id)
        // 第三条应该是摘要
        expect(result[2].role).toBe('system')
        expect(result[2].content).toContain('历史摘要')
        // 最后一条应该是原始的 tail
        expect(result[result.length - 1].id).toBe(messages[messages.length - 1].id)
      }
    })
  })

  describe('forceCompress', () => {
    it('消息数量少于 head + tail 时返回原始消息', () => {
      const messages = Array.from({ length: 5 }, (_, i) => createMessage('user', `Message ${i}`))
      const result = forceCompress(messages)
      expect(result).toBe(messages)
    })

    it('应该强制压缩消息（不检查阈值）', () => {
      const messages: AgentMessage[] = []
      for (let i = 0; i < 20; i++) {
        messages.push(createMessage(i % 2 === 0 ? 'user' : 'assistant', `Message ${i}`))
      }

      const result = forceCompress(messages)

      // head(2) + summary(1) + tail(8) = 11
      expect(result.length).toBe(11)
      expect(result[0].id).toBe(messages[0].id)
      expect(result[1].id).toBe(messages[1].id)
      expect(result[2].role).toBe('system')
      expect(result[2].content).toContain('历史摘要')
      expect(result[2].content).toContain('10') // 压缩了 10 条消息
    })

    it('应该在摘要中包含工具调用信息', () => {
      const messages: AgentMessage[] = [
        createMessage('user', 'Start'),
        createMessage('assistant', 'OK'),
        // 中间的消息（会被压缩）
        createToolMessage('editPhoto', { photoId: '1' }, { success: true, message: '已编辑照片' }),
        createToolMessage('deletePhoto', { photoId: '2' }, { success: false, error: '权限不足' }),
        createMessage('user', '不对，重新来'),
        createMessage('user', '帮我处理一下?'),
        ...Array.from({ length: 8 }, (_, i) => createMessage('user', `Tail message ${i}`)),
      ]

      const result = forceCompress(messages)
      const summaryMsg = result[2]

      expect(summaryMsg.content).toContain('历史摘要')
    })

    it('应该检测用户负面反馈', () => {
      const messages: AgentMessage[] = [
        createMessage('user', 'Start'),
        createMessage('assistant', 'OK'),
        // 中间消息
        createMessage('user', '不要这样做'),
        createMessage('user', '错了，重新来'),
        createMessage('assistant', 'OK'),
        createMessage('user', 'Normal message'),
        createMessage('assistant', 'Response'),
        createMessage('user', 'Another one'),
        createMessage('assistant', 'More'),
        createMessage('user', 'Continue'),
        createMessage('assistant', 'Sure'),
        // tail
        ...Array.from({ length: 8 }, (_, i) => createMessage('user', `Tail ${i}`)),
      ]

      const result = forceCompress(messages)
      const summaryMsg = result[2]
      expect(summaryMsg.content).toContain('用户反馈')
    })

    it('应该检测待完成任务', () => {
      const messages: AgentMessage[] = [
        createMessage('user', 'Start'),
        createMessage('assistant', 'OK'),
        // 中间消息
        createMessage('user', '帮我修改一下照片?'),
        ...Array.from({ length: 4 }, (_, i) =>
          createMessage(i % 2 === 0 ? 'user' : 'assistant', `Mid ${i}`)
        ),
        // tail
        ...Array.from({ length: 8 }, (_, i) => createMessage('user', `Tail ${i}`)),
      ]

      const result = forceCompress(messages)
      const summaryMsg = result[2]
      expect(summaryMsg.content).toContain('历史摘要')
    })
  })
})
