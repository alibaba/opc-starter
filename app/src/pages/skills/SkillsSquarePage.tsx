/**
 * SkillsSquarePage - Skills 广场（带 MainLayout 布局）
 * 默认首页，展示热门和最新 Skills
 */

import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Plus, TrendingUp, Clock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { SearchBar } from '@/components/skills/SearchBar'
import { SkillCard } from '@/components/skills/SkillCard'
import { useSkillStore } from '@/stores/useSkillStore'

export function SkillsSquarePage() {
  const {
    popularSkills,
    latestSkills,
    isLoadingPopular,
    isLoadingLatest,
    loadPopular,
    loadLatest,
  } = useSkillStore()

  useEffect(() => {
    loadPopular()
    loadLatest()
  }, [loadPopular, loadLatest])

  return (
    <div className="space-y-8">
      {/* Hero Section */}
      <section className="py-8 px-4 bg-linear-to-b from-primary/5 to-background rounded-lg">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-3xl md:text-4xl font-bold mb-4">Skills Hub</h1>
          <p className="text-lg text-muted-foreground mb-6">发现和分享 AI Agent Skills</p>
          <SearchBar showTags={true} autoFocus={false} />
        </div>
      </section>

      {/* Popular Skills */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-primary" />
            <h2 className="text-xl font-bold">热门 Skills</h2>
          </div>
          <Link to="/search">
            <Button variant="ghost" size="sm">
              查看全部
            </Button>
          </Link>
        </div>

        {isLoadingPopular ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-48" />
            ))}
          </div>
        ) : popularSkills.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {popularSkills.map((skill) => (
              <SkillCard key={skill.id} skill={skill} />
            ))}
          </div>
        ) : (
          <div className="text-center py-12 text-muted-foreground bg-muted rounded-lg">
            暂无热门 Skills
          </div>
        )}
      </section>

      {/* Latest Skills */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-primary" />
            <h2 className="text-xl font-bold">最新发布</h2>
          </div>
          <Link to="/search?sort=created_at">
            <Button variant="ghost" size="sm">
              查看全部
            </Button>
          </Link>
        </div>

        {isLoadingLatest ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-48" />
            ))}
          </div>
        ) : latestSkills.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {latestSkills.map((skill) => (
              <SkillCard key={skill.id} skill={skill} />
            ))}
          </div>
        ) : (
          <div className="text-center py-12 text-muted-foreground bg-muted rounded-lg">
            暂无最新 Skills
          </div>
        )}
      </section>

      {/* CTA Section */}
      <section className="text-center py-8 bg-muted rounded-lg">
        <h2 className="text-xl font-bold mb-3">有 Skill 要分享？</h2>
        <p className="text-muted-foreground mb-4">发布你的 Skill，让更多人发现和使用</p>
        <Link to="/publish">
          <Button size="lg">
            <Plus className="w-4 h-4 mr-2" />
            发布 Skill
          </Button>
        </Link>
      </section>
    </div>
  )
}
