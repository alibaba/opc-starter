/**
 * VersionSelector - 版本选择器组件
 */

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { SkillVersion } from '@/types/skill'

interface VersionSelectorProps {
  versions: SkillVersion[]
  selectedVersion: string
  onVersionChange: (version: string) => void
}

export function VersionSelector({
  versions,
  selectedVersion,
  onVersionChange,
}: VersionSelectorProps) {
  // 按创建时间排序（最新的在前）
  const sortedVersions = [...versions].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  )

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return ''
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  return (
    <Select value={selectedVersion} onValueChange={onVersionChange}>
      <SelectTrigger className="w-full">
        <SelectValue placeholder="选择版本" />
      </SelectTrigger>
      <SelectContent>
        {sortedVersions.map((version) => (
          <SelectItem key={version.id} value={version.version}>
            <div className="flex items-center justify-between w-full gap-4">
              <span className="font-medium">{version.version}</span>
              <span className="text-xs text-muted-foreground">
                {formatDate(version.created_at)}
                {version.file_size && (
                  <span className="ml-2">({formatFileSize(version.file_size)})</span>
                )}
              </span>
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
