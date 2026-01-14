import { useState } from 'react';
import { ChevronDown, Check, Building2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import type { OrganizationTreeNode } from '@/lib/supabase/organizationTypes';

interface OrgTreeSelectorProps {
  value: string | null;
  onChange: (orgId: string) => void;
  tree: OrganizationTreeNode[];
  className?: string;
  placeholder?: string;
}

interface OrgTreeNodeItemProps {
  node: OrganizationTreeNode;
  level: number;
  selectedId: string | null;
  onSelect: (orgId: string) => void;
}

function OrgTreeNodeItem({ node, level, selectedId, onSelect }: OrgTreeNodeItemProps) {
  const isSelected = selectedId === node.id;
  const hasChildren = node.children && node.children.length > 0;

  return (
    <div>
      <button
        className={cn(
          'w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-accent transition-colors text-left',
          isSelected && 'bg-accent font-medium'
        )}
        style={{ paddingLeft: `${level * 16 + 12}px` }}
        onClick={() => onSelect(node.id)}
      >
        <Building2 className="h-4 w-4 text-muted-foreground flex-shrink-0" />
        <span className="flex-1 truncate">{node.display_name}</span>
        {isSelected && <Check className="h-4 w-4 text-primary flex-shrink-0" />}
      </button>
      {hasChildren &&
        node.children!.map((child) => (
          <OrgTreeNodeItem
            key={child.id}
            node={child}
            level={level + 1}
            selectedId={selectedId}
            onSelect={onSelect}
          />
        ))}
    </div>
  );
}

export function OrgTreeSelector({
  value,
  onChange,
  tree,
  className,
  placeholder = '选择组织',
}: OrgTreeSelectorProps) {
  const [open, setOpen] = useState(false);

  const findNodeById = (nodes: OrganizationTreeNode[], id: string): OrganizationTreeNode | null => {
    for (const node of nodes) {
      if (node.id === id) return node;
      if (node.children) {
        const found = findNodeById(node.children, id);
        if (found) return found;
      }
    }
    return null;
  };

  const selectedNode = value ? findNodeById(tree, value) : null;

  const handleSelect = (orgId: string) => {
    onChange(orgId);
    setOpen(false);
  };

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          className={cn('w-full justify-between', className)}
        >
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <Building2 className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            <span className="truncate">
              {selectedNode ? selectedNode.display_name : placeholder}
            </span>
          </div>
          <ChevronDown className="h-4 w-4 ml-2 flex-shrink-0 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-[400px] max-h-[400px] overflow-y-auto p-0 bg-white dark:bg-slate-900">
        {tree.length === 0 ? (
          <div className="px-3 py-8 text-center text-sm text-muted-foreground">
            暂无组织数据
          </div>
        ) : (
          <div className="py-1 bg-popover">
            {tree.map((node) => (
              <OrgTreeNodeItem
                key={node.id}
                node={node}
                level={0}
                selectedId={value}
                onSelect={handleSelect}
              />
            ))}
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
