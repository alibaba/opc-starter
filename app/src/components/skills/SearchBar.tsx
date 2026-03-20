/**
 * SearchBar - 搜索栏组件
 */

import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, X } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { useSkillStore } from '@/stores/useSkillStore'
import { skillService } from '@/services/skill/skillService'

// 默认热门标签（作为 fallback）
const DEFAULT_POPULAR_TAGS = ['react', 'typescript', 'api', 'testing', 'documentation']

interface SearchBarProps {
  showTags?: boolean
  autoFocus?: boolean
  /** 搜索时是否跳转到 /search 页面，默认 true。广场首页设为 false 实现原地搜索 */
  navigateOnSearch?: boolean
  onSearch?: (query: string) => void
}

export function SearchBar({
  showTags = true,
  autoFocus = false,
  navigateOnSearch = true,
  onSearch,
}: SearchBarProps) {
  const [query, setQuery] = useState('')
  const [popularTags, setPopularTags] = useState<string[]>(DEFAULT_POPULAR_TAGS)
  const { setSearchParams, search } = useSkillStore()
  const navigate = useNavigate()

  // 使用 ref 存储 debounce timer，避免每次渲染重建
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // 加载热门标签
  useEffect(() => {
    const loadPopularTags = async () => {
      try {
        const tags = await skillService.getPopularTags(5)
        if (tags.length > 0) {
          setPopularTags(tags)
        }
      } catch (error) {
        // 保持默认标签
        console.warn('Failed to load popular tags:', error)
      }
    }

    if (showTags) {
      loadPopularTags()
    }
  }, [showTags])

  // 防抖搜索 + 可选导航到搜索结果页
  useEffect(() => {
    // 清除之前的 timer
    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
    }

    // 设置新的 debounce timer
    debounceRef.current = setTimeout(() => {
      // 仅在 navigateOnSearch 为 true 时跳转搜索页
      if (navigateOnSearch && query.trim()) {
        navigate(`/search?q=${encodeURIComponent(query.trim())}`)
      }
      setSearchParams({ query })
      search()
      onSearch?.(query)
    }, 300)

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current)
      }
    }
  }, [query, setSearchParams, search, onSearch, navigate, navigateOnSearch])

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
          {popularTags.map((tag) => (
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
