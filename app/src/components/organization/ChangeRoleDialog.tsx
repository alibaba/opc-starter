/**
 * ChangeRoleDialog - 修改角色对话框
 * @description 变更组织成员角色（admin/manager/member），包含角色说明
 */
import { useState } from 'react'
import { Shield, ChevronDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import type { Profile } from '@/lib/supabase/organizationTypes'

interface ChangeRoleDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  member: Profile | null
  onChangeRole: (userId: string, newRole: 'manager' | 'member') => Promise<void>
}

const roleLabels = {
  admin: '管理员',
  manager: '经理',
  member: '成员',
}

const roleDescriptions = {
  manager: '🔐 团队管理员 - 可管理本团队及子团队的组织架构和成员（限当前组织树）',
  member: '👤 普通成员 - 只能管理自己的资源（默认角色）',
}

export function ChangeRoleDialog({
  open,
  onOpenChange,
  member,
  onChangeRole,
}: ChangeRoleDialogProps) {
  const [selectedRole, setSelectedRole] = useState<'manager' | 'member'>(
    member?.role === 'admin' ? 'member' : ((member?.role || 'member') as 'manager' | 'member')
  )
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!member) return

    setIsSubmitting(true)
    try {
      await onChangeRole(member.id, selectedRole)
      onOpenChange(false)
    } catch (error) {
      console.error('Failed to change role:', error)
      alert(error instanceof Error ? error.message : '更改角色失败')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!member) return null

  const isCurrentlyAdmin = member.role === 'admin'

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>更改用户角色</DialogTitle>
            <DialogDescription>为 {member.full_name} 设置新的角色</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="p-4 bg-accent/50 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-linear-to-br from-avatar-from to-avatar-to flex items-center justify-center text-white font-semibold">
                  {member.full_name ? member.full_name.charAt(0).toUpperCase() : '?'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium">{member.full_name || '未命名'}</p>
                  <p className="text-sm text-muted-foreground">
                    当前角色: {roleLabels[member.role]}
                  </p>
                </div>
              </div>
            </div>

            {isCurrentlyAdmin ? (
              <div className="p-4 bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-lg space-y-2">
                <div className="text-sm text-amber-800 dark:text-amber-200">
                  ⚠️ <strong>系统管理员(admin)权限较高</strong>
                </div>
                <div className="text-sm text-amber-700 dark:text-amber-300">
                  出于安全考虑，请直接在 Supabase Dashboard 的 SQL Editor
                  中执行以下命令来更改管理员角色：
                </div>
                <pre className="p-2 bg-amber-100 dark:bg-amber-900 rounded text-xs overflow-x-auto">
                  UPDATE profiles {'\n'}
                  SET role = 'member'{'\n'} -- 或 'manager'{'\n'}
                  WHERE id = '{member.id}';
                </pre>
              </div>
            ) : (
              <div className="space-y-2">
                <Label htmlFor="role">新角色</Label>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" className="w-full justify-between">
                      {roleLabels[selectedRole]}
                      <ChevronDown className="h-4 w-4 opacity-50" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-full">
                    <DropdownMenuItem onClick={() => setSelectedRole('member')}>
                      成员
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setSelectedRole('manager')}>
                      经理
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                <p className="text-xs text-muted-foreground">{roleDescriptions[selectedRole]}</p>
                <p className="text-xs text-amber-600">
                  💡 提示: 系统管理员(admin)权限较高，请直接在 Supabase Dashboard 修改数据库
                </p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              {isCurrentlyAdmin ? '关闭' : '取消'}
            </Button>
            {!isCurrentlyAdmin && (
              <Button type="submit" disabled={isSubmitting || selectedRole === member.role}>
                {isSubmitting ? (
                  '更改中...'
                ) : (
                  <>
                    <Shield className="h-4 w-4 mr-2" />
                    确认更改
                  </>
                )}
              </Button>
            )}
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
