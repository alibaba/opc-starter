/**
 * Agent Store - AI 助手状态管理
 * @description 管理 AI 助手的对话、Surface 和上下文状态
 * @version 1.0.0
 * @see STORY-23-007
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  AgentState,
  AgentActions,
  AgentMessage,
  AgentContext,
  AgentMessageRole,
} from '@/types/agent';
import type {
  A2UIServerMessage,
  A2UIComponent,
  A2UIDataModel,
  A2UIRenderTarget,
} from '@/types/a2ui';
import { setByPath, deleteByPath } from '@/components/agent/a2ui/utils';
import { generateId } from '@/components/agent/a2ui/utils';

/**
 * Agent Store 完整类型
 */
type AgentStore = AgentState & AgentActions;

/**
 * 初始状态
 */
const initialState: AgentState = {
  currentThreadId: null,
  messages: [],
  currentSurface: null,
  // Portal 状态 (STORY-23-012)
  portalContent: null,
  portalTarget: 'inline',
  portalDataModel: {},
  // UI 状态
  isStreaming: false,
  error: null,
  isPanelOpen: false,
  context: null,
};

/**
 * 持久化存储的字段
 */
interface PersistedAgentState {
  currentThreadId: string | null;
  isPanelOpen: boolean;
}

/**
 * 创建 Agent Store
 */
export const useAgentStore = create<AgentStore>()(
  persist(
    (set, get) => ({
      // ===== 初始状态 =====
      ...initialState,

      // ===== 会话管理 =====

      /**
       * 创建新会话
       */
      createThread: async () => {
        const threadId = generateId('thread');

        set({
          currentThreadId: threadId,
          messages: [],
          currentSurface: null,
          error: null,
        });

        // 保存到 localStorage
        localStorage.setItem('lastAgentThreadId', threadId);

        return threadId;
      },

      /**
       * 加载已有会话
       */
      loadThread: async (threadId: string) => {
        // TODO: 从 Supabase 加载会话数据
        // 目前先创建空状态
        set({
          currentThreadId: threadId,
          messages: [],
          currentSurface: null,
          error: null,
        });

        localStorage.setItem('lastAgentThreadId', threadId);
      },

      /**
       * 清空当前会话
       */
      clearThread: () => {
        set({
          currentThreadId: null,
          messages: [],
          currentSurface: null,
          error: null,
        });

        localStorage.removeItem('lastAgentThreadId');
      },

      // ===== 消息管理 =====

      /**
       * 发送消息（占位实现，实际逻辑在 Service 层）
       */
      sendMessage: async (content: string) => {
        const { currentThreadId, appendMessage, context } = get();

        if (!currentThreadId) {
          throw new Error('No active thread');
        }

        // 创建用户消息
        const userMessage: AgentMessage = {
          id: generateId('msg'),
          role: 'user' as AgentMessageRole,
          content,
          timestamp: new Date(),
        };

        appendMessage(userMessage);

        // TODO: 调用 AI 服务发送消息
        // 实际实现将在 AgentService 中
        console.log('[AgentStore] 发送消息:', {
          threadId: currentThreadId,
          content,
          context,
        });
      },

      /**
       * 追加消息
       */
      appendMessage: (message: AgentMessage) => {
        set((state) => ({
          messages: [...state.messages, message],
        }));
      },

      /**
       * 更新消息
       */
      updateMessage: (id: string, updates: Partial<AgentMessage>) => {
        set((state) => ({
          messages: state.messages.map((msg) =>
            msg.id === id ? { ...msg, ...updates } : msg
          ),
        }));
      },

      // ===== Surface 管理 =====

      /**
       * 更新 Surface
       */
      updateSurface: (surface: AgentState['currentSurface']) => {
        set({ currentSurface: surface });
      },

      /**
       * 更新数据模型
       */
      updateDataModel: (
        path: string,
        op: 'replace' | 'add' | 'remove',
        value?: unknown
      ) => {
        set((state) => {
          if (!state.currentSurface) return state;

          const newDataModel = { ...state.currentSurface.dataModel };

          switch (op) {
            case 'replace':
            case 'add':
              setByPath(newDataModel, path, value);
              break;
            case 'remove':
              deleteByPath(newDataModel, path);
              break;
          }

          return {
            currentSurface: {
              ...state.currentSurface,
              dataModel: newDataModel,
            },
          };
        });
      },

      /**
       * 清空 Surface
       */
      clearSurface: () => {
        set({ currentSurface: null });
      },

      // ===== Portal 管理 (STORY-23-012) =====

      /**
       * 打开 Portal
       */
      openPortal: (
        component: A2UIComponent,
        target: A2UIRenderTarget,
        dataModel: A2UIDataModel = {}
      ) => {
        set({
          portalContent: component,
          portalTarget: target,
          portalDataModel: dataModel,
        });
      },

      /**
       * 关闭 Portal
       */
      closePortal: () => {
        set({
          portalContent: null,
          portalTarget: 'inline',
          portalDataModel: {},
        });
      },

      /**
       * 更新 Portal 数据模型
       */
      updatePortalDataModel: (
        path: string,
        op: 'replace' | 'add' | 'remove',
        value?: unknown
      ) => {
        set((state) => {
          if (!state.portalContent) return state;

          const newDataModel = { ...state.portalDataModel };

          switch (op) {
            case 'replace':
            case 'add':
              setByPath(newDataModel, path, value);
              break;
            case 'remove':
              deleteByPath(newDataModel, path);
              break;
          }

          return { portalDataModel: newDataModel };
        });
      },

      // ===== 状态管理 =====

      /**
       * 设置流式输出状态
       */
      setStreaming: (isStreaming: boolean) => {
        set({ isStreaming });
      },

      /**
       * 设置错误
       */
      setError: (error: string | null) => {
        set({ error });
      },

      /**
       * 切换面板显示
       */
      togglePanel: () => {
        set((state) => ({ isPanelOpen: !state.isPanelOpen }));
      },

      /**
       * 设置上下文
       */
      setContext: (context: AgentContext) => {
        set({ context });
      },

      // ===== 用户操作 =====

      /**
       * 处理用户在 Surface 上的操作
       */
      handleUserAction: async (
        surfaceId: string,
        componentId: string,
        actionId: string,
        value?: unknown
      ) => {
        const { currentThreadId, appendMessage } = get();

        if (!currentThreadId) {
          console.error('[AgentStore] 无活动会话，无法处理用户操作');
          return;
        }

        console.log('[AgentStore] 处理用户操作:', {
          surfaceId,
          componentId,
          actionId,
          value,
        });

        // 调用 A2UI Action Handler 执行本地操作
        const { handleA2UIAction } = await import('@/lib/agent/a2uiActionHandler');
        const result = await handleA2UIAction(actionId, componentId, value);

        console.log('[AgentStore] Action 执行结果:', result);

        // 根据操作结果创建助手消息通知用户
        if (result.message || result.error) {
          const notificationMessage: AgentMessage = {
            id: generateId('msg'),
            role: 'assistant' as AgentMessageRole,
            content: result.success
              ? `✅ ${result.message}`
              : `❌ ${result.error}`,
            timestamp: new Date(),
          };
          appendMessage(notificationMessage);
        }
      },
    }),
    {
      name: 'agent-store',
      // 只持久化部分状态
      partialize: (state): PersistedAgentState => ({
        currentThreadId: state.currentThreadId,
        isPanelOpen: state.isPanelOpen,
      }),
    }
  )
);

// ===== 辅助 Hooks =====

/**
 * 检测是否为移动端
 */
function isMobileDevice(): boolean {
  return typeof window !== 'undefined' && window.innerWidth < 768;
}

/**
 * 处理 A2UI 服务端消息
 * @story STORY-23-012 - 添加 renderTarget 路由逻辑
 */
export function useA2UIMessageHandler() {
  const {
    updateSurface,
    updateDataModel,
    clearSurface,
    openPortal,
    closePortal,
    updatePortalDataModel,
  } = useAgentStore();

  const handleMessage = (message: A2UIServerMessage) => {
    switch (message.type) {
      case 'beginRendering': {
        const { component, surfaceId, dataModel } = message;

        // 防御性检查：如果 component 未定义，记录警告并跳过
        if (!component) {
          console.warn('[A2UI] beginRendering 消息缺少 component:', message);
          return;
        }

        const requestedTarget = component.renderTarget || 'inline';

        // 移动端：main-area 自动升级为 fullscreen (STORY-23-012)
        const effectiveTarget =
          isMobileDevice() && requestedTarget === 'main-area'
            ? 'fullscreen'
            : requestedTarget;

        // 根据 renderTarget 路由到不同渲染位置
        if (effectiveTarget === 'inline') {
          // 默认：渲染到对话框内
          updateSurface({
            id: surfaceId,
            component,
            dataModel: dataModel || {},
          });
        } else {
          // main-area / fullscreen / split：渲染到 Portal
          openPortal(component, effectiveTarget, dataModel);
        }
        break;
      }

      case 'surfaceUpdate': {
        // 防御性检查：如果 component 未定义，记录警告并跳过
        if (!message.component) {
          console.warn('[A2UI] surfaceUpdate 消息缺少 component:', message);
          return;
        }

        // 检查是 Portal 还是 Surface 更新
        const portalContent = useAgentStore.getState().portalContent;
        const currentSurface = useAgentStore.getState().currentSurface;

        // 如果有 Portal 且 ID 匹配，更新 Portal
        if (portalContent && portalContent.id === message.component.id) {
          const portalDataModel = useAgentStore.getState().portalDataModel;
          openPortal(
            message.component,
            useAgentStore.getState().portalTarget,
            portalDataModel
          );
        } else if (!currentSurface || currentSurface.id !== message.surfaceId) {
          updateSurface({
            id: message.surfaceId,
            component: message.component,
            dataModel: {},
          });
        } else {
          updateSurface({
            ...currentSurface,
            component: message.component,
          });
        }
        break;
      }

      case 'dataModelUpdate': {
        // 检查更新目标是 Portal 还是 Surface
        const portalContent = useAgentStore.getState().portalContent;
        if (portalContent) {
          // 如果 Portal 打开，更新 Portal 数据模型
          updatePortalDataModel(message.path, message.op, message.value);
        } else {
          updateDataModel(message.path, message.op, message.value);
        }
        break;
      }

      case 'deleteSurface': {
        // 检查是关闭 Portal 还是 Surface
        const portalContent = useAgentStore.getState().portalContent;
        if (portalContent && portalContent.id === message.surfaceId) {
          closePortal();
        } else {
          clearSurface();
        }
        break;
      }

      default:
        console.warn('[A2UI] 未知消息类型:', message);
    }
  };

  return { handleMessage };
}

/**
 * 获取最后一条助手消息
 */
export function useLastAssistantMessage(): AgentMessage | undefined {
  const messages = useAgentStore((state) => state.messages);
  return messages.filter((m) => m.role === 'assistant').pop();
}

/**
 * 检查是否有上次未完成的会话
 */
export function useHasLastThread(): boolean {
  return !!localStorage.getItem('lastAgentThreadId');
}

/**
 * 获取上次会话 ID
 */
export function getLastThreadId(): string | null {
  return localStorage.getItem('lastAgentThreadId');
}
