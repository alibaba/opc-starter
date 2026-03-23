/**
 * lib/utils cn 函数测试
 */
import { describe, it, expect } from 'vitest'
import { cn } from '../utils'

describe('cn (className utility)', () => {
  it('应该合并简单类名', () => {
    expect(cn('foo', 'bar')).toBe('foo bar')
  })

  it('应该处理条件类名', () => {
    const isActive = true
    const isDisabled = false
    expect(cn('base', isActive && 'active', isDisabled && 'disabled')).toBe('base active')
  })

  it('应该合并 Tailwind 冲突类名', () => {
    // twMerge 应该解决冲突，保留后者
    expect(cn('p-4', 'p-2')).toBe('p-2')
  })

  it('应该处理空输入', () => {
    expect(cn()).toBe('')
  })

  it('应该处理 undefined 和 null', () => {
    expect(cn('foo', undefined, null, 'bar')).toBe('foo bar')
  })

  it('应该处理数组输入', () => {
    expect(cn(['foo', 'bar'])).toBe('foo bar')
  })

  it('应该处理对象输入', () => {
    expect(cn({ foo: true, bar: false, baz: true })).toBe('foo baz')
  })

  it('应该正确处理 Tailwind 颜色冲突', () => {
    expect(cn('text-red-500', 'text-blue-500')).toBe('text-blue-500')
  })
})
