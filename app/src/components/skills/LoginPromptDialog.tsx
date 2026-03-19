/**
 * LoginPromptDialog - 登录提示弹窗
 * 在需要认证的操作（点赞、收藏、发布等）触发时展示
 */

import { useNavigate } from 'react-router-dom'
import { LogIn } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

interface LoginPromptDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** 自定义提示文案，默认为通用文案 */
  message?: string
}

export function LoginPromptDialog({ open, onOpenChange, message }: LoginPromptDialogProps) {
  const navigate = useNavigate()

  const handleLogin = () => {
    onOpenChange(false)
    navigate('/login')
  }

  const handleRegister = () => {
    onOpenChange(false)
    navigate('/register')
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <LogIn className="w-5 h-5 text-primary" />
            <DialogTitle>需要登录</DialogTitle>
          </div>
          <DialogDescription>{message ?? '登录后即可使用此功能'}</DialogDescription>
        </DialogHeader>

        <DialogFooter className="flex-row justify-end gap-2 sm:flex-row">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button variant="outline" onClick={handleRegister}>
            注册账号
          </Button>
          <Button onClick={handleLogin}>立即登录</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
