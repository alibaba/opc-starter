/**
 * AI Assistant 工具定义与处理
 *
 * 包含可用工具的 OpenAI 格式定义和工具调用处理逻辑
 */

import type { ChatCompletionTool } from 'npm:openai@4/resources'
import type { AgentContext, SSEWriter, ToolCallResult, RichToolResult } from './types.ts'

export const TOOLS: ChatCompletionTool[] = [
  {
    type: 'function',
    function: {
      name: 'navigateToPage',
      description: '导航到指定页面。当用户需要访问特定功能时使用。',
      parameters: {
        type: 'object',
        properties: {
          page: {
            type: 'string',
            enum: ['home', 'persons', 'profile', 'settings', 'storage'],
            description:
              '目标页面: home(首页), persons(组织管理), profile(个人中心), settings(设置), storage(云存储)',
          },
        },
        required: ['page'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'getCurrentContext',
      description: '获取当前应用上下文信息，包括当前页面、用户状态等',
      parameters: {
        type: 'object',
        properties: {},
        required: [],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'renderUI',
      description: '生成 A2UI 界面供用户交互。当需要用户选择、确认或展示信息时调用。',
      parameters: {
        type: 'object',
        properties: {
          surfaceId: {
            type: 'string',
            description: '界面唯一标识，如不提供将自动生成',
          },
          component: {
            type: 'object',
            description: 'A2UI 组件树',
            properties: {
              id: { type: 'string' },
              type: {
                type: 'string',
                enum: ['card', 'button', 'text', 'badge', 'progress'],
              },
              props: { type: 'object' },
              children: { type: 'array' },
            },
            required: ['id', 'type'],
          },
          dataModel: {
            type: 'object',
            description: '数据模型，用于绑定组件属性',
          },
        },
        required: ['component'],
      },
    },
  },
]

function processRenderUI(args: Record<string, unknown>, sse: SSEWriter): RichToolResult {
  const component = args.component as { id?: string; type?: string; props?: unknown } | undefined
  if (!component || !component.type) {
    console.warn('[renderUI] 缺少 component 或 component.type:', args)
    return {
      success: false,
      message: '无效的 renderUI 调用：缺少 component 参数',
    }
  }

  const surfaceId =
    (args.surfaceId as string) || `surface_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`

  if (!component.id) {
    component.id = `component_${Date.now()}`
  }

  sse.write('a2ui', {
    type: 'beginRendering',
    surfaceId,
    component,
    dataModel: args.dataModel || {},
  })

  return {
    success: true,
    message: 'UI 已渲染，等待用户交互',
    surfaceId,
    context: {
      componentType: component.type,
      hasDataModel: !!args.dataModel,
    },
    suggestedNextStep: '等待用户与界面交互',
  }
}

function buildToolResult(
  toolName: string,
  args: Record<string, unknown>,
  agentContext?: AgentContext
): RichToolResult {
  switch (toolName) {
    case 'navigateToPage': {
      const pageMap: Record<string, string> = {
        home: '首页',
        persons: '组织管理',
        profile: '个人中心',
        settings: '系统设置',
        storage: '云存储设置',
      }
      const pageName = pageMap[args.page as string] || args.page
      return {
        success: true,
        message: `正在导航到${pageName}页面`,
        context: { targetPage: args.page },
        suggestedNextStep: '页面导航已发起，用户将看到新页面',
        executed: true,
      }
    }

    case 'getCurrentContext': {
      return {
        success: true,
        message: '获取当前上下文成功',
        context: {
          currentPage: agentContext?.currentPage || 'unknown',
          viewContext: agentContext?.viewContext,
        },
        executed: true,
      }
    }

    default:
      return {
        success: true,
        message: `工具 ${toolName} 执行成功`,
        context: { args },
        executed: true,
      }
  }
}

export function processToolCall(
  toolName: string,
  toolCallId: string,
  args: Record<string, unknown>,
  sse: SSEWriter,
  agentContext?: AgentContext
): ToolCallResult {
  if (toolName === 'renderUI') {
    const richResult = processRenderUI(args, sse)
    return {
      toolCallId,
      name: toolName,
      result: JSON.stringify(richResult),
    }
  }

  sse.write('tool_call', {
    id: toolCallId,
    name: toolName,
    arguments: args,
  })

  const richResult = buildToolResult(toolName, args, agentContext)

  return {
    toolCallId,
    name: toolName,
    result: JSON.stringify(richResult),
  }
}
