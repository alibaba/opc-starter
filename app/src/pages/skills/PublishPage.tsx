/**
 * PublishPage - Skill 发布页面
 */

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Upload, X, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Checkbox } from '@/components/ui/checkbox'
import { Progress } from '@/components/ui/progress'
import { useToast } from '@/hooks/useToast'
import { skillService, skillStorageService } from '@/services/skill'
import { useAuth } from '@/auth/hooks/useAuth'
import type { SkillVisibility, SkillPlatform } from '@/types/skill'

const PLATFORMS: { value: SkillPlatform; label: string }[] = [
  { value: 'qoder', label: 'Qoder' },
  { value: 'cursor', label: 'Cursor' },
  { value: 'claude', label: 'Claude Code' },
  { value: 'cline', label: 'Cline' },
  { value: 'windsurf', label: 'Windsurf' },
]

export function PublishPage() {
  const navigate = useNavigate()
  const { toast } = useToast()
  const { user } = useAuth()

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)

  // 表单状态
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [readme, setReadme] = useState('')
  const [tags, setTags] = useState<string[]>([])
  const [tagInput, setTagInput] = useState('')
  const [selectedPlatforms, setSelectedPlatforms] = useState<SkillPlatform[]>([])
  const [visibility, setVisibility] = useState<SkillVisibility>('draft')
  const [version, setVersion] = useState('1.0.0')
  const [changelog, setChangelog] = useState('')
  const [file, setFile] = useState<File | null>(null)

  // 未登录重定向
  if (!user) {
    navigate('/login')
    return null
  }

  // 添加标签
  const addTag = () => {
    if (tagInput.trim() && !tags.includes(tagInput.trim()) && tags.length < 10) {
      setTags([...tags, tagInput.trim()])
      setTagInput('')
    }
  }

  // 移除标签
  const removeTag = (tagToRemove: string) => {
    setTags(tags.filter((tag) => tag !== tagToRemove))
  }

  // 切换平台选择
  const togglePlatform = (platform: SkillPlatform) => {
    setSelectedPlatforms((prev) =>
      prev.includes(platform) ? prev.filter((p) => p !== platform) : [...prev, platform]
    )
  }

  // 文件选择
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      if (!skillStorageService.validateFileType(selectedFile)) {
        toast({
          title: '文件类型错误',
          description: '请上传 ZIP 格式的文件',
          variant: 'error',
        })
        return
      }
      if (!skillStorageService.validateFileSize(selectedFile)) {
        toast({
          title: '文件过大',
          description: '文件大小不能超过 10MB',
          variant: 'error',
        })
        return
      }
      setFile(selectedFile)
    }
  }

  // 表单验证
  const validateForm = (): boolean => {
    if (!name.trim()) {
      toast({ title: '请输入 Skill 名称', variant: 'error' })
      return false
    }
    if (name.length < 3 || name.length > 50) {
      toast({ title: '名称长度应为 3-50 个字符', variant: 'error' })
      return false
    }
    if (!description.trim()) {
      toast({ title: '请输入描述', variant: 'error' })
      return false
    }
    if (description.length < 10 || description.length > 500) {
      toast({ title: '描述长度应为 10-500 个字符', variant: 'error' })
      return false
    }
    if (selectedPlatforms.length === 0) {
      toast({ title: '请至少选择一个平台', variant: 'error' })
      return false
    }
    if (!version.match(/^\d+\.\d+\.\d+$/)) {
      toast({
        title: '版本号格式错误',
        description: '请使用语义化版本格式，如 1.0.0',
        variant: 'error',
      })
      return false
    }
    if (!file) {
      toast({ title: '请上传 Skill 包文件', variant: 'error' })
      return false
    }
    return true
  }

  // 提交表单
  const handleSubmit = async () => {
    if (!validateForm()) return

    setIsSubmitting(true)
    setUploadProgress(0)

    try {
      // 1. 创建 Skill
      const skill = await skillService.create({
        name: name.trim(),
        description: description.trim(),
        tags,
        platforms: selectedPlatforms,
        visibility,
        readme: readme.trim(),
      })

      // 2. 获取上传签名 URL
      const { upload_url } = await skillStorageService.publishVersion({
        skill_id: skill.id,
        version: version.trim(),
        changelog: changelog.trim(),
        file_size: file!.size,
      })

      // 3. 上传文件（模拟进度）
      setUploadProgress(50)
      await skillStorageService.uploadWithSignedUrl(upload_url, file!)
      setUploadProgress(100)

      toast({
        title: '发布成功',
        description: visibility === 'public' ? 'Skill 已公开发布' : 'Skill 已保存为草稿',
      })

      // 跳转到详情页
      navigate(`/skill/${skill.slug}`)
    } catch (error) {
      toast({
        title: '发布失败',
        description: error instanceof Error ? error.message : '请稍后重试',
        variant: 'error',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur border-b">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold">发布 Skill</h1>
            <Button variant="outline" onClick={() => navigate(-1)}>
              取消
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        <div className="space-y-8">
          {/* 基本信息 */}
          <Card>
            <CardHeader>
              <CardTitle>基本信息</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="name">
                  名称 <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="给你的 Skill 起个名字"
                  maxLength={50}
                />
                <p className="text-xs text-muted-foreground mt-1">{name.length}/50 字符</p>
              </div>

              <div>
                <Label htmlFor="description">
                  描述 <span className="text-red-500">*</span>
                </Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="简要描述这个 Skill 的功能和用途"
                  rows={3}
                  maxLength={500}
                />
                <p className="text-xs text-muted-foreground mt-1">{description.length}/500 字符</p>
              </div>

              <div>
                <Label htmlFor="readme">README</Label>
                <Textarea
                  id="readme"
                  value={readme}
                  onChange={(e) => setReadme(e.target.value)}
                  placeholder="详细的 README 内容（支持 Markdown）"
                  rows={10}
                />
              </div>
            </CardContent>
          </Card>

          {/* 标签 */}
          <Card>
            <CardHeader>
              <CardTitle>标签</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2 mb-4">
                <Input
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  placeholder="添加标签"
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                />
                <Button type="button" onClick={addTag} disabled={tags.length >= 10}>
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {tags.map((tag) => (
                  <Badge key={tag} variant="secondary" className="gap-1">
                    {tag}
                    <button onClick={() => removeTag(tag)}>
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                ))}
              </div>
              <p className="text-xs text-muted-foreground mt-2">{tags.length}/10 个标签</p>
            </CardContent>
          </Card>

          {/* 平台 */}
          <Card>
            <CardHeader>
              <CardTitle>
                兼容平台 <span className="text-red-500">*</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-4">
                {PLATFORMS.map((platform) => (
                  <div key={platform.value} className="flex items-center gap-2">
                    <Checkbox
                      id={platform.value}
                      checked={selectedPlatforms.includes(platform.value)}
                      onCheckedChange={() => togglePlatform(platform.value)}
                    />
                    <Label htmlFor={platform.value}>{platform.label}</Label>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* 版本和文件 */}
          <Card>
            <CardHeader>
              <CardTitle>版本和文件</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="version">
                  版本号 <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="version"
                  value={version}
                  onChange={(e) => setVersion(e.target.value)}
                  placeholder="1.0.0"
                />
                <p className="text-xs text-muted-foreground mt-1">使用语义化版本格式，如 1.0.0</p>
              </div>

              <div>
                <Label htmlFor="changelog">版本说明</Label>
                <Textarea
                  id="changelog"
                  value={changelog}
                  onChange={(e) => setChangelog(e.target.value)}
                  placeholder="这个版本的更新内容"
                  rows={3}
                />
              </div>

              <div>
                <Label>
                  Skill 包文件 <span className="text-red-500">*</span>
                </Label>
                <div className="mt-2">
                  {file ? (
                    <div className="flex items-center justify-between p-4 border rounded-lg">
                      <div>
                        <p className="font-medium">{file.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {skillStorageService.formatFileSize(file.size)}
                        </p>
                      </div>
                      <Button variant="ghost" size="sm" onClick={() => setFile(null)}>
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  ) : (
                    <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-muted-foreground/25 rounded-lg cursor-pointer hover:border-primary/50 transition-colors">
                      <div className="flex flex-col items-center justify-center pt-5 pb-6">
                        <Upload className="w-8 h-8 mb-3 text-muted-foreground" />
                        <p className="text-sm text-muted-foreground">点击或拖拽上传 ZIP 文件</p>
                        <p className="text-xs text-muted-foreground mt-1">最大 10MB</p>
                      </div>
                      <input
                        type="file"
                        className="hidden"
                        accept=".zip,application/zip"
                        onChange={handleFileChange}
                      />
                    </label>
                  )}
                </div>
              </div>

              {uploadProgress > 0 && uploadProgress < 100 && (
                <div>
                  <Progress value={uploadProgress} className="h-2" />
                  <p className="text-sm text-muted-foreground mt-1">上传中... {uploadProgress}%</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* 可见性 */}
          <Card>
            <CardHeader>
              <CardTitle>可见性</CardTitle>
            </CardHeader>
            <CardContent>
              <RadioGroup
                value={visibility}
                onValueChange={(v) => setVisibility(v as SkillVisibility)}
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="draft" id="draft" />
                  <Label htmlFor="draft">草稿 - 仅自己可见</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="public" id="public" />
                  <Label htmlFor="public">公开 - 所有人可见</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="private" id="private" />
                  <Label htmlFor="private">私有 - 仅通过链接访问</Label>
                </div>
              </RadioGroup>
            </CardContent>
          </Card>

          {/* 提交按钮 */}
          <div className="flex justify-end gap-4">
            <Button variant="outline" onClick={() => navigate(-1)} disabled={isSubmitting}>
              取消
            </Button>
            <Button onClick={handleSubmit} disabled={isSubmitting} size="lg">
              {isSubmitting ? '发布中...' : '发布 Skill'}
            </Button>
          </div>
        </div>
      </main>
    </div>
  )
}
