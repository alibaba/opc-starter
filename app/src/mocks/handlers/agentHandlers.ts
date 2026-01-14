/**
 * Agent Mock Handlers - Mock LLM 响应器
 * @description 为 Agent SSE 请求提供 Mock 响应
 * @version 1.0.0
 * @see STORY-23-011
 */

import { http, HttpResponse } from 'msw';
import type { A2UIServerMessage } from '@/types/a2ui';

// ============ 类型定义 ============

interface MockAgentRequest {
  messages: Array<{ role: string; content: string; tool_call_id?: string }>;
  context?: Record<string, unknown>;
}

interface MockResponse {
  text?: string;
  toolCalls?: Array<{
    id: string;
    name: string;
    arguments: Record<string, unknown>;
  }>;
  a2ui?: A2UIServerMessage;
  thinking?: string;
  error?: { message: string; code?: string };
}

// ============ Mock 响应生成 ============

/**
 * 根据用户消息内容返回对应的 Mock 响应
 */
function getMockResponse(content: string): MockResponse {
  const lowerContent = content.toLowerCase();

  // 裁剪照片场景
  if (lowerContent.includes('裁剪') || lowerContent.includes('crop')) {
    return {
      text: '好的，我来帮您裁剪照片',
      toolCalls: [
        {
          id: 'call_crop_001',
          name: 'cropPhoto',
          arguments: { photoId: 'test-photo-1', aspectRatio: '16:9' },
        },
      ],
    };
  }

  // 旋转照片场景
  if (lowerContent.includes('旋转') || lowerContent.includes('rotate')) {
    return {
      text: '正在旋转照片',
      toolCalls: [
        {
          id: 'call_rotate_001',
          name: 'rotatePhoto',
          arguments: { photoId: 'test-photo-1', degrees: 90 },
        },
      ],
    };
  }

  // 滤镜场景
  if (lowerContent.includes('滤镜') || lowerContent.includes('filter')) {
    return {
      text: '请选择一个滤镜效果',
      a2ui: {
        type: 'beginRendering',
        surfaceId: 'filter-surface-001',
        component: {
          type: 'filter-selector',
          id: 'filter-selector-001',
          props: { currentFilter: 'none' },
          actions: { change: 'filter.select' },
        },
        dataModel: {
          availableFilters: ['none', 'vintage', 'bw', 'vivid', 'warm', 'cool'],
        },
      },
    };
  }

  // 融合照片场景
  if (lowerContent.includes('融合') || lowerContent.includes('fuse')) {
    return {
      text: '请输入融合提示词描述您想要的效果',
      a2ui: {
        type: 'beginRendering',
        surfaceId: 'fusion-surface-001',
        component: {
          type: 'container',
          id: 'fusion-container',
          children: [
            {
              type: 'input',
              id: 'fusion-prompt',
              props: { placeholder: '描述融合效果...' },
              actions: { change: 'fusion.setPrompt' },
            },
            {
              type: 'button',
              id: 'fusion-submit',
              props: { children: '开始融合' },
              actions: { click: 'fusion.start' },
            },
          ],
        },
      },
    };
  }

  // 生成视频场景
  if (lowerContent.includes('视频') || lowerContent.includes('video')) {
    return {
      text: '好的，我来帮您生成视频',
      toolCalls: [
        {
          id: 'call_video_001',
          name: 'generateVideo',
          arguments: {
            type: 'i2v',
            photoIds: ['test-photo-1'],
            duration: 5,
            prompt: '生成自然动态效果',
          },
        },
      ],
    };
  }

  // 获取当前照片场景
  if (lowerContent.includes('当前照片') || lowerContent.includes('current photo')) {
    return {
      text: '正在获取当前编辑的照片信息',
      toolCalls: [
        {
          id: 'call_get_current_001',
          name: 'getCurrentPhoto',
          arguments: {},
        },
      ],
    };
  }

  // 思考过程测试
  if (lowerContent.includes('思考') || lowerContent.includes('thinking')) {
    return {
      thinking: '让我分析一下用户的需求...',
      text: '我已经理解了您的需求',
    };
  }

  // 错误场景测试
  if (lowerContent.includes('错误') || lowerContent.includes('error')) {
    return {
      error: { message: '模拟的错误消息', code: 'MOCK_ERROR' },
    };
  }

  // 默认响应
  return { text: '您好，有什么可以帮您？我可以帮您编辑照片、应用滤镜、生成视频等。' };
}

/**
 * 创建 SSE 流
 */
function createSSEStream(response: MockResponse): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();

  return new ReadableStream({
    start(controller) {
      // 发送错误事件
      if (response.error) {
        controller.enqueue(
          encoder.encode(
            `event: error\ndata: ${JSON.stringify(response.error)}\n\n`
          )
        );
        controller.enqueue(encoder.encode(`event: done\ndata: {}\n\n`));
        controller.close();
        return;
      }

      // 发送思考事件
      if (response.thinking) {
        controller.enqueue(
          encoder.encode(
            `event: thinking\ndata: ${JSON.stringify({ content: response.thinking })}\n\n`
          )
        );
      }

      // 发送文本增量事件（模拟流式输出）
      if (response.text) {
        // 将文本分成多个片段模拟流式输出
        const chunks = response.text.match(/.{1,10}/g) || [response.text];
        for (const chunk of chunks) {
          controller.enqueue(
            encoder.encode(
              `event: text_delta\ndata: ${JSON.stringify({ content: chunk })}\n\n`
            )
          );
        }
      }

      // 发送工具调用事件
      if (response.toolCalls) {
        for (const call of response.toolCalls) {
          controller.enqueue(
            encoder.encode(`event: tool_call\ndata: ${JSON.stringify(call)}\n\n`)
          );
        }
      }

      // 发送 A2UI 事件
      if (response.a2ui) {
        controller.enqueue(
          encoder.encode(`event: a2ui\ndata: ${JSON.stringify(response.a2ui)}\n\n`)
        );
      }

      // 发送完成事件
      controller.enqueue(
        encoder.encode(
          `event: done\ndata: ${JSON.stringify({ usage: { prompt_tokens: 100, completion_tokens: 50 } })}\n\n`
        )
      );
      controller.close();
    },
  });
}

// ============ 预设响应场景 ============

/**
 * 预设的 Mock 响应场景，可用于特定测试
 */
export const mockScenarios = {
  cropPhoto: {
    text: '好的，我来帮您裁剪照片',
    toolCalls: [
      {
        id: 'call_crop_001',
        name: 'cropPhoto',
        arguments: { photoId: 'test-photo-1', aspectRatio: '16:9' },
      },
    ],
  },
  filterSelection: {
    text: '请选择滤镜',
    a2ui: {
      type: 'beginRendering' as const,
      surfaceId: 'filter-001',
      component: {
        type: 'filter-selector',
        id: 'filter-1',
        props: { currentFilter: 'none' },
        actions: { change: 'filter.select' },
      },
    },
  },
  simpleText: {
    text: '这是一个简单的文本响应',
  },
  error: {
    error: { message: '测试错误', code: 'TEST_ERROR' },
  },
} as const;

// ============ MSW Handlers ============

/**
 * Agent Gateway Mock Handler
 */
export const agentHandlers = [
  http.post('*/functions/v1/agent-gateway', async ({ request }) => {
    try {
      const body = (await request.json()) as MockAgentRequest;
      const messages = body.messages || [];
      const lastMessage = messages[messages.length - 1];

      if (!lastMessage) {
        return new HttpResponse(
          createSSEStream({ text: '请输入您的问题' }),
          { headers: { 'Content-Type': 'text/event-stream' } }
        );
      }

      // 根据消息内容获取响应
      const response = getMockResponse(lastMessage.content || '');

      return new HttpResponse(createSSEStream(response), {
        headers: { 'Content-Type': 'text/event-stream' },
      });
    } catch {
      return new HttpResponse(
        createSSEStream({
          error: { message: '解析请求失败', code: 'PARSE_ERROR' },
        }),
        { headers: { 'Content-Type': 'text/event-stream' } }
      );
    }
  }),
];

/**
 * 创建自定义响应的 Handler
 * @param response 自定义的 Mock 响应
 */
export function createCustomAgentHandler(response: MockResponse) {
  return http.post('*/functions/v1/agent-gateway', () => {
    return new HttpResponse(createSSEStream(response), {
      headers: { 'Content-Type': 'text/event-stream' },
    });
  });
}

export default agentHandlers;
