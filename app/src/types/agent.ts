/**
 * Agent 系统类型定义
 * @description AI 助手上下文、消息、工具和状态管理
 * @see docs/epic-23-a2ui/types.md
 */

import type { A2UIComponent, A2UIServerMessage, A2UIDataModel, A2UIRenderTarget } from './a2ui'

// ============ 上下文 ============

/**
 * 视图上下文
 * @description 当前视图模式和团队信息
 */
export interface ViewContext {
  /** 视图模式 */
  viewMode: 'mine' | 'team' | 'persons'
  /** 当前团队/组织 ID */
  teamId: string | null
  /** 当前团队/组织名称 */
  teamName: string | null
}

/**
 * Agent 上下文
 * @description 提供给 AI 助手的当前应用状态
 * @version 2.0.0 - 适配 OPC-Starter 简化页面类型
 */
export interface AgentContext {
  /** 当前页面类型 */
  currentPage: 'dashboard' | 'persons' | 'profile' | 'settings' | 'cloud-storage' | 'other'
  /** 当前选中的照片列表（保持接口兼容，OPC-Starter 中总是空数组） */
  selectedPhotos: SelectedPhoto[]
  /** 编辑器状态（OPC-Starter 中不使用） */
  editingState?: EditingState
  /** 当前相册信息（OPC-Starter 中不使用） */
  currentAlbum?: AlbumInfo
  /** 视图上下文（团队视角信息） */
  viewContext?: ViewContext
}

/**
 * 选中的照片信息
 */
export interface SelectedPhoto {
  id: string
  url: string
  thumbnail?: string
  width?: number
  height?: number
  metadata?: PhotoMetadata
}

/**
 * 照片元数据
 */
export interface PhotoMetadata {
  takenAt?: Date
  location?: string
  camera?: string
  tags?: string[]
}

/**
 * 编辑器状态
 */
export interface EditingState {
  photoId: string
  hasUnsavedChanges: boolean
  currentTool?: string
  adjustments?: Record<string, number>
}

/**
 * 相册信息
 */
export interface AlbumInfo {
  id: string
  name: string
  photoCount?: number
}

// ============ 消息 ============

/**
 * Agent 消息类型
 */
export type AgentMessageRole = 'user' | 'assistant' | 'system' | 'tool'

/**
 * Agent 消息
 * @description 对话历史中的单条消息
 */
export interface AgentMessage {
  id: string
  role: AgentMessageRole
  content: string
  timestamp: Date
  /** A2UI 消息列表（assistant 消息） */
  a2uiMessages?: A2UIServerMessage[]
  /** 工具调用记录 */
  toolCalls?: ToolCall[]
  /** 是否正在流式输出 */
  isStreaming?: boolean
}

/**
 * 工具调用记录
 */
export interface ToolCall {
  id: string
  name: string
  arguments: Record<string, unknown>
  result?: ToolExecutionResult
}

// ============ 工具 ============

/**
 * 工具执行结果
 */
export interface ToolExecutionResult {
  success: boolean
  message?: string
  error?: string
  data?: Record<string, unknown>
  /** 工具返回的 UI 组件 */
  ui?: A2UIComponent
}

/**
 * Agent 工具定义
 * @description 可供 AI 调用的工具
 */
export interface AgentTool {
  /** 工具名称 */
  name: string
  /** 工具描述（供 AI 理解） */
  description: string
  /** JSON Schema 格式的参数定义 */
  parameters: {
    type: 'object'
    properties: Record<string, unknown>
    required?: string[]
  }
  /** 工具执行函数 */
  execute: (params: Record<string, unknown>) => Promise<ToolExecutionResult>
}

// ============ SSE 事件 ============

/**
 * SSE 事件类型
 */
export type SSEEventType = 'text_delta' | 'a2ui' | 'tool_call' | 'thinking' | 'done' | 'error'

/**
 * 文本增量事件
 */
export interface SSETextDeltaEvent {
  type: 'text_delta'
  content: string
}

/**
 * A2UI 消息事件
 */
export interface SSEA2UIEvent {
  type: 'a2ui'
  message: A2UIServerMessage
}

/**
 * 工具调用事件
 */
export interface SSEToolCallEvent {
  type: 'tool_call'
  id: string
  name: string
  arguments: Record<string, unknown>
}

/**
 * 思考过程事件
 */
export interface SSEThinkingEvent {
  type: 'thinking'
  content: string
}

/**
 * 完成事件
 */
export interface SSEDoneEvent {
  type: 'done'
  usage?: {
    prompt_tokens: number
    completion_tokens: number
  }
}

/**
 * 错误事件
 */
export interface SSEErrorEvent {
  type: 'error'
  message: string
  code?: string
}

/**
 * SSE 事件联合类型
 */
export type SSEEvent =
  | SSETextDeltaEvent
  | SSEA2UIEvent
  | SSEToolCallEvent
  | SSEThinkingEvent
  | SSEDoneEvent
  | SSEErrorEvent

// ============ Store 状态 ============

/**
 * Agent Store 状态
 * @description Zustand store 的状态类型
 */
export interface AgentState {
  // ===== 对话状态 =====
  /** 当前会话 ID */
  currentThreadId: string | null
  /** 消息列表 */
  messages: AgentMessage[]

  // ===== Surface 状态 =====
  /** 当前渲染的 Surface */
  currentSurface: {
    id: string
    component: A2UIComponent
    dataModel: A2UIDataModel
  } | null

  // ===== Portal 状态 (STORY-23-012) =====
  /** Portal 内容组件 */
  portalContent: A2UIComponent | null
  /** Portal 渲染目标 */
  portalTarget: A2UIRenderTarget
  /** Portal 数据模型 */
  portalDataModel: A2UIDataModel

  // ===== UI 状态 =====
  /** 是否正在流式输出 */
  isStreaming: boolean
  /** 错误信息 */
  error: string | null
  /** 是否显示 Agent 面板 */
  isPanelOpen: boolean

  // ===== 上下文 =====
  /** 当前上下文 */
  context: AgentContext | null
}

/**
 * Agent Store Actions
 * @description Store 的操作方法类型
 */
export interface AgentActions {
  // 会话管理
  createThread: () => Promise<string>
  loadThread: (threadId: string) => Promise<void>
  clearThread: () => void

  // 消息管理
  sendMessage: (content: string) => Promise<void>
  appendMessage: (message: AgentMessage) => void
  updateMessage: (id: string, updates: Partial<AgentMessage>) => void

  // Surface 管理
  updateSurface: (surface: AgentState['currentSurface']) => void
  updateDataModel: (path: string, op: 'replace' | 'add' | 'remove', value?: unknown) => void
  clearSurface: () => void

  // Portal 管理 (STORY-23-012)
  openPortal: (
    component: A2UIComponent,
    target: A2UIRenderTarget,
    dataModel?: A2UIDataModel
  ) => void
  closePortal: () => void
  updatePortalDataModel: (path: string, op: 'replace' | 'add' | 'remove', value?: unknown) => void

  // 状态管理
  setStreaming: (isStreaming: boolean) => void
  setError: (error: string | null) => void
  togglePanel: () => void
  setContext: (context: AgentContext) => void

  // 用户操作
  handleUserAction: (
    surfaceId: string,
    componentId: string,
    actionId: string,
    value?: unknown
  ) => Promise<void>
}

// ============ 数据库类型（对应 Supabase 表） ============

/**
 * agent_threads 表行类型
 */
export interface AgentThreadRow {
  id: string
  user_id: string
  title: string | null
  context: Record<string, unknown>
  created_at: string
  updated_at: string
}

/**
 * agent_messages 表行类型
 */
export interface AgentMessageRow {
  id: string
  thread_id: string
  role: AgentMessageRole
  content: string | null
  a2ui_messages: A2UIServerMessage[] | null
  tool_calls: ToolCall[] | null
  created_at: string
}

/**
 * agent_actions 表行类型
 */
export interface AgentActionRow {
  id: string
  thread_id: string
  message_id: string | null
  action_id: string
  payload: Record<string, unknown>
  status: 'pending' | 'succeeded' | 'failed'
  error: string | null
  created_at: string
  updated_at: string
}
