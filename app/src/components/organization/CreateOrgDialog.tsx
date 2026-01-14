import { useState } from 'react';
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
import { Textarea } from '@/components/ui/textarea';
import type { Organization, CreateOrganizationInput } from '@/lib/supabase/organizationTypes';

interface CreateOrgDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  parentOrg: Organization | null;
  onSubmit: (input: CreateOrganizationInput) => Promise<void>;
}

export function CreateOrgDialog({ open, onOpenChange, parentOrg, onSubmit }: CreateOrgDialogProps) {
  const [name, setName] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !displayName.trim()) return;

    setIsSubmitting(true);
    try {
      await onSubmit({
        name: name.trim(),
        display_name: displayName.trim(),
        parent_id: parentOrg?.id || null,
        description: description.trim() || null,
      });
      setName('');
      setDisplayName('');
      setDescription('');
      onOpenChange(false);
    } catch (error) {
      console.error('Failed to create organization:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>创建组织</DialogTitle>
            <DialogDescription>
              {parentOrg ? `在 "${parentOrg.display_name}" 下创建子组织` : '创建根组织'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">组织标识 *</Label>
              <Input
                id="name"
                placeholder="例如: mysql-team (用于路径，仅英文、数字、横线)"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                pattern="[a-z0-9-]+"
              />
              <p className="text-xs text-muted-foreground">
                仅支持小写字母、数字和横线
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="displayName">显示名称 *</Label>
              <Input
                id="displayName"
                placeholder="例如: MySQL 团队"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">描述（可选）</Label>
              <Textarea
                id="description"
                placeholder="组织简介..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
              />
            </div>
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
            <Button type="submit" disabled={isSubmitting || !name.trim() || !displayName.trim()}>
              {isSubmitting ? '创建中...' : '创建'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
