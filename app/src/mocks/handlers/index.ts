/**
 * MSW Handlers 索引
 * @description 统一导出所有 Mock 处理器
 * @version 1.0.0
 */

export { personHandlers } from './personHandlers'
export { authHandlers } from './authHandlers'
export { supabaseRestHandlers } from './supabaseRestHandlers'
export { agentHandlers, mockScenarios, createCustomAgentHandler } from './agentHandlers'

// 合并所有 handlers
import { personHandlers } from './personHandlers'
import { authHandlers } from './authHandlers'
import { supabaseRestHandlers } from './supabaseRestHandlers'
import { agentHandlers } from './agentHandlers'

/**
 * 所有 handlers 的合集
 * 注意：supabaseRestHandlers 需要放在前面，优先匹配 /supabase-proxy/rest/v1/* 请求
 */
export const handlers = [
  ...authHandlers,
  ...supabaseRestHandlers,
  ...personHandlers,
  ...agentHandlers,
]
