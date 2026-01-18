/**
 * Agent Tools - 辅助函数
 * @version 2.0.0 - 简化版，移除 Photo 相关功能
 */

import type { ToolExecutionResult } from './types'

/**
 * 创建成功的工具执行结果
 */
export function createSuccessResult(
  message: string,
  data?: Record<string, unknown>
): ToolExecutionResult {
  return {
    success: true,
    message,
    data,
  }
}

/**
 * 创建失败的工具执行结果
 */
export function createErrorResult(error: string): ToolExecutionResult {
  return {
    success: false,
    error,
  }
}

/**
 * 创建带 UI 组件的工具执行结果
 */
export function createUIResult(
  message: string,
  component: {
    id: string
    type: string
    props?: Record<string, unknown>
  }
): ToolExecutionResult {
  return {
    success: true,
    message,
    ui: component,
  }
}
