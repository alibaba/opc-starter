/**
 * SkillDetailPage - Skill 详情页
 * 展示 Skill 信息、README、版本历史、下载功能
 */

import { useEffect, useState } from 'react'
import { Link, useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Download, Heart, Bookmark, User, ExternalLink, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'
import { useToast } from '@/hooks/useToast'
import { InstallCommand } from '@/components/skills/InstallCommand'
import { VersionSelector } from '@/components/skills/VersionSelector'
import { ReadmeRenderer } from '@/components/skills/ReadmeRenderer'
import { useSkillStore } from '@/stores/useSkillStore'
import { skillStorageService, skillService } from '@/services/skill'
import { useAuth } from '@/auth/hooks/useAuth'
import { PublishVersionDialog } from '@/components/skills/PublishVersionDialog'
import { LoginPromptDialog } from '@/components/skills/LoginPromptDialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'

export function SkillDetailPage() {
  const { slug } = useParams<{ slug: string }>()
  const navigate = useNavigate()
  const { toast } = useToast()
  const { user } = useAuth()

  const [selectedVersion, setSelectedVersion] = useState<string>('')
  const [isDownloading, setIsDownloading] = useState(false)
  const [showPublishVersionDialog, setShowPublishVersionDialog] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [loginPrompt, setLoginPrompt] = useState<{ open: boolean; message?: string }>({
    open: false,
  })

  const {
    currentSkill,
    isLoadingSkill,
    loadSkill,
    like,
    unlike,
    favorite,
    unfavorite,
    clearCurrentSkill,
  } = useSkillStore()

  // 加载 Skill 数据
  useEffect(() => {
    if (slug) {
      loadSkill(slug)
    }
    return () => {
      clearCurrentSkill()
    }
  }, [slug, loadSkill, clearCurrentSkill])

  // 设置默认选中版本
  useEffect(() => {
    if (currentSkill?.versions && currentSkill.versions.length > 0) {
      const latest = currentSkill.versions[0]
      setSelectedVersion(latest.version)
    }
  }, [currentSkill?.versions])

  // 处理点赞
  const handleLike = async () => {
    if (!user) {
      setLoginPrompt({ open: true, message: '登录后即可点赞' })
      return
    }

    if (!currentSkill) return

    if (currentSkill.is_liked) {
      await unlike(currentSkill.id)
    } else {
      await like(currentSkill.id)
    }
  }

  // 处理收藏
  const handleFavorite = async () => {
    if (!user) {
      setLoginPrompt({ open: true, message: '登录后即可收藏' })
      return
    }

    if (!currentSkill) return

    if (currentSkill.is_favorited) {
      await unfavorite(currentSkill.id)
    } else {
      await favorite(currentSkill.id)
    }
  }

  // 处理删除
  const handleDelete = async () => {
    if (!currentSkill) return
    setIsDeleting(true)
    try {
      // 先清理 Storage 文件，再删除数据库记录
      await skillStorageService.deleteSkillFiles(currentSkill.author_id, currentSkill.slug)
      await skillService.delete(currentSkill.id)
      toast({ title: '删除成功' })
      navigate('/')
    } catch (error) {
      toast({
        title: '删除失败',
        description: error instanceof Error ? error.message : '请稍后重试',
        variant: 'error',
      })
    } finally {
      setIsDeleting(false)
      setShowDeleteDialog(false)
    }
  }

  // 处理下载
  const handleDownload = async () => {
    if (!currentSkill || !selectedVersion) return

    setIsDownloading(true)
    try {
      const { download_url } = await skillStorageService.getDownloadUrl({
        skill_slug: currentSkill.slug,
        version: selectedVersion,
        install_type: 'web',
      })

      await skillStorageService.downloadFile(
        download_url,
        `${currentSkill.slug}-${selectedVersion}.zip`
      )

      toast({
        title: '下载成功',
        description: `${currentSkill.name} v${selectedVersion} 已下载`,
      })
    } catch (error) {
      toast({
        title: '下载失败',
        description: error instanceof Error ? error.message : '请稍后重试',
        variant: 'error',
      })
    } finally {
      setIsDownloading(false)
    }
  }

  // 获取当前选中的版本信息
  const currentVersionInfo = currentSkill?.versions?.find((v) => v.version === selectedVersion)

  if (isLoadingSkill) {
    return <SkillDetailSkeleton />
  }

  if (!currentSkill) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2">Skill 未找到</h1>
          <p className="text-muted-foreground mb-4">该 Skill 不存在或已被删除</p>
          <Link to="/">
            <Button>返回首页</Button>
          </Link>
        </div>
      </div>
    )
  }

  const isAuthor = user?.id === currentSkill.author_id

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur border-b">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center gap-4">
            <Link to="/">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="w-4 h-4 mr-2" />
                返回
              </Button>
            </Link>
            <div className="flex-1">
              <h1 className="text-lg font-semibold truncate">{currentSkill.name}</h1>
            </div>
            {isAuthor && (
              <Link to={`/skill/${slug}/edit`}>
                <Button variant="outline" size="sm">
                  编辑
                </Button>
              </Link>
            )}
            {isAuthor && (
              <Button variant="outline" size="sm" onClick={() => setShowPublishVersionDialog(true)}>
                <Plus className="w-4 h-4 mr-1" />
                发布新版本
              </Button>
            )}
            {isAuthor && (
              <Button
                variant="outline"
                size="sm"
                className="text-destructive hover:bg-destructive/10"
                onClick={() => setShowDeleteDialog(true)}
              >
                删除
              </Button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Main Info */}
          <div className="lg:col-span-2 space-y-6">
            {/* Title Section */}
            <div>
              <h1 className="text-3xl font-bold mb-2">{currentSkill.name}</h1>
              <p className="text-lg text-muted-foreground">{currentSkill.description}</p>
            </div>

            {/* Tags & Platforms */}
            <div className="flex flex-wrap gap-2">
              {currentSkill.platforms?.map((platform) => (
                <Badge key={platform} variant="default">
                  {platform}
                </Badge>
              ))}
              {currentSkill.tags?.map((tag) => (
                <Badge key={tag} variant="secondary">
                  {tag}
                </Badge>
              ))}
            </div>

            {/* Author Info */}
            <div className="flex items-center gap-3">
              <Avatar className="w-10 h-10">
                <AvatarImage src={currentSkill.author?.avatar_url || undefined} />
                <AvatarFallback>
                  <User className="w-5 h-5" />
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="font-medium">{currentSkill.author?.full_name || '匿名作者'}</p>
                <p className="text-sm text-muted-foreground">
                  发布于{' '}
                  {currentSkill.published_at
                    ? new Date(currentSkill.published_at).toLocaleDateString('zh-CN')
                    : '未知日期'}
                </p>
              </div>
            </div>

            <Separator />

            {/* Tabs */}
            <Tabs defaultValue="readme">
              <TabsList>
                <TabsTrigger value="readme">README</TabsTrigger>
                <TabsTrigger value="versions">
                  版本历史 ({currentSkill.versions?.length || 0})
                </TabsTrigger>
              </TabsList>

              <TabsContent value="readme" className="mt-6">
                <ReadmeRenderer content={currentSkill.readme || ''} />
              </TabsContent>

              <TabsContent value="versions" className="mt-6">
                <div className="space-y-4">
                  {currentSkill.versions?.map((version) => (
                    <div
                      key={version.id}
                      className="border rounded-lg p-4 hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="font-mono font-medium text-lg">{version.version}</span>
                          <span className="text-sm text-muted-foreground ml-3">
                            {new Date(version.created_at).toLocaleDateString('zh-CN')}
                          </span>
                        </div>
                        {version.file_size && (
                          <span className="text-sm text-muted-foreground">
                            {skillStorageService.formatFileSize(version.file_size)}
                          </span>
                        )}
                      </div>
                      {version.changelog && (
                        <p className="text-sm text-muted-foreground mt-2">{version.changelog}</p>
                      )}
                    </div>
                  ))}
                </div>
              </TabsContent>
            </Tabs>
          </div>

          {/* Right Column - Actions */}
          <div className="space-y-6">
            {/* Stats */}
            <div className="grid grid-cols-3 gap-4 text-center">
              <div className="p-4 bg-muted rounded-lg">
                <p className="text-2xl font-bold">{currentSkill.downloads_count}</p>
                <p className="text-sm text-muted-foreground">下载</p>
              </div>
              <button
                onClick={handleLike}
                className={`p-4 rounded-lg transition-colors ${
                  currentSkill.is_liked ? 'bg-red-50 text-red-600 dark:bg-red-950' : 'bg-muted'
                }`}
              >
                <Heart
                  className={`w-6 h-6 mx-auto mb-1 ${currentSkill.is_liked ? 'fill-current' : ''}`}
                />
                <p className="text-2xl font-bold">{currentSkill.likes_count}</p>
                <p className="text-sm text-muted-foreground">点赞</p>
              </button>
              <button
                onClick={handleFavorite}
                className={`p-4 rounded-lg transition-colors ${
                  currentSkill.is_favorited
                    ? 'bg-yellow-50 text-yellow-600 dark:bg-yellow-950'
                    : 'bg-muted'
                }`}
              >
                <Bookmark
                  className={`w-6 h-6 mx-auto mb-1 ${
                    currentSkill.is_favorited ? 'fill-current' : ''
                  }`}
                />
                <p className="text-2xl font-bold">{currentSkill.favorites_count}</p>
                <p className="text-sm text-muted-foreground">收藏</p>
              </button>
            </div>

            {/* Install Section */}
            <div className="border rounded-lg p-6 space-y-4">
              <h3 className="font-semibold">安装</h3>

              {/* Version Selector */}
              {currentSkill.versions && currentSkill.versions.length > 0 && (
                <div>
                  <label className="text-sm text-muted-foreground mb-2 block">选择版本</label>
                  <VersionSelector
                    versions={currentSkill.versions}
                    selectedVersion={selectedVersion}
                    onVersionChange={setSelectedVersion}
                  />
                </div>
              )}

              {/* CLI Command */}
              <div>
                <label className="text-sm text-muted-foreground mb-2 block">CLI 安装命令</label>
                <InstallCommand slug={currentSkill.slug} version={selectedVersion} />
              </div>

              {/* Download Button */}
              <Button
                className="w-full"
                size="lg"
                onClick={handleDownload}
                disabled={isDownloading || !selectedVersion}
              >
                <Download className="w-4 h-4 mr-2" />
                {isDownloading ? '下载中...' : '下载 Skill 包'}
              </Button>

              {currentVersionInfo?.file_size && (
                <p className="text-xs text-center text-muted-foreground">
                  文件大小: {skillStorageService.formatFileSize(currentVersionInfo.file_size)}
                </p>
              )}
            </div>

            {/* Links */}
            <div className="border rounded-lg p-6">
              <h3 className="font-semibold mb-4">链接</h3>
              <div className="space-y-2">
                <Link
                  to={`/user/${currentSkill.author_id}`}
                  className="flex items-center gap-2 text-sm hover:text-primary transition-colors"
                >
                  <User className="w-4 h-4" />
                  作者主页
                </Link>
                <Link
                  to="/"
                  className="flex items-center gap-2 text-sm hover:text-primary transition-colors"
                >
                  <ExternalLink className="w-4 h-4" />
                  更多 Skills
                </Link>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* 登录提示弹窗 */}
      <LoginPromptDialog
        open={loginPrompt.open}
        onOpenChange={(open) => setLoginPrompt({ open })}
        message={loginPrompt.message}
      />

      {/* 发布新版本弹窗 */}
      {currentSkill && (
        <PublishVersionDialog
          open={showPublishVersionDialog}
          onOpenChange={setShowPublishVersionDialog}
          skillId={currentSkill.id}
          currentVersion={currentSkill.latest_version}
          onSuccess={() => loadSkill(slug!)}
        />
      )}

      {/* 删除确认弹窗 */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除</AlertDialogTitle>
            <AlertDialogDescription>
              确定要删除 "{currentSkill?.name}"
              吗？此操作不可撤销，所有版本、点赞、收藏记录将一并删除。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? '删除中...' : '确认删除'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

// 加载骨架屏
function SkillDetailSkeleton() {
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur border-b">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <Skeleton className="h-10 w-32" />
        </div>
      </header>
      <main className="max-w-7xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <Skeleton className="h-10 w-3/4" />
            <Skeleton className="h-6 w-full" />
            <Skeleton className="h-6 w-2/3" />
            <div className="flex gap-2">
              <Skeleton className="h-6 w-20" />
              <Skeleton className="h-6 w-20" />
              <Skeleton className="h-6 w-20" />
            </div>
            <Skeleton className="h-64 w-full" />
          </div>
          <div className="space-y-6">
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-48 w-full" />
          </div>
        </div>
      </main>
    </div>
  )
}
