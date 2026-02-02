import { format } from 'date-fns'
import { zhCN } from 'date-fns/locale'

/**
 * 格式化日期
 * @param date 日期对象或字符串
 * @returns 格式化后的日期字符串 "2024年1月15日"
 */
export function formatDate(date: Date | string): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date
  if (!dateObj || isNaN(dateObj.getTime())) {
    return '日期未知'
  }
  return format(dateObj, 'yyyy年M月d日', { locale: zhCN })
}

/**
 * 格式化日期时间
 * @param date 日期对象或字符串
 * @returns 格式化后的日期时间字符串 "2024年1月15日 14:30"
 */
export function formatDateTime(date: Date | string): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date
  if (!dateObj || isNaN(dateObj.getTime())) {
    return '日期未知'
  }
  return format(dateObj, 'yyyy年M月d日 HH:mm', { locale: zhCN })
}

/**
 * 格式化相对时间
 * @param date 日期对象或字符串
 * @returns 相对时间字符串 "3天前"、"2小时前"等
 */
export function formatRelativeTime(date: Date | string): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date
  if (!dateObj || isNaN(dateObj.getTime())) {
    return '日期未知'
  }

  const now = new Date()
  const diffMs = now.getTime() - dateObj.getTime()
  const diffSeconds = Math.floor(diffMs / 1000)
  const diffMinutes = Math.floor(diffSeconds / 60)
  const diffHours = Math.floor(diffMinutes / 60)
  const diffDays = Math.floor(diffHours / 24)

  if (diffSeconds < 60) {
    return '刚刚'
  } else if (diffMinutes < 60) {
    return `${diffMinutes}分钟前`
  } else if (diffHours < 24) {
    return `${diffHours}小时前`
  } else if (diffDays < 30) {
    return `${diffDays}天前`
  } else {
    return formatDate(dateObj)
  }
}

/**
 * 获取日期的显示标签（今天、昨天、具体日期）
 * @param date 日期对象或字符串
 * @returns 日期标签
 */
export function getDateLabel(date: Date | string): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date
  if (!dateObj || isNaN(dateObj.getTime())) {
    return '日期未知'
  }

  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)

  const targetDate = new Date(dateObj.getFullYear(), dateObj.getMonth(), dateObj.getDate())

  if (targetDate.getTime() === today.getTime()) {
    return '今天'
  } else if (targetDate.getTime() === yesterday.getTime()) {
    return '昨天'
  } else {
    return formatDate(dateObj)
  }
}

// 导出别名以保持向后兼容
export const formatPhotoDate = formatDate
export const formatPhotoDateTime = formatDateTime
