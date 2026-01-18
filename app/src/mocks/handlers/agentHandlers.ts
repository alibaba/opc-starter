/**
 * AI Assistant Mock Handlers - Mock LLM 响应器
 * @description 为 AI Assistant SSE 请求提供 Mock 响应
 * @version 2.0.0
 * @see STORY-23-011
 */

import { http, HttpResponse } from 'msw'
import type { A2UIServerMessage } from '@/types/a2ui'

// ============ 类型定义 ============

interface MockAgentRequest {
  messages: Array<{ role: string; content: string; tool_call_id?: string }>
  context?: Record<string, unknown>
}

interface MockResponse {
  text?: string
  toolCalls?: Array<{
    id: string
    name: string
    arguments: Record<string, unknown>
  }>
  a2ui?: A2UIServerMessage
  thinking?: string
  error?: { message: string; code?: string }
}

// ============ Mock 响应生成 ============

/**
 * 根据用户消息内容返回对应的 Mock 响应
 */
function getMockResponse(content: string): MockResponse {
  const lowerContent = content.toLowerCase()

  // 导航场景 - 首页
  if (lowerContent.includes('首页') || lowerContent.includes('home')) {
    return {
      text: '好的，正在为您导航到首页',
      toolCalls: [
        {
          id: 'call_nav_home',
          name: 'navigateToPage',
          arguments: { page: 'home' },
        },
      ],
    }
  }

  // 导航场景 - 组织管理
  if (
    lowerContent.includes('组织') ||
    lowerContent.includes('团队') ||
    lowerContent.includes('成员')
  ) {
    return {
      text: '好的，正在为您导航到组织管理页面',
      toolCalls: [
        {
          id: 'call_nav_persons',
          name: 'navigateToPage',
          arguments: { page: 'persons' },
        },
      ],
    }
  }

  // 导航场景 - 个人中心
  if (
    lowerContent.includes('个人') ||
    lowerContent.includes('资料') ||
    lowerContent.includes('profile')
  ) {
    return {
      text: '好的，正在为您导航到个人中心',
      toolCalls: [
        {
          id: 'call_nav_profile',
          name: 'navigateToPage',
          arguments: { page: 'profile' },
        },
      ],
    }
  }

  // 导航场景 - 设置
  if (lowerContent.includes('设置') || lowerContent.includes('settings')) {
    return {
      text: '好的，正在为您导航到设置页面',
      toolCalls: [
        {
          id: 'call_nav_settings',
          name: 'navigateToPage',
          arguments: { page: 'settings' },
        },
      ],
    }
  }

  // 导航场景 - 云存储
  if (
    lowerContent.includes('存储') ||
    lowerContent.includes('storage') ||
    lowerContent.includes('文件')
  ) {
    return {
      text: '好的，正在为您导航到云存储设置页面',
      toolCalls: [
        {
          id: 'call_nav_storage',
          name: 'navigateToPage',
          arguments: { page: 'storage' },
        },
      ],
    }
  }

  // 获取上下文场景
  if (
    lowerContent.includes('当前') ||
    lowerContent.includes('在哪') ||
    lowerContent.includes('上下文')
  ) {
    return {
      text: '正在获取当前应用上下文信息',
      toolCalls: [
        {
          id: 'call_get_context',
          name: 'getCurrentContext',
          arguments: {},
        },
      ],
    }
  }

  // 帮助场景 - 显示功能介绍卡片
  if (
    lowerContent.includes('帮助') ||
    lowerContent.includes('help') ||
    lowerContent.includes('功能')
  ) {
    return {
      text: '我来为您介绍 OPC-Starter 的主要功能',
      a2ui: {
        type: 'beginRendering',
        surfaceId: 'help-surface-001',
        component: {
          type: 'card',
          id: 'help-card',
          props: {
            title: 'OPC-Starter 功能介绍',
          },
          children: [
            {
              type: 'text',
              id: 'help-text',
              props: {
                text: '🏠 首页 - 查看概览\n👥 组织管理 - 管理团队\n👤 个人中心 - 编辑资料\n⚙️ 设置 - 系统配置\n☁️ 云存储 - 文件管理',
              },
            },
          ],
        },
        dataModel: {},
      },
    }
  }

  // 思考过程测试
  if (lowerContent.includes('思考') || lowerContent.includes('thinking')) {
    return {
      thinking: '让我分析一下用户的需求...',
      text: '我已经理解了您的需求',
    }
  }

  // 错误场景测试
  if (lowerContent.includes('错误') || lowerContent.includes('error')) {
    return {
      error: { message: '模拟的错误消息', code: 'MOCK_ERROR' },
    }
  }

  // 默认响应
  return {
    text: '您好！我是 OPC 助手，可以帮您：\n\n• 导航到各个页面（首页、组织管理、个人中心等）\n• 了解平台功能\n• 解答使用问题\n\n请问有什么可以帮您的？',
  }
}

/**
 * 创建 SSE 流
 */
function createSSEStream(response: MockResponse): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder()

  return new ReadableStream({
    start(controller) {
      // 发送错误事件
      if (response.error) {
        controller.enqueue(
          encoder.encode(`event: error\ndata: ${JSON.stringify(response.error)}\n\n`)
        )
        controller.enqueue(encoder.encode(`event: done\ndata: {}\n\n`))
        controller.close()
        return
      }

      // 发送思考事件
      if (response.thinking) {
        controller.enqueue(
          encoder.encode(
            `event: thinking\ndata: ${JSON.stringify({ content: response.thinking })}\n\n`
          )
        )
      }

      // 发送文本增量事件（模拟流式输出）
      if (response.text) {
        // 将文本分成多个片段模拟流式输出
        const chunks = response.text.match(/.{1,10}/g) || [response.text]
        for (const chunk of chunks) {
          controller.enqueue(
            encoder.encode(`event: text_delta\ndata: ${JSON.stringify({ content: chunk })}\n\n`)
          )
        }
      }

      // 发送工具调用事件
      if (response.toolCalls) {
        for (const call of response.toolCalls) {
          controller.enqueue(encoder.encode(`event: tool_call\ndata: ${JSON.stringify(call)}\n\n`))
        }
      }

      // 发送 A2UI 事件
      if (response.a2ui) {
        controller.enqueue(
          encoder.encode(`event: a2ui\ndata: ${JSON.stringify(response.a2ui)}\n\n`)
        )
      }

      // 发送完成事件
      controller.enqueue(
        encoder.encode(
          `event: done\ndata: ${JSON.stringify({ usage: { prompt_tokens: 100, completion_tokens: 50 } })}\n\n`
        )
      )
      controller.close()
    },
  })
}

// ============ 预设响应场景 ============

/**
 * 预设的 Mock 响应场景，可用于特定测试
 */
export const mockScenarios = {
  navigateHome: {
    text: '正在导航到首页',
    toolCalls: [
      {
        id: 'call_nav_001',
        name: 'navigateToPage',
        arguments: { page: 'home' },
      },
    ],
  },
  helpCard: {
    text: '功能介绍',
    a2ui: {
      type: 'beginRendering' as const,
      surfaceId: 'help-001',
      component: {
        type: 'card',
        id: 'help-1',
        props: { title: '帮助' },
      },
    },
  },
  simpleText: {
    text: '这是一个简单的文本响应',
  },
  error: {
    error: { message: '测试错误', code: 'TEST_ERROR' },
  },
} as const

// ============ MSW Handlers ============

/**
 * AI Assistant Mock Handler
 */
export const agentHandlers = [
  http.post('*/functions/v1/ai-assistant', async ({ request }) => {
    try {
      const body = (await request.json()) as MockAgentRequest
      const messages = body.messages || []
      const lastMessage = messages[messages.length - 1]

      if (!lastMessage) {
        return new HttpResponse(createSSEStream({ text: '请输入您的问题' }), {
          headers: { 'Content-Type': 'text/event-stream' },
        })
      }

      // 根据消息内容获取响应
      const response = getMockResponse(lastMessage.content || '')

      return new HttpResponse(createSSEStream(response), {
        headers: { 'Content-Type': 'text/event-stream' },
      })
    } catch {
      return new HttpResponse(
        createSSEStream({
          error: { message: '解析请求失败', code: 'PARSE_ERROR' },
        }),
        { headers: { 'Content-Type': 'text/event-stream' } }
      )
    }
  }),
]

/**
 * 创建自定义响应的 Handler
 * @param response 自定义的 Mock 响应
 */
export function createCustomAgentHandler(response: MockResponse) {
  return http.post('*/functions/v1/ai-assistant', () => {
    return new HttpResponse(createSSEStream(response), {
      headers: { 'Content-Type': 'text/event-stream' },
    })
  })
}

export default agentHandlers
