import type { LucideIcon } from 'lucide-react'
import { ImageOff, FolderOpen, Search, User, Calendar, Inbox } from 'lucide-react'
import { Button } from './button'
import { cn } from '@/lib/utils'

export interface EmptyStateProps {
  icon?: LucideIcon
  title: string
  description?: string
  action?: {
    label: string
    onClick: () => void
    icon?: LucideIcon
  }
  className?: string
}

export function EmptyState({
  icon: Icon = Inbox,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center py-12 px-4 text-center', className)}>
      <div className="w-16 h-16 bg-secondary rounded-full flex items-center justify-center mb-4">
        <Icon className="w-8 h-8 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-semibold text-foreground mb-2">{title}</h3>
      {description && (
        <p className="text-sm text-muted-foreground max-w-sm mb-6">{description}</p>
      )}
      {action && (
        <Button onClick={action.onClick}>
          {action.icon && <action.icon className="w-4 h-4 mr-2" />}
          {action.label}
        </Button>
      )}
    </div>
  )
}

// 预定义的空状态组件
export function EmptyPhotos({ onUpload }: { onUpload?: () => void }) {
  return (
    <EmptyState
      icon={ImageOff}
      title="还没有照片"
      description="开始上传你的第一张照片，记录美好瞬间"
      action={
        onUpload
          ? {
              label: '上传照片',
              onClick: onUpload,
            }
          : undefined
      }
    />
  )
}

export function EmptyAlbums({ onCreate }: { onCreate?: () => void }) {
  return (
    <EmptyState
      icon={FolderOpen}
      title="还没有相册"
      description="创建你的第一个相册，整理你的照片"
      action={
        onCreate
          ? {
              label: '创建相册',
              onClick: onCreate,
            }
          : undefined
      }
    />
  )
}

export function EmptySearchResults() {
  return (
    <EmptyState
      icon={Search}
      title="没有找到结果"
      description="尝试使用不同的关键词或筛选条件"
    />
  )
}

export function EmptyPersons() {
  return (
    <EmptyState
      icon={User}
      title="还没有识别到人物"
      description="上传包含人脸的照片，系统会自动识别人物"
    />
  )
}

export function EmptyTimeline() {
  return (
    <EmptyState
      icon={Calendar}
      title="时间线还是空的"
      description="上传照片后，它们会按时间顺序显示在这里"
    />
  )
}

// 通用的加载错误状态
export function ErrorState({
  title = '加载失败',
  description = '无法加载内容，请稍后重试',
  onRetry,
}: {
  title?: string
  description?: string
  onRetry?: () => void
}) {
  return (
    <EmptyState
      icon={ImageOff}
      title={title}
      description={description}
      action={
        onRetry
          ? {
              label: '重试',
              onClick: onRetry,
            }
          : undefined
      }
    />
  )
}
