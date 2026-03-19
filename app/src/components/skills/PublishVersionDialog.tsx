/**
 * PublishVersionDialog - 发布新版本弹窗
 * 支持版本号输入（语义化版本比较）、Changelog、文件上传
 */

import { useState } from 'react'
import { Upload, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Progress } from '@/components/ui/progress'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { useToast } from '@/hooks/useToast'
import { skillStorageService } from '@/services/skill'

interface PublishVersionDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  skillId: string
  currentVersion: string | null
  onSuccess: () => void
}

/** 语义化版本比较：newVer 是否大于 currentVer */
function isVersionGreater(newVer: string, currentVer: string): boolean {
  const parse = (v: string) => v.split('.').map(Number)
  const [ma1, mi1, p1] = parse(newVer)
  const [ma2, mi2, p2] = parse(currentVer)
  if (ma1 !== ma2) return ma1 > ma2
  if (mi1 !== mi2) return mi1 > mi2
  return p1 > p2
}

const VERSION_REGEX = /^\d+\.\d+\.\d+$/

export function PublishVersionDialog({
  open,
  onOpenChange,
  skillId,
  currentVersion,
  onSuccess,
}: PublishVersionDialogProps) {
  const { toast } = useToast()
  const [version, setVersion] = useState('')
  const [changelog, setChangelog] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)

  const handleClose = () => {
    if (isSubmitting) return
    setVersion('')
    setChangelog('')
    setFile(null)
    setUploadProgress(0)
    onOpenChange(false)
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0]
    if (!selected) return
    if (!skillStorageService.validateFileType(selected)) {
      toast({ title: '文件类型错误', description: '请上传 ZIP 格式文件', variant: 'error' })
      return
    }
    if (!skillStorageService.validateFileSize(selected)) {
      toast({ title: '文件过大', description: '文件大小不能超过 10MB', variant: 'error' })
      return
    }
    setFile(selected)
  }

  const validate = (): boolean => {
    if (!VERSION_REGEX.test(version)) {
      toast({
        title: '版本号格式错误',
        description: '请使用语义化版本格式，如 1.0.0',
        variant: 'error',
      })
      return false
    }
    if (currentVersion && !isVersionGreater(version, currentVersion)) {
      toast({
        title: '版本号过低',
        description: `新版本号必须大于当前版本 ${currentVersion}`,
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

  const handleSubmit = async () => {
    if (!validate()) return

    setIsSubmitting(true)
    setUploadProgress(0)

    try {
      // 1. 获取上传签名 URL
      const { upload_url } = await skillStorageService.publishVersion({
        skill_id: skillId,
        version: version.trim(),
        changelog: changelog.trim(),
        file_size: file!.size,
      })

      // 2. 上传文件
      setUploadProgress(50)
      await skillStorageService.uploadWithSignedUrl(upload_url, file!)
      setUploadProgress(100)

      toast({ title: '版本发布成功', description: `v${version} 已发布` })
      handleClose()
      onSuccess()
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
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>发布新版本</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* 版本号 */}
          <div className="space-y-1.5">
            <Label htmlFor="new-version">
              版本号 <span className="text-red-500">*</span>
            </Label>
            <Input
              id="new-version"
              value={version}
              onChange={(e) => setVersion(e.target.value)}
              placeholder="例如 1.1.0"
              disabled={isSubmitting}
            />
            {currentVersion && (
              <p className="text-xs text-muted-foreground">当前最新版本：{currentVersion}</p>
            )}
          </div>

          {/* Changelog */}
          <div className="space-y-1.5">
            <Label htmlFor="changelog">版本说明</Label>
            <Textarea
              id="changelog"
              value={changelog}
              onChange={(e) => setChangelog(e.target.value)}
              placeholder="描述本版本的更新内容"
              rows={3}
              disabled={isSubmitting}
            />
          </div>

          {/* 文件上传 */}
          <div className="space-y-1.5">
            <Label>
              Skill 包文件 <span className="text-red-500">*</span>
            </Label>
            {file ? (
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <p className="text-sm font-medium">{file.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {skillStorageService.formatFileSize(file.size)}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setFile(null)}
                  disabled={isSubmitting}
                  aria-label="移除文件"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            ) : (
              <label className="flex flex-col items-center justify-center w-full h-28 border-2 border-dashed border-muted-foreground/25 rounded-lg cursor-pointer hover:border-primary/50 transition-colors">
                <Upload className="w-6 h-6 mb-2 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">点击上传 ZIP 文件</p>
                <p className="text-xs text-muted-foreground mt-0.5">最大 10MB</p>
                <input
                  type="file"
                  className="hidden"
                  accept=".zip,application/zip"
                  onChange={handleFileChange}
                  disabled={isSubmitting}
                />
              </label>
            )}
          </div>

          {/* 上传进度 */}
          {isSubmitting && uploadProgress > 0 && (
            <div>
              <Progress value={uploadProgress} className="h-1.5" />
              <p className="text-xs text-muted-foreground mt-1 text-center">
                {uploadProgress < 100 ? `上传中... ${uploadProgress}%` : '处理中...'}
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isSubmitting}>
            取消
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? '发布中...' : '发布版本'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
