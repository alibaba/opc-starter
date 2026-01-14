/**
 * SSE Client 测试
 * @description 测试 Agent SSE 客户端的流式通信和事件处理
 * @version 1.0.0
 * @see STORY-23-011
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useAgentSSE, RETRY_CONFIG, withRetry } from '../sseClient';
import type { AgentMessage } from '@/types/agent';

// ============ Mock Supabase ============

vi.mock('@/lib/supabase/client', () => ({
  supabase: {
    auth: {
      getSession: vi.fn().mockResolvedValue({
        data: {
          session: {
            access_token: 'mock-access-token',
            user: { id: 'test-user-001' },
          },
        },
      }),
    },
  },
}));

// ============ Mock 环境变量 ============

vi.stubEnv('VITE_SUPABASE_URL', 'https://test-project.supabase.co');

// ============ 辅助函数 ============

/**
 * 创建 Mock SSE 响应
 */
function createMockSSEResponse(events: string): Response {
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    start(controller) {
      controller.enqueue(encoder.encode(events));
      controller.close();
    },
  });

  return new Response(stream, {
    headers: { 'Content-Type': 'text/event-stream' },
  });
}

/**
 * 创建标准 SSE 事件字符串
 */
function createSSEEventString(
  eventType: string,
  data: Record<string, unknown>
): string {
  return `event: ${eventType}\ndata: ${JSON.stringify(data)}\n\n`;
}

// ============ 测试套件 ============

describe('useAgentSSE', () => {
  let originalFetch: typeof global.fetch;

  beforeEach(() => {
    originalFetch = global.fetch;
    vi.clearAllMocks();
  });

  afterEach(() => {
    global.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  // ============ 基础功能测试 ============

  describe('基础功能', () => {
    it('初始状态正确', () => {
      const { result } = renderHook(() => useAgentSSE());

      expect(result.current.isStreaming).toBe(false);
      expect(result.current.error).toBeNull();
      expect(result.current.retryCount).toBe(0);
      expect(typeof result.current.sendMessage).toBe('function');
      expect(typeof result.current.sendToolResult).toBe('function');
      expect(typeof result.current.abort).toBe('function');
    });

    it('提供 sendMessage 方法', () => {
      const { result } = renderHook(() => useAgentSSE());
      expect(result.current.sendMessage).toBeDefined();
    });

    it('提供 sendToolResult 方法', () => {
      const { result } = renderHook(() => useAgentSSE());
      expect(result.current.sendToolResult).toBeDefined();
    });

    it('提供 abort 方法', () => {
      const { result } = renderHook(() => useAgentSSE());
      expect(result.current.abort).toBeDefined();
    });
  });

  // ============ 文本增量事件测试 ============

  describe('text_delta 事件', () => {
    it('接收文本增量回调', async () => {
      const onTextDelta = vi.fn();
      const sseEvents =
        createSSEEventString('text_delta', { content: '你好' }) +
        createSSEEventString('text_delta', { content: '世界' }) +
        createSSEEventString('done', {});

      global.fetch = vi.fn().mockResolvedValue(createMockSSEResponse(sseEvents));

      const { result } = renderHook(() => useAgentSSE({ onTextDelta }));

      const messages: AgentMessage[] = [
        { id: '1', role: 'user', content: '你好', timestamp: new Date() },
      ];

      await act(async () => {
        await result.current.sendMessage(messages);
      });

      expect(onTextDelta).toHaveBeenCalledWith('你好');
      expect(onTextDelta).toHaveBeenCalledWith('世界');
    });

    it('正确解析分段的文本', async () => {
      const onTextDelta = vi.fn();
      const sseEvents =
        createSSEEventString('text_delta', { content: 'Hello ' }) +
        createSSEEventString('text_delta', { content: 'World!' }) +
        createSSEEventString('done', {});

      global.fetch = vi.fn().mockResolvedValue(createMockSSEResponse(sseEvents));

      const { result } = renderHook(() => useAgentSSE({ onTextDelta }));

      await act(async () => {
        await result.current.sendMessage([
          { id: '1', role: 'user', content: 'test', timestamp: new Date() },
        ]);
      });

      expect(onTextDelta).toHaveBeenCalledTimes(2);
    });
  });

  // ============ 工具调用事件测试 ============

  describe('tool_call 事件', () => {
    it('接收工具调用回调', async () => {
      const onToolCall = vi.fn();
      const sseEvents =
        createSSEEventString('tool_call', {
          id: 'call_001',
          name: 'cropPhoto',
          arguments: { photoId: 'test-1', aspectRatio: '16:9' },
        }) +
        createSSEEventString('done', {});

      global.fetch = vi.fn().mockResolvedValue(createMockSSEResponse(sseEvents));

      const { result } = renderHook(() => useAgentSSE({ onToolCall }));

      await act(async () => {
        await result.current.sendMessage([
          { id: '1', role: 'user', content: '裁剪照片', timestamp: new Date() },
        ]);
      });

      expect(onToolCall).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'call_001',
          name: 'cropPhoto',
          arguments: { photoId: 'test-1', aspectRatio: '16:9' },
        })
      );
    });

    it('接收多个工具调用', async () => {
      const onToolCall = vi.fn();
      const sseEvents =
        createSSEEventString('tool_call', {
          id: 'call_001',
          name: 'cropPhoto',
          arguments: { photoId: 'test-1' },
        }) +
        createSSEEventString('tool_call', {
          id: 'call_002',
          name: 'applyFilter',
          arguments: { filter: 'vintage' },
        }) +
        createSSEEventString('done', {});

      global.fetch = vi.fn().mockResolvedValue(createMockSSEResponse(sseEvents));

      const { result } = renderHook(() => useAgentSSE({ onToolCall }));

      await act(async () => {
        await result.current.sendMessage([
          { id: '1', role: 'user', content: '处理照片', timestamp: new Date() },
        ]);
      });

      expect(onToolCall).toHaveBeenCalledTimes(2);
    });
  });

  // ============ A2UI 事件测试 ============

  describe('a2ui 事件', () => {
    it('接收 A2UI 消息回调', async () => {
      const onA2UI = vi.fn();
      const a2uiMessage = {
        type: 'beginRendering',
        surfaceId: 'surface-001',
        component: {
          type: 'button',
          id: 'btn-1',
          props: { children: '确认' },
        },
      };

      const sseEvents =
        createSSEEventString('a2ui', a2uiMessage) +
        createSSEEventString('done', {});

      global.fetch = vi.fn().mockResolvedValue(createMockSSEResponse(sseEvents));

      const { result } = renderHook(() => useAgentSSE({ onA2UI }));

      await act(async () => {
        await result.current.sendMessage([
          { id: '1', role: 'user', content: '选择滤镜', timestamp: new Date() },
        ]);
      });

      expect(onA2UI).toHaveBeenCalledWith(a2uiMessage);
    });
  });

  // ============ 思考过程事件测试 ============

  describe('thinking 事件', () => {
    it('接收思考过程回调', async () => {
      const onThinking = vi.fn();
      const sseEvents =
        createSSEEventString('thinking', { content: '分析用户需求...' }) +
        createSSEEventString('text_delta', { content: '完成分析' }) +
        createSSEEventString('done', {});

      global.fetch = vi.fn().mockResolvedValue(createMockSSEResponse(sseEvents));

      const { result } = renderHook(() => useAgentSSE({ onThinking }));

      await act(async () => {
        await result.current.sendMessage([
          { id: '1', role: 'user', content: '思考', timestamp: new Date() },
        ]);
      });

      expect(onThinking).toHaveBeenCalledWith('分析用户需求...');
    });
  });

  // ============ 完成事件测试 ============

  describe('done 事件', () => {
    it('接收完成回调', async () => {
      const onDone = vi.fn();
      const sseEvents =
        createSSEEventString('text_delta', { content: '完成' }) +
        createSSEEventString('done', {
          usage: { prompt_tokens: 100, completion_tokens: 50 },
        });

      global.fetch = vi.fn().mockResolvedValue(createMockSSEResponse(sseEvents));

      const { result } = renderHook(() => useAgentSSE({ onDone }));

      await act(async () => {
        await result.current.sendMessage([
          { id: '1', role: 'user', content: 'test', timestamp: new Date() },
        ]);
      });

      expect(onDone).toHaveBeenCalledWith({
        prompt_tokens: 100,
        completion_tokens: 50,
      });
    });

    it('完成后 isStreaming 变为 false', async () => {
      const sseEvents =
        createSSEEventString('text_delta', { content: 'test' }) +
        createSSEEventString('done', {});

      global.fetch = vi.fn().mockResolvedValue(createMockSSEResponse(sseEvents));

      const { result } = renderHook(() => useAgentSSE());

      await act(async () => {
        await result.current.sendMessage([
          { id: '1', role: 'user', content: 'test', timestamp: new Date() },
        ]);
      });

      expect(result.current.isStreaming).toBe(false);
    });
  });

  // ============ 错误事件测试 ============

  describe('error 事件', () => {
    it('接收错误回调', async () => {
      const onError = vi.fn();
      const sseEvents =
        createSSEEventString('error', { message: '服务器错误', code: 'SERVER_ERROR' }) +
        createSSEEventString('done', {});

      global.fetch = vi.fn().mockResolvedValue(createMockSSEResponse(sseEvents));

      const { result } = renderHook(() => useAgentSSE({ onError }));

      await act(async () => {
        await result.current.sendMessage([
          { id: '1', role: 'user', content: 'error', timestamp: new Date() },
        ]);
      });

      expect(onError).toHaveBeenCalled();
      expect(result.current.error).toBeDefined();
    });

    it('HTTP 错误触发错误回调', async () => {
      const onError = vi.fn();

      global.fetch = vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ error: 'Unauthorized' }), {
          status: 401,
        })
      );

      const { result } = renderHook(() =>
        useAgentSSE({ onError, autoRetry: false })
      );

      await act(async () => {
        await result.current.sendMessage([
          { id: '1', role: 'user', content: 'test', timestamp: new Date() },
        ]);
      });

      expect(onError).toHaveBeenCalled();
      expect(result.current.error).not.toBeNull();
    });
  });

  // ============ 中断请求测试 ============

  describe('abort 功能', () => {
    it('调用 abort 后停止流式传输', async () => {
      // Promise 用于模拟挂起的请求，resolve 保留以便测试其他场景
      const requestPromise = new Promise<Response>(() => {
        // 故意不 resolve，模拟挂起的请求
      });

      global.fetch = vi.fn().mockReturnValue(requestPromise);

      const { result } = renderHook(() => useAgentSSE());

      // 开始请求（不等待完成）
      act(() => {
        result.current.sendMessage([
          { id: '1', role: 'user', content: 'test', timestamp: new Date() },
        ]);
      });

      // 中断请求
      act(() => {
        result.current.abort();
      });

      expect(result.current.isStreaming).toBe(false);
    });

    it('发送新消息会取消之前的请求', async () => {
      const sseEvents = createSSEEventString('done', {});
      global.fetch = vi.fn().mockResolvedValue(createMockSSEResponse(sseEvents));

      const { result } = renderHook(() => useAgentSSE({ autoRetry: false }));

      await act(async () => {
        // 发送第一条消息
        const promise1 = result.current.sendMessage([
          { id: '1', role: 'user', content: 'first', timestamp: new Date() },
        ]);

        // 发送第二条消息（应该取消第一条）
        const promise2 = result.current.sendMessage([
          { id: '2', role: 'user', content: 'second', timestamp: new Date() },
        ]);

        await Promise.all([promise1, promise2]);
      });

      // 应该调用了两次 fetch（关闭了自动重试）
      expect(global.fetch).toHaveBeenCalledTimes(2);
    });
  });

  // ============ 发送工具结果测试 ============

  describe('sendToolResult', () => {
    it('正确发送工具结果', async () => {
      const sseEvents =
        createSSEEventString('text_delta', { content: '工具执行成功' }) +
        createSSEEventString('done', {});

      global.fetch = vi.fn().mockResolvedValue(createMockSSEResponse(sseEvents));

      const { result } = renderHook(() => useAgentSSE());

      const messages: AgentMessage[] = [
        { id: '1', role: 'user', content: '裁剪照片', timestamp: new Date() },
        { id: '2', role: 'assistant', content: '', timestamp: new Date() },
      ];

      await act(async () => {
        await result.current.sendToolResult(messages, 'call_001', {
          success: true,
          message: '裁剪完成',
        });
      });

      expect(global.fetch).toHaveBeenCalled();
      const fetchCall = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
      const body = JSON.parse(fetchCall[1].body);

      expect(body.messages).toContainEqual(
        expect.objectContaining({
          role: 'tool',
          tool_call_id: 'call_001',
        })
      );
    });
  });

  // ============ 流式状态测试 ============

  describe('isStreaming 状态', () => {
    it('发送消息时变为 true', async () => {
      let resolveRequest: (value: Response) => void;
      const requestPromise = new Promise<Response>((resolve) => {
        resolveRequest = resolve;
      });

      global.fetch = vi.fn().mockReturnValue(requestPromise);

      const { result } = renderHook(() => useAgentSSE());

      // 开始请求
      act(() => {
        result.current.sendMessage([
          { id: '1', role: 'user', content: 'test', timestamp: new Date() },
        ]);
      });

      // 此时应该是 streaming
      expect(result.current.isStreaming).toBe(true);

      // 完成请求
      act(() => {
        resolveRequest!(
          createMockSSEResponse(createSSEEventString('done', {}))
        );
      });

      await waitFor(() => {
        expect(result.current.isStreaming).toBe(false);
      });
    });
  });
});

// ============ withRetry 测试 ============

describe('withRetry', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('成功时直接返回结果', async () => {
    const fn = vi.fn().mockResolvedValue('success');

    const resultPromise = withRetry(fn);
    await vi.runAllTimersAsync();
    const result = await resultPromise;

    expect(result).toBe('success');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('失败后重试', async () => {
    const fn = vi
      .fn()
      .mockRejectedValueOnce(new Error('First fail'))
      .mockResolvedValue('success');

    const resultPromise = withRetry(fn);
    await vi.runAllTimersAsync();
    const result = await resultPromise;

    expect(result).toBe('success');
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('达到最大重试次数后抛出错误', async () => {
    const fn = vi.fn().mockRejectedValue(new Error('Always fail'));

    // 使用 Promise.allSettled 来处理预期的拒绝
    const resultPromise = withRetry(fn, RETRY_CONFIG)
      .catch((e) => e); // 捕获拒绝并返回错误
    
    // 等待所有定时器完成
    await vi.runAllTimersAsync();

    const error = await resultPromise;
    expect(error).toBeInstanceOf(Error);
    expect((error as Error).message).toBe('Always fail');
    expect(fn).toHaveBeenCalledTimes(RETRY_CONFIG.maxRetries);
  });

  it('AbortError 不重试', async () => {
    const abortError = new Error('Aborted');
    abortError.name = 'AbortError';
    const fn = vi.fn().mockRejectedValue(abortError);

    const resultPromise = withRetry(fn);

    await expect(resultPromise).rejects.toThrow('Aborted');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('调用重试回调', async () => {
    const fn = vi
      .fn()
      .mockRejectedValueOnce(new Error('First fail'))
      .mockResolvedValue('success');
    const onRetry = vi.fn();

    const resultPromise = withRetry(fn, RETRY_CONFIG, onRetry);
    await vi.runAllTimersAsync();
    await resultPromise;

    expect(onRetry).toHaveBeenCalledWith(1, expect.any(Error));
  });
});

// ============ RETRY_CONFIG 测试 ============

describe('RETRY_CONFIG', () => {
  it('包含正确的配置项', () => {
    expect(RETRY_CONFIG).toMatchObject({
      maxRetries: expect.any(Number),
      baseDelay: expect.any(Number),
      maxDelay: expect.any(Number),
      backoffMultiplier: expect.any(Number),
    });
  });

  it('maxRetries 大于 0', () => {
    expect(RETRY_CONFIG.maxRetries).toBeGreaterThan(0);
  });

  it('baseDelay 小于 maxDelay', () => {
    expect(RETRY_CONFIG.baseDelay).toBeLessThan(RETRY_CONFIG.maxDelay);
  });
});
