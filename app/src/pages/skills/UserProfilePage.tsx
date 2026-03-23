/**
 * UserProfilePage - 用户公开主页
 * 展示指定用户的 AuthorCard + 其所有公开 Skill
 * 路由：/user/:userId
 */

import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { SkillCard } from '@/components/skills/SkillCard'
import { AuthorCard } from '@/components/skills/AuthorCard'
import { skillService } from '@/services/skill'
import type { Skill } from '@/types/skill'

interface ProfileData {
  id: string
  full_name: string | null
  avatar_url: string | null
}

export function UserProfilePage() {
  const { userId } = useParams<{ userId: string }>()

  const [profile, setProfile] = useState<ProfileData | null>(null)
  const [skills, setSkills] = useState<Skill[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    if (!userId) return

    const load = async () => {
      setIsLoading(true)
      try {
        // 查询用户 profile（通过 service 层）
        const profileData = await skillService.getUserProfile(userId)

        if (!profileData) {
          setNotFound(true)
          return
        }
        setProfile(profileData)

        // 查询该用户的公开 Skills
        const result = await skillService.getUserSkills(userId)
        setSkills(result.filter((s) => s.visibility === 'public'))
      } catch (error) {
        console.error('[UserProfilePage] Failed to load profile:', error)
        setNotFound(true)
      } finally {
        setIsLoading(false)
      }
    }

    load()
  }, [userId])

  const totalDownloads = skills.reduce((sum, s) => sum + s.downloads_count, 0)

  if (isLoading) {
    return <UserProfileSkeleton />
  }

  if (notFound || !profile) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2">用户不存在</h1>
          <p className="text-muted-foreground mb-4">该用户主页不存在或已被删除</p>
          <Link to="/">
            <Button>返回首页</Button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur border-b">
        <div className="max-w-5xl mx-auto px-4 py-3">
          <Link to="/">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              返回
            </Button>
          </Link>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8 space-y-8">
        {/* 作者卡片 */}
        <AuthorCard author={profile} skillsCount={skills.length} totalDownloads={totalDownloads} />

        {/* 公开 Skills 列表 */}
        <section>
          <h2 className="text-xl font-semibold mb-4">
            发布的 Skills
            <span className="ml-2 text-sm font-normal text-muted-foreground">
              ({skills.length})
            </span>
          </h2>

          {skills.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {skills.map((skill) => (
                <SkillCard key={skill.id} skill={skill} />
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              该用户暂未发布任何公开 Skill
            </div>
          )}
        </section>
      </main>
    </div>
  )
}

function UserProfileSkeleton() {
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur border-b">
        <div className="max-w-5xl mx-auto px-4 py-3">
          <Skeleton className="h-8 w-24" />
        </div>
      </header>
      <main className="max-w-5xl mx-auto px-4 py-8 space-y-8">
        <Skeleton className="h-24 w-full" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-40" />
          ))}
        </div>
      </main>
    </div>
  )
}
