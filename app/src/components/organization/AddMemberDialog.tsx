import { useState, useEffect } from 'react';
import { Search, UserPlus, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import type { Profile } from '@/lib/supabase/organizationTypes';

interface AddMemberDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organizationId: string;
  organizationName: string;
  currentMembers: Profile[];
  onSearchUsers: (query: string) => Promise<Profile[]>;
  onAddMember: (userId: string, role: 'manager' | 'member') => Promise<void>;
}

const roleLabels = {
  manager: '经理',
  member: '成员',
};

const roleDescriptions = {
  manager: '🔐 团队管理员 - 可管理本团队及子团队的组织架构和成员（限当前组织树）',
  member: '👤 普通成员 - 只能管理自己的资源（默认角色）',
};

export function AddMemberDialog({
  open,
  onOpenChange,
  organizationName,
  currentMembers,
  onSearchUsers,
  onAddMember,
}: AddMemberDialogProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Profile[]>([]);
  const [selectedUser, setSelectedUser] = useState<Profile | null>(null);
  const [selectedRole, setSelectedRole] = useState<'manager' | 'member'>('member');
  const [isSearching, setIsSearching] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!open) {
      setSearchQuery('');
      setSearchResults([]);
      setSelectedUser(null);
      setSelectedRole('member');
    }
  }, [open]);

  useEffect(() => {
    const searchTimer = setTimeout(async () => {
      if (searchQuery.trim().length >= 2) {
        setIsSearching(true);
        try {
          const results = await onSearchUsers(searchQuery.trim());
          const currentMemberIds = new Set(currentMembers.map(m => m.id));
          const filteredResults = results.filter(user => !currentMemberIds.has(user.id));
          setSearchResults(filteredResults);
        } catch (error) {
          console.error('Failed to search users:', error);
          setSearchResults([]);
        } finally {
          setIsSearching(false);
        }
      } else {
        setSearchResults([]);
      }
    }, 300);

    return () => clearTimeout(searchTimer);
  }, [searchQuery, onSearchUsers, currentMembers]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;

    setIsSubmitting(true);
    try {
      await onAddMember(selectedUser.id, selectedRole);
      onOpenChange(false);
    } catch (error) {
      console.error('Failed to add member:', error);
      alert(error instanceof Error ? error.message : '添加成员失败');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>添加成员到 {organizationName}</DialogTitle>
            <DialogDescription>
              搜索用户并将其添加到当前组织
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="search">搜索用户</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="search"
                  placeholder="输入用户名或邮箱搜索..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {isSearching && (
              <p className="text-sm text-muted-foreground">搜索中...</p>
            )}

            {searchQuery.trim().length >= 2 && !isSearching && searchResults.length === 0 && (
              <p className="text-sm text-muted-foreground">未找到符合条件的用户</p>
            )}

            {searchResults.length > 0 && (
              <div className="space-y-2 max-h-[300px] overflow-y-auto border rounded-lg p-2">
                {searchResults.map((user) => (
                  <button
                    key={user.id}
                    type="button"
                    onClick={() => setSelectedUser(user)}
                    className={`w-full flex items-center gap-3 p-3 rounded-lg border transition-colors ${
                      selectedUser?.id === user.id
                        ? 'border-primary bg-accent'
                        : 'border-border hover:bg-accent/50'
                    }`}
                  >
                    <div className="flex-shrink-0 w-10 h-10 rounded-full bg-linear-to-br from-avatar-from to-avatar-to flex items-center justify-center text-white font-semibold">
                      {user.full_name ? user.full_name.charAt(0).toUpperCase() : '?'}
                    </div>
                    <div className="flex-1 min-w-0 text-left">
                      <p className="font-medium truncate">{user.full_name || '未命名'}</p>
                      <p className="text-sm text-muted-foreground truncate">{user.id}</p>
                    </div>
                    {user.organization_id && (
                      <Badge variant="secondary" className="text-xs">
                        已在其他组织
                      </Badge>
                    )}
                  </button>
                ))}
              </div>
            )}

            {selectedUser && (
              <div className="space-y-2 p-4 bg-accent/50 rounded-lg">
                <p className="text-sm font-medium">已选择用户:</p>
                <div className="flex items-center gap-3">
                  <div className="flex-shrink-0 w-10 h-10 rounded-full bg-linear-to-br from-avatar-from to-avatar-to flex items-center justify-center text-white font-semibold">
                    {selectedUser.full_name ? selectedUser.full_name.charAt(0).toUpperCase() : '?'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium">{selectedUser.full_name || '未命名'}</p>
                    <p className="text-sm text-muted-foreground truncate">{selectedUser.id}</p>
                  </div>
                </div>

                <div className="space-y-2 mt-4">
                  <Label htmlFor="role">选择角色</Label>
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
                  <p className="text-xs text-muted-foreground">
                    {roleDescriptions[selectedRole]}
                  </p>
                  <p className="text-xs text-amber-600">
                    💡 提示: 系统管理员(admin)权限较高，请直接在 Supabase Dashboard 修改数据库
                  </p>
                </div>
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
              取消
            </Button>
            <Button type="submit" disabled={!selectedUser || isSubmitting}>
              {isSubmitting ? '添加中...' : (
                <>
                  <UserPlus className="h-4 w-4 mr-2" />
                  添加成员
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}