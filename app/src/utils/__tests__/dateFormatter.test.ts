/**
 * dateFormatter 单元测试
 * 测试日期格式化工具函数
 */

import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import {
  formatDate,
  formatDateTime,
  formatRelativeTime,
  getDateLabel,
  formatPhotoDate,
  formatPhotoDateTime,
} from '../dateFormatter'

describe('dateFormatter', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2024-01-15T12:00:00.000Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('formatDate', () => {
    it('有效 Date 对象返回格式化日期', () => {
      const date = new Date('2024-01-15T00:00:00.000Z')
      expect(formatDate(date)).toMatch(/\d{4}年\d+月\d+日/)
    })

    it('有效 ISO 字符串返回格式化日期', () => {
      expect(formatDate('2024-01-15T00:00:00.000Z')).toMatch(/\d{4}年\d+月\d+日/)
    })

    it('无效输入返回「日期未知」', () => {
      expect(formatDate('invalid')).toBe('日期未知')
      expect(formatDate(new Date('invalid'))).toBe('日期未知')
      expect(formatDate('')).toBe('日期未知')
    })
  })

  describe('formatDateTime', () => {
    it('有效 Date 对象返回包含时间的格式化字符串', () => {
      const date = new Date('2024-01-15T14:30:00.000Z')
      const result = formatDateTime(date)
      expect(result).toMatch(/\d{4}年\d+月\d+日/)
      expect(result).toMatch(/\d{1,2}:\d{2}/)
    })

    it('无效输入返回「日期未知」', () => {
      expect(formatDateTime('invalid')).toBe('日期未知')
    })
  })

  describe('formatRelativeTime', () => {
    it('1 分钟内返回「刚刚」', () => {
      const date = new Date('2024-01-15T11:59:30.000Z')
      expect(formatRelativeTime(date)).toBe('刚刚')
    })

    it('1 小时内返回「X 分钟前」', () => {
      const date = new Date('2024-01-15T11:30:00.000Z')
      expect(formatRelativeTime(date)).toBe('30分钟前')
    })

    it('24 小时内返回「X 小时前」', () => {
      const date = new Date('2024-01-15T09:00:00.000Z')
      expect(formatRelativeTime(date)).toBe('3小时前')
    })

    it('30 天内返回「X 天前」', () => {
      const date = new Date('2024-01-10T12:00:00.000Z')
      expect(formatRelativeTime(date)).toBe('5天前')
    })

    it('超过 30 天返回格式化日期', () => {
      const date = new Date('2023-12-01T12:00:00.000Z')
      expect(formatRelativeTime(date)).toMatch(/\d{4}年\d+月\d+日/)
    })

    it('无效输入返回「日期未知」', () => {
      expect(formatRelativeTime('invalid')).toBe('日期未知')
    })
  })

  describe('getDateLabel', () => {
    it('当天返回「今天」', () => {
      const date = new Date('2024-01-15T08:00:00.000Z')
      expect(getDateLabel(date)).toBe('今天')
    })

    it('昨天返回「昨天」', () => {
      const date = new Date('2024-01-14T12:00:00.000Z')
      expect(getDateLabel(date)).toBe('昨天')
    })

    it('其他日期返回格式化日期', () => {
      const date = new Date('2024-01-10T12:00:00.000Z')
      expect(getDateLabel(date)).toMatch(/\d{4}年\d+月\d+日/)
    })

    it('无效输入返回「日期未知」', () => {
      expect(getDateLabel('invalid')).toBe('日期未知')
    })
  })

  describe('formatPhotoDate / formatPhotoDateTime 别名', () => {
    it('formatPhotoDate 与 formatDate 行为一致', () => {
      const date = new Date('2024-01-15T00:00:00.000Z')
      expect(formatPhotoDate(date)).toBe(formatDate(date))
      expect(formatPhotoDate('invalid')).toBe('日期未知')
    })

    it('formatPhotoDateTime 与 formatDateTime 行为一致', () => {
      const date = new Date('2024-01-15T14:30:00.000Z')
      expect(formatPhotoDateTime(date)).toBe(formatDateTime(date))
    })
  })
})
