/**
 * Agent Lib - Agent 核心库
 * @description SSE 客户端和工具执行器的统一导出
 * @version 2.0.0
 * @see STORY-23-006, STORY-23-009, STORY-24-008
 */

// SSE 客户端
export {
  useAgentSSE,
  withRetry,
  RETRY_CONFIG,
  type UseAgentSSEOptions,
  type UseAgentSSEReturn,
} from './sseClient';

// 工具执行器
export {
  useToolExecutor,
  setFusionTaskCallback,
  setVideoTaskCallback,
  setNavigateCallback,
  setLoadPhotoNavigateCallback,
  type FusionTaskCallback,
  type VideoTaskCallback,
  type NavigateCallback,
} from './toolExecutor';

// 工具注册表
export {
  getAllToolDefinitions,
  getAllTools,
  getTool,
  executeToolByName,
} from './tools';