/**
 * SearchPage - 搜索结果页面
 * 支持关键词搜索、平台筛选、标签筛选、排序
 */

import { useEffect, useState, useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Search, SlidersHorizontal, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { SkillCard } from '@/components/skills/SkillCard'
import { useSkillStore } from '@/stores/useSkillStore'
// skillService import removed - using store instead
import type { SkillPlatform, SkillSearchParams } from '@/types/skill'

// 排序选项
const SORT_OPTIONS = [
  { value: 'downloads', label: '下载量' },
  { value: 'likes', label: '点赞数' },
  { value: 'created_at', label: '最新发布' },
] as const

// 平台选项
const PLATFORM_OPTIONS: { value: SkillPlatform; label: string }[] = [
  { value: 'qoder', label: 'Qoder' },
  { value: 'cursor', label: 'Cursor' },
  { value: 'claude', label: 'Claude Code' },
  { value: 'cline', label: 'Cline' },
  { value: 'windsurf', label: 'Windsurf' },
]

export function SearchPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [query, setQuery] = useState('')
  const [selectedPlatforms, setSelectedPlatforms] = useState<SkillPlatform[]>([])
  const [selectedSort, setSelectedSort] = useState<SkillSearchParams['sort']>('downloads')
  const [isFilterOpen, setIsFilterOpen] = useState(false)

  const {
    searchResults,
    searchTotal,
    isSearching,
    searchParams: storeParams,
    setSearchParams: setStoreParams,
    search,
    loadMore,
  } = useSkillStore()

  // 从 URL 初始化搜索参数
  useEffect(() => {
    const urlQuery = searchParams.get('q') || ''
    const urlPlatforms = (searchParams.get('platforms')?.split(',') as SkillPlatform[]) || []
    const urlSort = (searchParams.get('sort') as SkillSearchParams['sort']) || 'downloads'

    setQuery(urlQuery)
    setSelectedPlatforms(
      urlPlatforms.filter((p): p is SkillPlatform =>
        PLATFORM_OPTIONS.some((opt) => opt.value === p)
      )
    )
    setSelectedSort(urlSort)

    // 设置 store 参数并搜索
    setStoreParams({
      query: urlQuery,
      platforms: urlPlatforms.filter((p): p is SkillPlatform =>
        PLATFORM_OPTIONS.some((opt) => opt.value === p)
      ),
      sort: urlSort,
      page: 1,
    })
  }, [searchParams, setStoreParams])

  // 执行搜索
  useEffect(() => {
    search()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storeParams.query, storeParams.platforms, storeParams.sort])

  // 更新 URL 参数
  const updateUrlParams = useCallback(
    (params: { q?: string; platforms?: string; sort?: string }) => {
      const newParams = new URLSearchParams(searchParams)

      if (params.q !== undefined) {
        if (params.q) newParams.set('q', params.q)
        else newParams.delete('q')
      }

      if (params.platforms !== undefined) {
        if (params.platforms) newParams.set('platforms', params.platforms)
        else newParams.delete('platforms')
      }

      if (params.sort !== undefined) {
        if (params.sort) newParams.set('sort', params.sort)
        else newParams.delete('sort')
      }

      setSearchParams(newParams)
    },
    [searchParams, setSearchParams]
  )

  // 处理搜索输入
  const handleSearchInput = (value: string) => {
    setQuery(value)
    updateUrlParams({ q: value })
    setStoreParams({ query: value, page: 1 })
  }

  // 处理平台筛选
  const togglePlatform = (platform: SkillPlatform) => {
    const newPlatforms = selectedPlatforms.includes(platform)
      ? selectedPlatforms.filter((p) => p !== platform)
      : [...selectedPlatforms, platform]

    setSelectedPlatforms(newPlatforms)
    updateUrlParams({ platforms: newPlatforms.join(',') })
    setStoreParams({ platforms: newPlatforms, page: 1 })
  }

  // 处理排序
  const handleSortChange = (value: string) => {
    setSelectedSort(value as SkillSearchParams['sort'])
    updateUrlParams({ sort: value })
    setStoreParams({ sort: value as SkillSearchParams['sort'], page: 1 })
  }

  // 清除筛选
  const clearFilters = () => {
    setSelectedPlatforms([])
    updateUrlParams({ platforms: '' })
    setStoreParams({ platforms: [], page: 1 })
  }

  // 加载更多
  const handleLoadMore = () => {
    loadMore()
  }

  // 是否有筛选条件
  const hasFilters = selectedPlatforms.length > 0

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur border-b">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            {/* 搜索框 */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                type="text"
                placeholder="搜索 Skills..."
                value={query}
                onChange={(e) => handleSearchInput(e.target.value)}
                className="pl-10 h-11"
              />
              {query && (
                <button
                  onClick={() => handleSearchInput('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* 排序选择（桌面端） */}
            <div className="hidden md:block w-40">
              <Select value={selectedSort} onValueChange={handleSortChange}>
                <SelectTrigger>
                  <SelectValue placeholder="排序方式" />
                </SelectTrigger>
                <SelectContent>
                  {SORT_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* 筛选按钮 */}
            <Sheet open={isFilterOpen} onOpenChange={setIsFilterOpen}>
              <SheetTrigger asChild>
                <Button variant="outline" className="relative">
                  <SlidersHorizontal className="w-4 h-4 mr-2" />
                  筛选
                  {hasFilters && (
                    <span className="absolute -top-1 -right-1 w-4 h-4 bg-primary text-primary-foreground text-xs rounded-full flex items-center justify-center">
                      {selectedPlatforms.length}
                    </span>
                  )}
                </Button>
              </SheetTrigger>
              <SheetContent>
                <SheetHeader>
                  <SheetTitle>筛选条件</SheetTitle>
                </SheetHeader>
                <div className="py-6 space-y-6">
                  {/* 平台筛选 */}
                  <div>
                    <h4 className="text-sm font-medium mb-3">平台</h4>
                    <div className="flex flex-wrap gap-2">
                      {PLATFORM_OPTIONS.map((platform) => (
                        <Badge
                          key={platform.value}
                          variant={
                            selectedPlatforms.includes(platform.value) ? 'default' : 'outline'
                          }
                          className="cursor-pointer"
                          onClick={() => togglePlatform(platform.value)}
                        >
                          {platform.label}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  {/* 排序（移动端） */}
                  <div className="md:hidden">
                    <h4 className="text-sm font-medium mb-3">排序</h4>
                    <Select value={selectedSort} onValueChange={handleSortChange}>
                      <SelectTrigger>
                        <SelectValue placeholder="排序方式" />
                      </SelectTrigger>
                      <SelectContent>
                        {SORT_OPTIONS.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* 清除筛选 */}
                  {hasFilters && (
                    <Button variant="ghost" className="w-full" onClick={clearFilters}>
                      清除筛选
                    </Button>
                  )}
                </div>
              </SheetContent>
            </Sheet>
          </div>

          {/* 已选筛选标签 */}
          {hasFilters && (
            <div className="flex items-center gap-2 mt-3 flex-wrap">
              <span className="text-sm text-muted-foreground">已筛选:</span>
              {selectedPlatforms.map((platform) => (
                <Badge
                  key={platform}
                  variant="secondary"
                  className="cursor-pointer"
                  onClick={() => togglePlatform(platform)}
                >
                  {PLATFORM_OPTIONS.find((p) => p.value === platform)?.label}
                  <X className="w-3 h-3 ml-1" />
                </Badge>
              ))}
              <Button variant="ghost" size="sm" className="h-6 px-2 text-xs" onClick={clearFilters}>
                清除全部
              </Button>
            </div>
          )}
        </div>
      </header>

      {/* Results */}
      <main className="max-w-7xl mx-auto px-4 py-6">
        {/* 结果统计 */}
        <div className="mb-4 text-sm text-muted-foreground">
          {isSearching ? '搜索中...' : `找到 ${searchTotal} 个结果`}
        </div>

        {/* 结果列表 */}
        {isSearching && searchResults.length === 0 ? (
          // 加载骨架屏
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 9 }).map((_, i) => (
              <Skeleton key={i} className="h-48" />
            ))}
          </div>
        ) : searchResults.length > 0 ? (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {searchResults.map((skill) => (
                <SkillCard key={skill.id} skill={skill} />
              ))}
            </div>

            {/* 加载更多 */}
            {searchResults.length < searchTotal && (
              <div className="text-center mt-8">
                <Button variant="outline" onClick={handleLoadMore} disabled={isSearching}>
                  {isSearching ? '加载中...' : '加载更多'}
                </Button>
              </div>
            )}
          </>
        ) : (
          // 空状态
          <div className="text-center py-16">
            <Search className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">未找到相关 Skills</h3>
            <p className="text-muted-foreground mb-4">尝试其他关键词或清除筛选条件</p>
            {hasFilters && (
              <Button variant="outline" onClick={clearFilters}>
                清除筛选
              </Button>
            )}
          </div>
        )}
      </main>
    </div>
  )
}
