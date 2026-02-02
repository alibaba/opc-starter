/**
 * Context Compressor - wU2 上下文压缩
 * @description 长对话时自动压缩，保持 Token 在安全范围
 * @version 1.0.0
 * @see scratchpad.md Phase 6
 */

import type { AgentMessage } from '@/types/agent'

// ============ 配置常量 ============

/** Token 使用率阈值，达到此值时触发压缩 */
export const TOKEN_THRESHOLD = 0.92

/** Qwen-Plus 上下文窗口大小 (支持最大 1M tokens，这里使用保守值) */
export const MAX_TOKENS = 128000

/** 安全阈值 Token 数 */
export const THRESHOLD_TOKENS = Math.floor(MAX_TOKENS * TOKEN_THRESHOLD)

/** 保留的最近消息数量 */
const TAIL_MESSAGE_COUNT = 8

/** 保留的开头消息数量 */
const HEAD_MESSAGE_COUNT = 2

// ============ 类型定义 ============

/**
 * 压缩后的上下文摘要
 */
export interface CompressedSummary {
  /** 已完成的操作 */
  completedActions: string[]
  /** 未完成的任务 */
  pendingTasks: string[]
  /** 遇到的错误 */
  errors: string[]
  /** 照片变更记录 */
  photoChanges: string[]
  /** 用户反馈关键词 */
  userFeedback: string[]
  /** 使用的工具 */
  toolsUsed: string[]
}

/**
 * Token 估算结果
 */
export interface TokenEstimate {
  total: number
  usageRate: number
  needsCompression: boolean
}

// ============ Token 估算 ============

/**
 * 估算消息的 Token 数量
 * @description 使用简单的字符/词估算，中文约 2 字符/Token，英文约 4 字符/Token
 */
export function estimateTokenCount(messages: AgentMessage[]): number {
  let totalChars = 0

  for (const msg of messages) {
    // 角色标记
    totalChars += 10

    // 消息内容
    if (msg.content) {
      totalChars += msg.content.length
    }

    // 工具调用
    if (msg.toolCalls) {
      for (const tc of msg.toolCalls) {
        totalChars += 20 // 工具名称
        totalChars += JSON.stringify(tc.arguments || {}).length
        if (tc.result) {
          totalChars += JSON.stringify(tc.result).length
        }
      }
    }

    // A2UI 消息
    if (msg.a2uiMessages) {
      for (const a2ui of msg.a2uiMessages) {
        totalChars += JSON.stringify(a2ui).length
      }
    }
  }

  // 中文为主的内容，约 2 字符/Token
  // 混合英文和代码，约 3 字符/Token
  // 取平均值 2.5
  return Math.ceil(totalChars / 2.5)
}

/**
 * 估算 Token 使用情况
 */
export function estimateTokenUsage(messages: AgentMessage[]): TokenEstimate {
  const total = estimateTokenCount(messages)
  const usageRate = total / MAX_TOKENS

  return {
    total,
    usageRate,
    needsCompression: usageRate >= TOKEN_THRESHOLD,
  }
}

// ============ 摘要生成 ============

/**
 * 从消息中生成摘要
 */
function generateSummary(messages: AgentMessage[]): CompressedSummary {
  const summary: CompressedSummary = {
    completedActions: [],
    pendingTasks: [],
    errors: [],
    photoChanges: [],
    userFeedback: [],
    toolsUsed: [],
  }

  const toolSet = new Set<string>()

  for (const msg of messages) {
    // 分析工具调用结果
    if (msg.toolCalls) {
      for (const tc of msg.toolCalls) {
        toolSet.add(tc.name)

        if (tc.result) {
          try {
            const result = typeof tc.result === 'string' ? JSON.parse(tc.result) : tc.result

            if (result.success && result.message) {
              summary.completedActions.push(`${tc.name}: ${result.message}`)
            }
            if (result.error) {
              summary.errors.push(`${tc.name}: ${result.error}`)
            }

            // 记录照片变更
            if (tc.name.includes('Photo') || tc.name.includes('photo')) {
              if (result.success) {
                summary.photoChanges.push(result.message || tc.name)
              }
            }
          } catch {
            // 忽略解析错误
          }
        }
      }
    }

    // 分析用户消息中的反馈
    if (msg.role === 'user' && msg.content) {
      const content = msg.content

      // 检测负面反馈关键词
      const negativePatterns = ['不要', '不对', '错了', '换一个', '重新', '取消']
      for (const pattern of negativePatterns) {
        if (content.includes(pattern)) {
          summary.userFeedback.push(content.slice(0, 50))
          break
        }
      }

      // 检测待完成任务（问句）
      if (content.includes('?') || content.includes('？') || content.includes('帮我')) {
        summary.pendingTasks.push(content.slice(0, 50))
      }
    }
  }

  summary.toolsUsed = Array.from(toolSet)

  // 限制每个列表的长度
  const limitList = <T>(list: T[], max: number): T[] => list.slice(-max)

  return {
    completedActions: limitList(summary.completedActions, 5),
    pendingTasks: limitList(summary.pendingTasks, 3),
    errors: limitList(summary.errors, 3),
    photoChanges: limitList(summary.photoChanges, 5),
    userFeedback: limitList(summary.userFeedback, 3),
    toolsUsed: summary.toolsUsed,
  }
}

/**
 * 格式化摘要为文本
 */
function formatSummary(summary: CompressedSummary): string {
  const lines: string[] = []

  if (summary.completedActions.length > 0) {
    lines.push('已完成的操作:')
    for (const action of summary.completedActions) {
      lines.push(`  - ${action}`)
    }
  }

  if (summary.photoChanges.length > 0) {
    lines.push('照片变更:')
    for (const change of summary.photoChanges) {
      lines.push(`  - ${change}`)
    }
  }

  if (summary.errors.length > 0) {
    lines.push('遇到的问题:')
    for (const error of summary.errors) {
      lines.push(`  - ${error}`)
    }
  }

  if (summary.userFeedback.length > 0) {
    lines.push('用户反馈:')
    for (const feedback of summary.userFeedback) {
      lines.push(`  - ${feedback}`)
    }
  }

  if (summary.toolsUsed.length > 0) {
    lines.push(`使用过的工具: ${summary.toolsUsed.join(', ')}`)
  }

  return lines.join('\n')
}

// ============ 压缩函数 ============

/**
 * 如果需要则压缩消息
 * @description 使用 Head-Summary-Tail 策略压缩对话历史
 */
export function compressIfNeeded(messages: AgentMessage[]): AgentMessage[] {
  const estimate = estimateTokenUsage(messages)

  if (!estimate.needsCompression) {
    return messages
  }

  console.log(
    `[wU2] Token 使用率 ${(estimate.usageRate * 100).toFixed(1)}% >= ${TOKEN_THRESHOLD * 100}%，触发压缩`
  )
  console.log(`[wU2] 压缩前消息数: ${messages.length}, 预估 Token: ${estimate.total}`)

  // Head：保留前 HEAD_MESSAGE_COUNT 条
  const head = messages.slice(0, HEAD_MESSAGE_COUNT)

  // Tail：保留后 TAIL_MESSAGE_COUNT 条
  const tail = messages.slice(-TAIL_MESSAGE_COUNT)

  // 确保 head 和 tail 不重叠
  if (messages.length <= HEAD_MESSAGE_COUNT + TAIL_MESSAGE_COUNT) {
    console.log('[wU2] 消息数量较少，无需压缩')
    return messages
  }

  // Middle：压缩为摘要
  const middle = messages.slice(HEAD_MESSAGE_COUNT, -TAIL_MESSAGE_COUNT)
  const summary = generateSummary(middle)
  const summaryText = formatSummary(summary)

  // 构建压缩后的消息序列
  const compressed: AgentMessage[] = [
    ...head,
    {
      id: `summary_${Date.now()}`,
      role: 'system',
      content: `[历史摘要 - 压缩了 ${middle.length} 条消息]\n${summaryText}`,
      timestamp: new Date(),
    },
    ...tail,
  ]

  const compressedEstimate = estimateTokenUsage(compressed)
  console.log(`[wU2] 压缩后消息数: ${compressed.length}, 预估 Token: ${compressedEstimate.total}`)
  console.log(
    `[wU2] Token 节省: ${estimate.total - compressedEstimate.total} (${((1 - compressedEstimate.total / estimate.total) * 100).toFixed(1)}%)`
  )

  return compressed
}

/**
 * 强制压缩消息（不检查阈值）
 */
export function forceCompress(messages: AgentMessage[]): AgentMessage[] {
  if (messages.length <= HEAD_MESSAGE_COUNT + TAIL_MESSAGE_COUNT) {
    return messages
  }

  const head = messages.slice(0, HEAD_MESSAGE_COUNT)
  const tail = messages.slice(-TAIL_MESSAGE_COUNT)
  const middle = messages.slice(HEAD_MESSAGE_COUNT, -TAIL_MESSAGE_COUNT)
  const summary = generateSummary(middle)
  const summaryText = formatSummary(summary)

  return [
    ...head,
    {
      id: `summary_${Date.now()}`,
      role: 'system',
      content: `[历史摘要 - 压缩了 ${middle.length} 条消息]\n${summaryText}`,
      timestamp: new Date(),
    },
    ...tail,
  ]
}

export default {
  estimateTokenCount,
  estimateTokenUsage,
  compressIfNeeded,
  forceCompress,
  TOKEN_THRESHOLD,
  MAX_TOKENS,
}
