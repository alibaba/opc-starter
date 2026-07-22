/**
 * SearchBar - 搜索框组件，支持防抖和可选筛选面板
 */
import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Search as SearchIcon, X, Filter } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

export interface SearchFilter {
  type: 'all' | 'photos' | 'albums' | 'persons' | 'tags'
  dateRange?: {
    start?: Date
    end?: Date
  }
  tags?: string[]
  persons?: string[]
}

export interface SearchBarProps {
  onSearch: (query: string, filters?: SearchFilter) => void
  placeholder?: string
  showFilters?: boolean
  className?: string
}

export function SearchBar({
  onSearch,
  placeholder,
  showFilters = false,
  className,
}: SearchBarProps) {
  const { t } = useTranslation('components')
  const resolvedPlaceholder = placeholder ?? t('ui.searchPlaceholder')
  const [query, setQuery] = useState('')
  const [filters, setFilters] = useState<SearchFilter>({ type: 'all' })
  const [showFilterPanel, setShowFilterPanel] = useState(false)

  // 防抖搜索
  useEffect(() => {
    const timer = setTimeout(() => {
      if (query.length >= 2 || query.length === 0) {
        onSearch(query, filters)
      }
    }, 300)

    return () => clearTimeout(timer)
  }, [query, filters, onSearch])

  const handleClear = () => {
    setQuery('')
    setFilters({ type: 'all' })
  }

  const handleFilterChange = (newFilters: Partial<SearchFilter>) => {
    setFilters({ ...filters, ...newFilters })
  }

  return (
    <div className={cn('w-full', className)}>
      {/* 搜索框 */}
      <div className="relative">
        <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
        <Input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={resolvedPlaceholder}
          className="pl-10 pr-20"
        />
        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
          {query && (
            <Button variant="ghost" size="sm" onClick={handleClear} className="h-7 w-7 p-0">
              <X className="w-4 h-4" />
            </Button>
          )}
          {showFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowFilterPanel(!showFilterPanel)}
              className={cn('h-7 w-7 p-0', showFilterPanel && 'bg-secondary')}
            >
              <Filter className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>

      {/* 筛选面板 */}
      {showFilters && showFilterPanel && (
        <div className="mt-3 p-4 bg-card border rounded-lg shadow-sm">
          <div className="space-y-4">
            {/* 类型筛选 */}
            <div>
              <label className="text-sm font-medium text-foreground mb-2 block">
                {t('ui.searchType')}
              </label>
              <div className="flex flex-wrap gap-2">
                {(
                  [
                    { value: 'all', labelKey: 'ui.filterAll' },
                    { value: 'photos', labelKey: 'ui.filterPhotos' },
                    { value: 'albums', labelKey: 'ui.filterAlbums' },
                    { value: 'persons', labelKey: 'ui.filterPersons' },
                    { value: 'tags', labelKey: 'ui.filterTags' },
                  ] as const
                ).map((type) => (
                  <Badge
                    key={type.value}
                    variant={filters.type === type.value ? 'default' : 'outline'}
                    className="cursor-pointer"
                    onClick={() =>
                      handleFilterChange({
                        type: type.value as SearchFilter['type'],
                      })
                    }
                  >
                    {t(type.labelKey)}
                  </Badge>
                ))}
              </div>
            </div>

            {/* 重置按钮 */}
            <div className="flex justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setFilters({ type: 'all' })
                  setShowFilterPanel(false)
                }}
              >
                {t('ui.resetFilters')}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// Utility function for highlighting text
export function highlightText(text: string, query: string): React.ReactNode {
  if (!query.trim()) return text

  const parts = text.split(new RegExp(`(${query})`, 'gi'))
  return parts.map((part, index) =>
    part.toLowerCase() === query.toLowerCase() ? (
      <mark key={index} className="bg-warning/30">
        {part}
      </mark>
    ) : (
      part
    )
  )
}
