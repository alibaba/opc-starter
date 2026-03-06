/**
 * AI Assistant 类型定义
 *
 * 定义 Edge Function 使用的所有接口和类型
 */

export interface AgentContext {
  currentPage?: 'dashboard' | 'persons' | 'profile' | 'settings' | 'cloud-storage' | 'other'
  viewContext?: {
    viewMode: string
    teamId: string | null
    teamName: string | null
  }
}

export interface RequestMessage {
  role: 'user' | 'assistant' | 'tool'
  content: string
  toolCallId?: string
  name?: string
}

export interface AIAssistantRequest {
  messages: RequestMessage[]
  context?: AgentContext
  threadId?: string
}

export interface SSEWriter {
  write(event: string, data: unknown): void
  close(): void
}

export interface ToolCallResult {
  toolCallId: string
  name: string
  result: string
}

export interface RichToolResult {
  success: boolean
  message: string
  context?: Record<string, unknown>
  suggestedNextStep?: string
  executed?: boolean
  surfaceId?: string
}

export interface StreamingToolCall {
  index: number
  id: string
  name: string
  argumentsBuffer: string
}
