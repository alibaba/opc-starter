/**
 * UserFavoritesPage - 我的收藏页面
 */

import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Heart, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { SkillCard } from '@/components/skills/SkillCard'
import { useSkillStore } from '@/stores/useSkillStore'

export function UserFavoritesPage() {
  const { userFavorites, isLoadingUserFavorites, loadUserFavorites } = useSkillStore()

  useEffect(() => {
    loadUserFavorites()
  }, [loadUserFavorites])

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur border-b">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <h1 className="text-2xl font-bold">我的收藏</h1>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        {isLoadingUserFavorites ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-48" />
            ))}
          </div>
        ) : userFavorites.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {userFavorites.map((skill) => (
              <SkillCard key={skill.id} skill={skill} />
            ))}
          </div>
        ) : (
          <div className="text-center py-16">
            <Heart className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">还没有收藏</h3>
            <p className="text-muted-foreground mb-4">收藏你喜欢的 Skill，方便以后找到</p>
            <Link to="/search">
              <Button>
                <Search className="w-4 h-4 mr-2" />
                去发现
              </Button>
            </Link>
          </div>
        )}
      </main>
    </div>
  )
}
