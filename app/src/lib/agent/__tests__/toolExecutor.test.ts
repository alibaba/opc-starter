/**
 * Tool Executor 单元测试
 * @description 测试 Agent 工具执行器
 * @version 2.0.0 - 适配 OPC-Starter 简化版本
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useToolExecutor } from '../toolExecutor'
import { getAllTools } from '../tools'
import type { ToolCall } from '@/types/agent'

describe('useToolExecutor', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('应该返回可用工具列表', () => {
    const { result } = renderHook(() => useToolExecutor())

    expect(result.current.availableTools).toBeDefined()
    expect(Array.isArray(result.current.availableTools)).toBe(true)

    // 验证工具元数据格式
    result.current.availableTools.forEach((tool) => {
      expect(tool).toHaveProperty('name')
      expect(tool).toHaveProperty('description')
      expect(tool).toHaveProperty('category')
    })
  })

  it('提供 executeToolCall 方法', () => {
    const { result } = renderHook(() => useToolExecutor())

    expect(typeof result.current.executeToolCall).toBe('function')
  })

  it('提供 executeToolCalls 批量执行方法', () => {
    const { result } = renderHook(() => useToolExecutor())

    expect(typeof result.current.executeToolCalls).toBe('function')
  })

  describe('未知工具处理', () => {
    it('返回错误信息', async () => {
      const { result } = renderHook(() => useToolExecutor())

      const toolCall: ToolCall = {
        id: 'call-1',
        name: 'unknownTool',
        arguments: {},
      }

      let executeResult
      await act(async () => {
        executeResult = await result.current.executeToolCall(toolCall)
      })

      expect(executeResult).toEqual({
        success: false,
        error: '未知工具: unknownTool',
      })
    })
  })

  describe('批量执行', () => {
    it('执行多个工具调用', async () => {
      const { result } = renderHook(() => useToolExecutor())

      const toolCalls: ToolCall[] = [
        { id: 'call-1', name: 'getCurrentContext', arguments: {} },
        { id: 'call-2', name: 'unknownTool', arguments: {} },
      ]

      let results: Map<string, unknown>
      await act(async () => {
        results = await result.current.executeToolCalls(toolCalls)
      })

      expect(results!.size).toBe(2)
      expect(results!.has('call-1')).toBe(true)
      expect(results!.has('call-2')).toBe(true)
    })
  })
})

describe('getAllTools', () => {
  it('应该返回已注册的工具列表', () => {
    const tools = getAllTools()

    expect(Array.isArray(tools)).toBe(true)

    // 验证工具结构
    tools.forEach((tool) => {
      expect(tool).toHaveProperty('definition')
      expect(tool).toHaveProperty('execute')
      expect(tool).toHaveProperty('validateAndExecute')
      expect(tool).toHaveProperty('meta')
    })
  })

  it('应该包含导航工具', () => {
    const tools = getAllTools()
    const navTool = tools.find((t) => t.meta.name === 'navigateToPage')

    expect(navTool).toBeDefined()
    expect(navTool?.meta.category).toBe('navigation')
  })

  it('应该包含上下文工具', () => {
    const tools = getAllTools()
    const contextTool = tools.find((t) => t.meta.name === 'getCurrentContext')

    expect(contextTool).toBeDefined()
    expect(contextTool?.meta.category).toBe('context')
  })
})
