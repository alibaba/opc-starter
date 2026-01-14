import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { OrgTree } from '@/components/organization/OrgTree';
import type { OrganizationTreeNode, Organization } from '@/lib/supabase/organizationTypes';

interface AssignTeamDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  userName: string;
  currentOrg: Organization | null;
  organizationTree: OrganizationTreeNode[];
  onSubmit: (userId: string, organizationId: string | null) => Promise<void>;
}

export function AssignTeamDialog({
  open,
  onOpenChange,
  userId,
  userName,
  currentOrg,
  organizationTree,
  onSubmit,
}: AssignTeamDialogProps) {
  const [selectedOrg, setSelectedOrg] = useState<OrganizationTreeNode | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (open && currentOrg) {
      setSelectedOrg(currentOrg as OrganizationTreeNode);
    }
  }, [open, currentOrg]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    setIsSubmitting(true);
    try {
      await onSubmit(userId, selectedOrg?.id || null);
      onOpenChange(false);
    } catch (error) {
      console.error('Failed to assign team:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSelectOrg = (node: OrganizationTreeNode) => {
    setSelectedOrg(node);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>分配团队</DialogTitle>
            <DialogDescription>
              为用户 "{userName}" 分配所属组织团队
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            <Label className="mb-2 block">选择组织</Label>
            <div className="border rounded-md p-4 max-h-96 overflow-y-auto">
              <OrgTree
                tree={organizationTree}
                selectedId={selectedOrg?.id || null}
                onSelect={handleSelectOrg}
              />
            </div>
            
            {selectedOrg && (
              <div className="mt-3 p-3 bg-accent rounded-md">
                <p className="text-sm">
                  <span className="text-muted-foreground">已选择：</span>
                  <span className="font-medium ml-2">{selectedOrg.display_name}</span>
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
              取消
            </Button>
            <Button type="submit" disabled={isSubmitting || !selectedOrg}>
              {isSubmitting ? '分配中...' : '确认分配'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
