/**
 * Agent Tools helpers 测试
 */
import { describe, it, expect } from 'vitest'
import { createSuccessResult, createErrorResult, createUIResult } from '../helpers'

describe('Agent Tools helpers', () => {
  describe('createSuccessResult', () => {
    it('应该创建成功结果', () => {
      const result = createSuccessResult('操作成功')
      expect(result.success).toBe(true)
      expect(result.message).toBe('操作成功')
      expect(result.data).toBeUndefined()
    })

    it('应该包含附加数据', () => {
      const result = createSuccessResult('操作成功', { id: '123', count: 5 })
      expect(result.success).toBe(true)
      expect(result.message).toBe('操作成功')
      expect(result.data).toEqual({ id: '123', count: 5 })
    })
  })

  describe('createErrorResult', () => {
    it('应该创建错误结果', () => {
      const result = createErrorResult('操作失败')
      expect(result.success).toBe(false)
      expect(result.error).toBe('操作失败')
    })
  })

  describe('createUIResult', () => {
    it('应该创建带 UI 组件的结果', () => {
      const result = createUIResult('显示表单', {
        id: 'form-1',
        type: 'form',
        props: { title: 'Test Form' },
      })

      expect(result.success).toBe(true)
      expect(result.message).toBe('显示表单')
      expect(result.ui).toEqual({
        id: 'form-1',
        type: 'form',
        props: { title: 'Test Form' },
      })
    })

    it('应该支持无 props 的组件', () => {
      const result = createUIResult('显示按钮', {
        id: 'btn-1',
        type: 'button',
      })

      expect(result.ui?.id).toBe('btn-1')
      expect(result.ui?.type).toBe('button')
      expect(result.ui?.props).toBeUndefined()
    })
  })
})
