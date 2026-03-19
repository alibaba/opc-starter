/**
 * SkillCard - Skill 卡片组件
 */

import { Link } from 'react-router-dom'
import { Download, Heart, User } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import type { Skill } from '@/types/skill'

interface SkillCardProps {
  skill: Skill
}

export function SkillCard({ skill }: SkillCardProps) {
  return (
    <Link to={`/skill/${skill.slug}`} className="block group">
      <Card className="h-full transition-all duration-200 hover:shadow-lg hover:border-primary/50">
        <CardContent className="p-4">
          {/* 标题和描述 */}
          <h3 className="font-bold text-lg mb-2 line-clamp-1 group-hover:text-primary transition-colors">
            {skill.name}
          </h3>
          <p className="text-muted-foreground text-sm mb-3 line-clamp-2">
            {skill.description || '暂无描述'}
          </p>

          {/* 标签 */}
          {skill.tags && skill.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-3">
              {skill.tags.slice(0, 3).map((tag) => (
                <Badge key={tag} variant="secondary" className="text-xs">
                  {tag}
                </Badge>
              ))}
              {skill.tags.length > 3 && (
                <Badge variant="secondary" className="text-xs">
                  +{skill.tags.length - 3}
                </Badge>
              )}
            </div>
          )}

          {/* 平台 */}
          {skill.platforms && skill.platforms.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-3">
              {skill.platforms.map((platform) => (
                <Badge key={platform} variant="outline" className="text-xs">
                  {platform}
                </Badge>
              ))}
            </div>
          )}

          {/* 统计和作者 */}
          <div className="flex items-center justify-between pt-3 border-t">
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <Download className="w-4 h-4" />
                {skill.downloads_count}
              </span>
              <span className="flex items-center gap-1">
                <Heart className="w-4 h-4" />
                {skill.likes_count}
              </span>
            </div>

            {skill.author && (
              <div className="flex items-center gap-2">
                <Avatar className="w-6 h-6">
                  <AvatarImage src={skill.author.avatar_url || undefined} />
                  <AvatarFallback className="text-xs">
                    <User className="w-3 h-3" />
                  </AvatarFallback>
                </Avatar>
                <span className="text-sm text-muted-foreground truncate max-w-[80px]">
                  {skill.author.full_name || '匿名'}
                </span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}
