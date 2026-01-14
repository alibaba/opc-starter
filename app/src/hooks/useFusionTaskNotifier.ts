/**
 * useFusionTaskNotifier Hook - 融合任务完成通知器
 * @description 监听融合任务状态变化，任务完成时通知 Agent 继续对话
 * @version 1.0.0
 * @see STORY-23-008
 */

import { useEffect, useCallback, useRef } from 'react';
import { useAIFusionStore } from '@/stores/useAIFusionStore';
import { useAgentStore } from '@/stores/useAgentStore';
import { setFusionTaskCallback } from '@/lib/agent/toolExecutor';
import type { AgentMessage, AgentMessageRole } from '@/types/agent';
import type { A2UIComponent, BeginRenderingMessage } from '@/types/a2ui';

/**
 * 生成唯一 ID
 */
function generateId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

/**
 * 融合任务通知器配置
 */
export interface UseFusionTaskNotifierOptions {
  /** 是否自动创建 A2UI Surface 显示结果 */
  autoRenderResult?: boolean;
}

/**
 * 融合任务通知器 Hook
 * @description 监听融合任务完成状态，生成 Agent 通知消息和 A2UI Surface
 */
export function useFusionTaskNotifier(options: UseFusionTaskNotifierOptions = {}) {
  const { autoRenderResult = true } = options;

  // 已通知的任务 ID 集合（避免重复通知）
  const notifiedTasksRef = useRef<Set<string>>(new Set());

  // Store 方法
  const appendMessage = useAgentStore((s) => s.appendMessage);
  const updateSurface = useAgentStore((s) => s.updateSurface);
  const tasks = useAIFusionStore((s) => s.tasks);

  /**
   * 生成融合完成的 A2UI 组件
   */
  const generateCompletedUI = useCallback((taskId: string, resultPhotoId: string): A2UIComponent => {
    return {
      type: 'card',
      id: `fusion-result-${taskId}`,
      children: [
        {
          type: 'text',
          id: 'result-title',
          props: { text: '✨ 融合完成！', variant: 'h4' },
        },
        {
          type: 'photo-preview',
          id: 'result-photo',
          props: { 
            photoId: resultPhotoId,
            showBadges: true,
          },
        },
        {
          type: 'flex',
          id: 'actions',
          props: { direction: 'row', gap: 2 },
          children: [
            {
              type: 'button',
              id: 'view-btn',
              props: { text: '查看详情', variant: 'outline' },
              actions: { onClick: 'navigation.goToPhoto' },
            },
            {
              type: 'button',
              id: 'save-btn',
              props: { text: '保存到相册', variant: 'default' },
              actions: { onClick: 'photo.saveToAlbum' },
            },
          ],
        },
      ],
    };
  }, []);

  /**
   * 生成融合失败的 A2UI 组件
   */
  const generateFailedUI = useCallback((taskId: string, errorMessage: string): A2UIComponent => {
    return {
      type: 'card',
      id: `fusion-error-${taskId}`,
      children: [
        {
          type: 'text',
          id: 'error-title',
          props: { text: '❌ 融合失败', variant: 'h4' },
        },
        {
          type: 'text',
          id: 'error-message',
          props: { text: errorMessage, variant: 'muted' },
        },
        {
          type: 'button',
          id: 'retry-btn',
          props: { text: '重新尝试', variant: 'outline' },
          actions: { onClick: 'ai.fusion.retry' },
        },
      ],
    };
  }, []);

  /**
   * 处理任务完成通知
   */
  const handleTaskCompleted = useCallback(
    (taskId: string, status: 'completed' | 'failed', result?: { resultPhotoId?: string; errorMessage?: string }) => {
      // 避免重复通知
      if (notifiedTasksRef.current.has(taskId)) {
        console.log('[FusionNotifier] 任务已通知，跳过:', taskId);
        return;
      }

      console.log('[FusionNotifier] 处理任务完成:', { taskId, status, result });
      notifiedTasksRef.current.add(taskId);

      // 创建通知消息
      const message: AgentMessage = {
        id: generateId('msg'),
        role: 'assistant' as AgentMessageRole,
        content: status === 'completed'
          ? '🎉 图片融合已完成！您可以查看和保存结果。'
          : `😔 很抱歉，融合过程中出现了问题：${result?.errorMessage || '未知错误'}。您可以尝试调整描述后重新融合。`,
        timestamp: new Date(),
        isStreaming: false,
      };

      // 追加消息
      appendMessage(message);

      // 如果配置了自动渲染结果 UI
      if (autoRenderResult) {
        const surfaceId = `fusion-surface-${taskId}`;
        let component: A2UIComponent;
        let dataModel = {};

        if (status === 'completed' && result?.resultPhotoId) {
          component = generateCompletedUI(taskId, result.resultPhotoId);
          dataModel = {
            task: { id: taskId, resultPhotoId: result.resultPhotoId },
          };
        } else {
          component = generateFailedUI(taskId, result?.errorMessage || '未知错误');
          dataModel = {
            task: { id: taskId, errorMessage: result?.errorMessage },
          };
        }

        // 更新 Surface
        updateSurface({
          id: surfaceId,
          component,
          dataModel,
        });

        // 同时更新消息中的 A2UI 引用
        const a2uiMessage: BeginRenderingMessage = {
          type: 'beginRendering',
          surfaceId,
          component,
          dataModel,
        };

        // 更新消息
        useAgentStore.getState().updateMessage(message.id, {
          a2uiMessages: [a2uiMessage],
        });
      }
    },
    [appendMessage, updateSurface, autoRenderResult, generateCompletedUI, generateFailedUI]
  );

  // 注册回调到 Tool Executor
  useEffect(() => {
    console.log('[FusionNotifier] 注册任务完成回调');
    setFusionTaskCallback(handleTaskCompleted);

    return () => {
      console.log('[FusionNotifier] 清除任务完成回调');
      setFusionTaskCallback(null);
    };
  }, [handleTaskCompleted]);

  // 额外监听 Store 中的任务状态变化（作为备用机制）
  useEffect(() => {
    const completedOrFailedTasks = tasks.filter(
      (t) => (t.status === 'completed' || t.status === 'failed') && !notifiedTasksRef.current.has(t.id)
    );

    for (const task of completedOrFailedTasks) {
      handleTaskCompleted(task.id, task.status as 'completed' | 'failed', {
        resultPhotoId: task.result_photo_id || undefined,
        errorMessage: task.error_message || undefined,
      });
    }
  }, [tasks, handleTaskCompleted]);

  /**
   * 获取当前进行中的任务
   */
  const getActiveTasks = useCallback(() => {
    return tasks.filter((t) => t.status === 'pending' || t.status === 'processing');
  }, [tasks]);

  /**
   * 清除通知记录（用于测试）
   */
  const clearNotifiedTasks = useCallback(() => {
    notifiedTasksRef.current.clear();
  }, []);

  return {
    /** 当前进行中的任务 */
    activeTasks: getActiveTasks(),
    /** 清除通知记录 */
    clearNotifiedTasks,
  };
}

export default useFusionTaskNotifier;
