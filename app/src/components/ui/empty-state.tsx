/**
 * EmptyState - 空状态展示组件，用于无数据时的占位提示
 */
import type { LucideIcon } from 'lucide-react'
import { ImageOff, FolderOpen, Search, User, Calendar, Inbox } from 'lucide-react'
import { useTranslation } from 'react-i18next'
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
    <div
      className={cn('flex flex-col items-center justify-center py-12 px-4 text-center', className)}
    >
      <div className="w-16 h-16 bg-secondary rounded-full flex items-center justify-center mb-4">
        <Icon className="w-8 h-8 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-semibold text-foreground mb-2">{title}</h3>
      {description && <p className="text-sm text-muted-foreground max-w-sm mb-6">{description}</p>}
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
  const { t } = useTranslation('components')

  return (
    <EmptyState
      icon={ImageOff}
      title={t('ui.emptyPhotosTitle')}
      description={t('ui.emptyPhotosDesc')}
      action={
        onUpload
          ? {
              label: t('ui.emptyPhotosAction'),
              onClick: onUpload,
            }
          : undefined
      }
    />
  )
}

export function EmptyAlbums({ onCreate }: { onCreate?: () => void }) {
  const { t } = useTranslation('components')

  return (
    <EmptyState
      icon={FolderOpen}
      title={t('ui.emptyAlbumsTitle')}
      description={t('ui.emptyAlbumsDesc')}
      action={
        onCreate
          ? {
              label: t('ui.emptyAlbumsAction'),
              onClick: onCreate,
            }
          : undefined
      }
    />
  )
}

export function EmptySearchResults() {
  const { t } = useTranslation('components')

  return (
    <EmptyState
      icon={Search}
      title={t('ui.emptySearchTitle')}
      description={t('ui.emptySearchDesc')}
    />
  )
}

export function EmptyPersons() {
  const { t } = useTranslation('components')

  return (
    <EmptyState
      icon={User}
      title={t('ui.emptyPersonsTitle')}
      description={t('ui.emptyPersonsDesc')}
    />
  )
}

export function EmptyTimeline() {
  const { t } = useTranslation('components')

  return (
    <EmptyState
      icon={Calendar}
      title={t('ui.emptyTimelineTitle')}
      description={t('ui.emptyTimelineDesc')}
    />
  )
}

// 通用的加载错误状态
export function ErrorState({
  title,
  description,
  onRetry,
}: {
  title?: string
  description?: string
  onRetry?: () => void
}) {
  const { t } = useTranslation('components')

  return (
    <EmptyState
      icon={ImageOff}
      title={title ?? t('ui.errorLoadTitle')}
      description={description ?? t('ui.errorLoadDesc')}
      action={
        onRetry
          ? {
              label: t('ui.errorLoadAction'),
              onClick: onRetry,
            }
          : undefined
      }
    />
  )
}
