/**
 * AvatarUploader Component
 * 头像上传组件 - 支持点击和拖拽上传
 */

import { useState, useRef, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { Upload, User, X, Loader2 } from 'lucide-react'
import { useProfileStore } from '@/stores/useProfileStore'
import { validateAvatarFile, validateImageDimensions } from '@/types/validation'
import { AvatarCropper } from './AvatarCropper'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'

interface AvatarUploaderProps {
  className?: string
}

export function AvatarUploader({ className = '' }: AvatarUploaderProps) {
  const { t } = useTranslation('components')
  const { t: tCommon } = useTranslation('common')
  const { profile, uploadAvatar, deleteAvatar, isLoading, uploadProgress } = useProfileStore()
  const [isDragging, setIsDragging] = useState(false)
  const [showCropper, setShowCropper] = useState(false)
  const [selectedImage, setSelectedImage] = useState<string | null>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  /**
   * 处理文件选择
   */
  const handleFileSelect = useCallback(
    async (file: File) => {
      setError(null)

      // 验证文件
      const validation = validateAvatarFile(file)
      if (!validation.valid) {
        setError(validation.error || t('avatarUploader.validationFailed'))
        return
      }

      // 读取图片并验证尺寸
      const reader = new FileReader()
      reader.onload = (e) => {
        const img = new Image()
        img.onload = () => {
          const dimensionValidation = validateImageDimensions(img.width, img.height)
          if (!dimensionValidation.valid) {
            setError(dimensionValidation.error || t('avatarUploader.dimensionInvalid'))
            return
          }

          // 显示裁剪界面
          setSelectedImage(e.target?.result as string)
          setSelectedFile(file)
          setShowCropper(true)
        }
        img.src = e.target?.result as string
      }
      reader.readAsDataURL(file)
    },
    [t]
  )

  /**
   * 处理点击上传
   */
  const handleClick = () => {
    fileInputRef.current?.click()
  }

  /**
   * 处理文件输入变化
   */
  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      handleFileSelect(file)
    }
  }

  /**
   * 处理拖拽进入
   */
  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }

  /**
   * 处理拖拽离开
   */
  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }

  /**
   * 处理拖拽悬停
   */
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }

  /**
   * 处理文件放下
   */
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)

    const file = e.dataTransfer.files?.[0]
    if (file) {
      handleFileSelect(file)
    }
  }

  /**
   * 处理裁剪完成
   */
  const handleCropComplete = async (croppedFile: File) => {
    try {
      setShowCropper(false)
      await uploadAvatar(croppedFile)
      setSelectedImage(null)
      setSelectedFile(null)
    } catch (error) {
      setError(error instanceof Error ? error.message : t('avatarUploader.uploadFailed'))
    }
  }

  /**
   * 处理裁剪取消
   */
  const handleCropCancel = () => {
    setShowCropper(false)
    setSelectedImage(null)
    setSelectedFile(null)
  }

  /**
   * 处理删除头像
   */
  const handleDelete = async () => {
    if (confirm(t('avatarUploader.deleteConfirm'))) {
      try {
        await deleteAvatar()
      } catch (error) {
        setError(error instanceof Error ? error.message : t('avatarUploader.deleteFailed'))
      }
    }
  }

  return (
    <div className={`flex flex-col items-center gap-4 ${className}`}>
      {/* 头像显示区域 */}
      <div
        className={`relative group ${isDragging ? 'ring-2 ring-primary' : ''}`}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        {/* 圆形头像 */}
        <div
          className="w-[150px] h-[150px] rounded-full overflow-hidden bg-secondary border-2 border-border cursor-pointer transition-all hover:border-primary"
          onClick={handleClick}
          role="button"
          tabIndex={0}
          aria-label={t('avatarUploader.uploadLabel')}
        >
          {profile?.avatarUrl ? (
            <img
              src={profile.avatarUrl}
              alt={t('avatarUploader.userAvatar')}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-secondary">
              <User className="w-16 h-16 text-muted-foreground" />
            </div>
          )}

          {/* 悬停遮罩 */}
          <div className="absolute inset-0 bg-foreground/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
            <div className="text-primary-foreground text-center">
              <Upload className="w-8 h-8 mx-auto mb-1" />
              <span className="text-sm">{t('avatarUploader.changeAvatar')}</span>
            </div>
          </div>

          {/* 加载状态 */}
          {isLoading && (
            <div className="absolute inset-0 bg-foreground/70 flex items-center justify-center">
              <Loader2 className="w-8 h-8 text-primary-foreground animate-spin" />
            </div>
          )}
        </div>

        {/* 删除按钮 */}
        {profile?.avatarUrl && !isLoading && (
          <button
            onClick={(e) => {
              e.stopPropagation()
              handleDelete()
            }}
            className="absolute top-0 right-0 w-8 h-8 bg-destructive rounded-full flex items-center justify-center text-destructive-foreground opacity-0 group-hover:opacity-100 transition-opacity hover:bg-destructive/90"
            aria-label={t('avatarUploader.deleteLabel')}
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* 上传进度 */}
      {isLoading && uploadProgress > 0 && (
        <div className="w-full max-w-xs">
          <Progress value={uploadProgress} className="h-2" />
          <p className="text-sm text-muted-foreground text-center mt-1">
            {t('avatarUploader.uploading', { progress: uploadProgress })}
          </p>
        </div>
      )}

      {/* 提示文本 */}
      <div className="text-center">
        <p className="text-sm text-muted-foreground">{t('avatarUploader.hint')}</p>
        <p className="text-xs text-muted-foreground/70 mt-1">{t('avatarUploader.formatHint')}</p>
      </div>

      {/* 错误提示 */}
      {error && (
        <div className="w-full max-w-xs p-3 bg-destructive/10 border border-destructive/30 rounded-lg">
          <p className="text-sm text-destructive">{error}</p>
          <Button variant="ghost" size="sm" onClick={() => setError(null)} className="mt-2 w-full">
            {tCommon('close')}
          </Button>
        </div>
      )}

      {/* 隐藏的文件输入 */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={handleFileInputChange}
        className="hidden"
        aria-hidden="true"
      />

      {/* 裁剪对话框 */}
      {showCropper && selectedImage && selectedFile && (
        <AvatarCropper
          image={selectedImage}
          onComplete={handleCropComplete}
          onCancel={handleCropCancel}
        />
      )}
    </div>
  )
}
