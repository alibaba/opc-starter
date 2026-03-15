/**
 * useToast 单元测试
 * 测试 Toast 通知 Hook
 */

import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useToast, useToastStore } from '../useToast'

describe('useToast', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    useToastStore.setState({ toasts: [] })
  })

  afterEach(() => {
    vi.useRealTimers()
    useToastStore.setState({ toasts: [] })
  })

  it('toast() 添加 toast 并返回 id', () => {
    const { result } = renderHook(() => useToast())

    act(() => {
      result.current.toast({ title: '测试标题' })
    })

    const toasts = useToastStore.getState().toasts
    expect(toasts).toHaveLength(1)
    const id = toasts[0].id
    expect(typeof id).toBe('string')
    expect(id.length).toBeGreaterThan(0)
    expect(toasts[0].title).toBe('测试标题')
  })

  it('dismiss(id) 移除指定 toast', () => {
    const { result } = renderHook(() => useToast())

    act(() => {
      result.current.toast({ title: '测试' })
    })
    const id = useToastStore.getState().toasts[0].id
    expect(useToastStore.getState().toasts).toHaveLength(1)

    act(() => {
      result.current.dismiss(id)
    })
    expect(useToastStore.getState().toasts).toHaveLength(0)
  })

  it('dismissAll() 移除所有 toast', () => {
    const { result } = renderHook(() => useToast())

    act(() => {
      result.current.toast({ title: '1' })
      result.current.toast({ title: '2' })
    })
    expect(useToastStore.getState().toasts).toHaveLength(2)

    act(() => {
      result.current.dismissAll()
    })
    expect(useToastStore.getState().toasts).toHaveLength(0)
  })

  it('success() 快捷方式添加 success 类型 toast', () => {
    const { result } = renderHook(() => useToast())

    act(() => {
      result.current.success('成功消息', '描述')
    })

    const toasts = useToastStore.getState().toasts
    expect(toasts).toHaveLength(1)
    expect(toasts[0].variant).toBe('success')
    expect(toasts[0].title).toBe('成功消息')
    expect(toasts[0].description).toBe('描述')
  })

  it('error() 快捷方式添加 error 类型 toast', () => {
    const { result } = renderHook(() => useToast())

    act(() => {
      result.current.error('错误消息')
    })

    const toasts = useToastStore.getState().toasts
    expect(toasts).toHaveLength(1)
    expect(toasts[0].variant).toBe('error')
    expect(toasts[0].title).toBe('错误消息')
  })

  it('warning() 快捷方式添加 warning 类型 toast', () => {
    const { result } = renderHook(() => useToast())

    act(() => {
      result.current.warning('警告消息')
    })

    const toasts = useToastStore.getState().toasts
    expect(toasts).toHaveLength(1)
    expect(toasts[0].variant).toBe('warning')
  })

  it('info() 快捷方式添加 info 类型 toast', () => {
    const { result } = renderHook(() => useToast())

    act(() => {
      result.current.info('信息消息')
    })

    const toasts = useToastStore.getState().toasts
    expect(toasts).toHaveLength(1)
    expect(toasts[0].variant).toBe('info')
  })

  it('duration 到期后自动移除 toast', () => {
    const { result } = renderHook(() => useToast())

    act(() => {
      result.current.toast({ title: '自动消失', duration: 3000 })
    })
    expect(useToastStore.getState().toasts).toHaveLength(1)

    act(() => {
      vi.advanceTimersByTime(3000)
    })
    expect(useToastStore.getState().toasts).toHaveLength(0)
  })
})
