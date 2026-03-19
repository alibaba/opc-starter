/**
 * AuthorCard - 作者信息卡片
 * 展示头像、用户名、Skill 数量、总下载量
 */

import { User } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'

interface AuthorCardProps {
  author: {
    id: string
    full_name: string | null
    avatar_url: string | null
  }
  skillsCount: number
  totalDownloads: number
}

export function AuthorCard({ author, skillsCount, totalDownloads }: AuthorCardProps) {
  const initials = author.full_name?.[0]?.toUpperCase() ?? '?'

  return (
    <div className="flex items-center gap-4 rounded-lg border p-4 bg-card">
      <Avatar className="w-14 h-14">
        <AvatarImage src={author.avatar_url ?? undefined} alt={author.full_name ?? '用户'} />
        <AvatarFallback>
          {author.avatar_url ? initials : <User className="w-6 h-6" />}
        </AvatarFallback>
      </Avatar>
      <div>
        <p className="font-semibold text-lg">{author.full_name ?? '匿名用户'}</p>
        <p className="text-sm text-muted-foreground">
          {skillsCount} 个 Skills &middot; {totalDownloads} 次下载
        </p>
      </div>
    </div>
  )
}
