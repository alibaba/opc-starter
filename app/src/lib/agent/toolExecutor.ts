/**
 * Tool Executor - Agent 工具执行器
 * @description 简化版 - 所有工具逻辑已迁移到 tools/ 目录
 * @version 2.0.0
 * @see STORY-24-008
 */

import { useCallback } from 'react'
import { executeToolByName, getAllTools } from './tools'
import type { ToolCall, ToolExecutionResult } from '@/types/agent'

export { setNavigateCallback } from './tools/navigation'
export type { NavigateCallback } from './tools/navigation'

interface ToolMeta {
  name: string
  description: string
  category: 'edit' | 'ai' | 'context' | 'navigation'
}

interface UseToolExecutorReturn {
  executeToolCall: (call: ToolCall) => Promise<ToolExecutionResult>
  executeToolCalls: (calls: ToolCall[]) => Promise<Map<string, ToolExecutionResult>>
  availableTools: ToolMeta[]
}

function getAvailableTools(): ToolMeta[] {
  return getAllTools().map((tool) => ({
    name: tool.meta.name,
    description: tool.meta.description,
    category: tool.meta.category,
  }))
}

/**
 * 工具执行器 Hook
 * @description 简化版 - 所有逻辑已迁移到 tools/ 目录
 */
export function useToolExecutor(): UseToolExecutorReturn {
  const executeToolCall = useCallback(async (call: ToolCall): Promise<ToolExecutionResult> => {
    console.log('[ToolExecutor] 执行工具:', call.name, call.arguments)
    return executeToolByName(call.name, call.arguments)
  }, [])

  const executeToolCalls = useCallback(
    async (calls: ToolCall[]): Promise<Map<string, ToolExecutionResult>> => {
      const results = new Map<string, ToolExecutionResult>()

      for (const call of calls) {
        const result = await executeToolCall(call)
        results.set(call.id, result)
      }

      return results
    },
    [executeToolCall]
  )

  return {
    executeToolCall,
    executeToolCalls,
    availableTools: getAvailableTools(),
  }
}

export default useToolExecutor
