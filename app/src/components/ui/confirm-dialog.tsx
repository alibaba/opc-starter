/**
 * Confirm Dialog Component
 * Simple confirmation dialog for user actions
 */
import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './dialog';
import { Button } from './button';

export interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void | Promise<void>;
  variant?: 'default' | 'destructive';
}

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmText = '确认',
  cancelText = '取消',
  onConfirm,
  variant = 'default',
}: ConfirmDialogProps) {
  const [loading, setLoading] = useState(false);

  const handleConfirm = async () => {
    setLoading(true);
    try {
      await onConfirm();
      onOpenChange(false);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            {cancelText}
          </Button>
          <Button
            variant={variant === 'destructive' ? 'destructive' : 'default'}
            onClick={handleConfirm}
            disabled={loading}
          >
            {confirmText}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Hook for using confirm dialog
let globalConfirmCallback: ((confirmed: boolean) => void) | null = null;
let globalOpenCallback: ((props: Omit<ConfirmDialogProps, 'open' | 'onOpenChange'>) => void) | null = null;

export function useConfirmDialog() {
  const [dialogProps, setDialogProps] = useState<Omit<ConfirmDialogProps, 'open' | 'onOpenChange'> | null>(null);

  return {
    open: !!dialogProps,
    dialogProps: dialogProps || undefined,
    confirm: (props: Omit<ConfirmDialogProps, 'open' | 'onOpenChange'>) => {
      return new Promise<boolean>((resolve) => {
        setDialogProps(props);
        globalConfirmCallback = resolve;
      });
    },
    close: (confirmed: boolean) => {
      setDialogProps(null);
      if (globalConfirmCallback) {
        globalConfirmCallback(confirmed);
        globalConfirmCallback = null;
      }
    },
  };
}

// Helper functions
export async function confirm(title: string, description: string): Promise<boolean> {
  return new Promise((resolve) => {
    if (globalOpenCallback) {
      globalConfirmCallback = resolve;
      globalOpenCallback({
        title,
        description,
        onConfirm: () => resolve(true),
      });
    } else {
      resolve(false);
    }
  });
}

export async function confirmDelete(title: string, description: string): Promise<boolean> {
  return confirm(title, description);
}

export async function confirmCancel(title: string, description: string): Promise<boolean> {
  return confirm(title, description);
}

export async function confirmSave(title: string, description: string): Promise<boolean> {
  return confirm(title, description);
}

// Global confirm dialog component
export function GlobalConfirmDialog() {
  const [dialogProps, setDialogProps] = useState<Omit<ConfirmDialogProps, 'open' | 'onOpenChange'> | null>(null);

  // Register global callback
  if (!globalOpenCallback) {
    globalOpenCallback = setDialogProps;
  }

  if (!dialogProps) return null;

  return (
    <ConfirmDialog
      {...dialogProps}
      open={true}
      onOpenChange={(open) => {
        if (!open) {
          setDialogProps(null);
          if (globalConfirmCallback) {
            globalConfirmCallback(false);
            globalConfirmCallback = null;
          }
        }
      }}
    />
  );
}
