/**
 * SearchBar - 搜索栏组件
 */

import { useState, useCallback, useEffect } from 'react'
import { Search, X } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { useSkillStore } from '@/stores/useSkillStore'

// 热门标签示例
const POPULAR_TAGS = ['react', 'typescript', 'api', 'testing', 'documentation']

interface SearchBarProps {
  showTags?: boolean
  autoFocus?: boolean
  onSearch?: (query: string) => void
}

export function SearchBar({ showTags = true, autoFocus = false, onSearch }: SearchBarProps) {
  const [query, setQuery] = useState('')
  const { setSearchParams, search } = useSkillStore()

  // 防抖搜索
  const debouncedSearch = useCallback(
    (searchQuery: string) => {
      setSearchParams({ query: searchQuery })
      search()
      onSearch?.(searchQuery)
    },
    [setSearchParams, search, onSearch]
  )

  useEffect(() => {
    const timer = setTimeout(() => {
      debouncedSearch(query)
    }, 300)

    return () => clearTimeout(timer)
  }, [query, debouncedSearch])

  const handleTagClick = (tag: string) => {
    setQuery(tag)
  }

  const handleClear = () => {
    setQuery('')
  }

  return (
    <div className="w-full max-w-2xl mx-auto">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
        <Input
          type="text"
          placeholder="搜索 AI Skills..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="pl-10 pr-10 h-12 text-lg"
          autoFocus={autoFocus}
          aria-label="搜索 Skills"
        />
        {query && (
          <button
            onClick={handleClear}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            aria-label="清空搜索"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {showTags && (
        <div className="flex flex-wrap gap-2 mt-3 justify-center">
          <span className="text-sm text-muted-foreground">热门:</span>
          {POPULAR_TAGS.map((tag) => (
            <Badge
              key={tag}
              variant="secondary"
              className="cursor-pointer hover:bg-primary/20"
              onClick={() => handleTagClick(tag)}
            >
              {tag}
            </Badge>
          ))}
        </div>
      )}
    </div>
  )
}
