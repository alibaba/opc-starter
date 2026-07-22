/**
 * AgentResumeDialog - 对话恢复选择弹窗
 * @description 当用户重新打开 Agent 窗口时，提供继续上次对话或开始新对话的选项
 * @version 1.0.0
 * @see STORY-23-004
 */

import { MessageCircle, Plus, RotateCcw } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'

interface AgentResumeDialogProps {
  /** 是否打开 */
  open: boolean
  /** 关闭回调 */
  onOpenChange: (open: boolean) => void
  /** 开始新对话 */
  onNewChat: () => void
  /** 恢复上次对话 */
  onResume: () => void
}

/**
 * 对话恢复选择弹窗
 */
export function AgentResumeDialog({
  open,
  onOpenChange,
  onNewChat,
  onResume,
}: AgentResumeDialogProps) {
  const { t } = useTranslation('components')

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader className="text-center pb-2">
          <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-3">
            <MessageCircle className="w-6 h-6 text-primary" />
          </div>
          <DialogTitle>{t('agent.resumeTitle')}</DialogTitle>
          <DialogDescription>{t('agent.resumeDescription')}</DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-3 pt-4">
          {/* 恢复上次对话 */}
          <Button
            variant="default"
            size="lg"
            className="w-full justify-start gap-3 h-14"
            onClick={onResume}
          >
            <div className="w-10 h-10 rounded-lg bg-primary-foreground/10 flex items-center justify-center">
              <RotateCcw className="w-5 h-5" />
            </div>
            <div className="text-left">
              <div className="font-medium">{t('agent.resumeButtonTitle')}</div>
              <div className="text-xs opacity-70">{t('agent.resumeButtonDesc')}</div>
            </div>
          </Button>

          {/* 开始新对话 */}
          <Button
            variant="outline"
            size="lg"
            className="w-full justify-start gap-3 h-14"
            onClick={onNewChat}
          >
            <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center">
              <Plus className="w-5 h-5" />
            </div>
            <div className="text-left">
              <div className="font-medium">{t('agent.newChatTitle')}</div>
              <div className="text-xs text-muted-foreground">{t('agent.newChatDesc')}</div>
            </div>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
