/**
 * Agent Gateway System Prompt
 *
 * 定义 Agent 的角色、能力和交互规则
 * 
 * v2.0: 使用 builder.ts 模块化组装
 */

import { buildSystemPrompt, type BuildOptions } from './builder.ts'

/**
 * 默认 System Prompt（包含所有模块，保持向后兼容）
 */
export const SYSTEM_PROMPT = buildSystemPrompt({
  include: ['editing', 'ai-services', 'a2ui-spec', 'context'],
})

/**
 * 生成带上下文的 System Prompt
 */
export function buildSystemPromptWithContext(context?: {
  currentPage?: string
  selectedPhotoCount?: number
  editingPhotoId?: string
  albumName?: string
}): string {
  if (!context) {
    return SYSTEM_PROMPT
  }

  const options: BuildOptions = {
    ...context,
    include: ['editing', 'ai-services', 'a2ui-spec', 'context'],
  }

  return buildSystemPrompt(options)
}

export { buildSystemPrompt, type BuildOptions } from './builder.ts'
