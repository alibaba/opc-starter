/**
 * UserSkillsPage - 我的 Skills 页面
 */

import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Plus, Edit, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { useToast } from '@/hooks/useToast'
import { useSkillStore } from '@/stores/useSkillStore'
import { skillService } from '@/services/skill'
import type { Skill, SkillVisibility } from '@/types/skill'

const VISIBILITY_LABELS: Record<
  SkillVisibility,
  { label: string; variant: 'default' | 'secondary' | 'outline' }
> = {
  public: { label: '公开', variant: 'default' },
  draft: { label: '草稿', variant: 'secondary' },
  private: { label: '私有', variant: 'outline' },
}

export function UserSkillsPage() {
  const { toast } = useToast()
  const { userSkills, isLoadingUserSkills, loadUserSkills } = useSkillStore()

  useEffect(() => {
    loadUserSkills()
  }, [loadUserSkills])

  const handleDelete = async (skill: Skill) => {
    try {
      await skillService.delete(skill.id)
      toast({ title: '删除成功' })
      loadUserSkills()
    } catch (error) {
      toast({
        title: '删除失败',
        description: error instanceof Error ? error.message : '请稍后重试',
        variant: 'error',
      })
    }
  }

  // 统计数据
  const totalSkills = userSkills.length
  const totalDownloads = userSkills.reduce((sum, s) => sum + s.downloads_count, 0)
  const totalLikes = userSkills.reduce((sum, s) => sum + s.likes_count, 0)

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur border-b">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold">我的 Skills</h1>
            <Link to="/publish">
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                发布 Skill
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* 统计卡片 */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <Card>
            <CardContent className="pt-6 text-center">
              <p className="text-3xl font-bold">{totalSkills}</p>
              <p className="text-sm text-muted-foreground">总 Skills</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6 text-center">
              <p className="text-3xl font-bold">{totalDownloads}</p>
              <p className="text-sm text-muted-foreground">总下载</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6 text-center">
              <p className="text-3xl font-bold">{totalLikes}</p>
              <p className="text-sm text-muted-foreground">总点赞</p>
            </CardContent>
          </Card>
        </div>

        {/* Skills 列表 */}
        {isLoadingUserSkills ? (
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-24" />
            ))}
          </div>
        ) : userSkills.length > 0 ? (
          <div className="space-y-4">
            {userSkills.map((skill) => {
              const visibility = VISIBILITY_LABELS[skill.visibility]
              return (
                <Card key={skill.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <Link
                            to={`/skill/${skill.slug}`}
                            className="font-semibold text-lg hover:text-primary transition-colors"
                          >
                            {skill.name}
                          </Link>
                          <Badge variant={visibility.variant}>{visibility.label}</Badge>
                        </div>
                        <p className="text-muted-foreground text-sm line-clamp-1 mb-2">
                          {skill.description || '暂无描述'}
                        </p>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <span>下载: {skill.downloads_count}</span>
                          <span>点赞: {skill.likes_count}</span>
                          <span>收藏: {skill.favorites_count}</span>
                          {skill.latest_version && <span>版本: {skill.latest_version}</span>}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Link to={`/skill/${skill.slug}/edit`}>
                          <Button variant="ghost" size="sm">
                            <Edit className="w-4 h-4" />
                          </Button>
                        </Link>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <Trash2 className="w-4 h-4 text-destructive" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>确认删除</AlertDialogTitle>
                              <AlertDialogDescription>
                                确定要删除 "{skill.name}" 吗？此操作不可撤销。
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>取消</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDelete(skill)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                删除
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        ) : (
          <div className="text-center py-16">
            <p className="text-muted-foreground mb-4">还没有发布任何 Skill</p>
            <Link to="/publish">
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                发布第一个 Skill
              </Button>
            </Link>
          </div>
        )}
      </main>
    </div>
  )
}
