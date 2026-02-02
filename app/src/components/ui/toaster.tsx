import { useEffect } from 'react'
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react'
import type { Toast, ToastVariant } from '@/hooks/useToast'
import { useToastStore } from '@/hooks/useToast'
import { cn } from '@/lib/utils'

const variantConfig: Record<
  ToastVariant,
  {
    icon: React.ElementType
    className: string
  }
> = {
  default: {
    icon: Info,
    className: 'bg-card border-border',
  },
  success: {
    icon: CheckCircle,
    className: 'bg-success/10 border-success/30 text-success',
  },
  error: {
    icon: AlertCircle,
    className: 'bg-destructive/10 border-destructive/30 text-destructive',
  },
  warning: {
    icon: AlertTriangle,
    className: 'bg-warning/10 border-warning/30 text-warning-foreground',
  },
  info: {
    icon: Info,
    className: 'bg-primary/10 border-primary/30 text-primary',
  },
}

interface ToastItemProps {
  toast: Toast
  onClose: () => void
}

function ToastItem({ toast, onClose }: ToastItemProps) {
  const variant = toast.variant || 'default'
  const config = variantConfig[variant]
  const Icon = config.icon

  useEffect(() => {
    if (toast.duration && toast.duration > 0) {
      const timer = setTimeout(onClose, toast.duration)
      return () => clearTimeout(timer)
    }
  }, [toast.duration, onClose])

  return (
    <div
      className={cn(
        'pointer-events-auto w-full max-w-sm rounded-lg border shadow-lg p-4 transition-all',
        'animate-in slide-in-from-top-full duration-300',
        config.className
      )}
    >
      <div className="flex items-start gap-3">
        <Icon className="w-5 h-5 flex-shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          {toast.title && (
            <div className="font-semibold text-sm mb-1">{toast.title}</div>
          )}
          {toast.description && (
            <div className="text-sm opacity-90">{toast.description}</div>
          )}
          {toast.action && (
            <button
              onClick={toast.action.onClick}
              className="text-sm font-medium underline mt-2 hover:opacity-80"
            >
              {toast.action.label}
            </button>
          )}
        </div>
        <button
          onClick={onClose}
          className="flex-shrink-0 rounded-lg p-1 hover:bg-foreground/10 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}

export function Toaster() {
  const { toasts, remove } = useToastStore()

  return (
    <div className="fixed top-0 right-0 z-50 p-4 pointer-events-none">
      <div className="flex flex-col gap-2">
        {toasts.map((toast) => (
          <ToastItem
            key={toast.id}
            toast={toast}
            onClose={() => remove(toast.id)}
          />
        ))}
      </div>
    </div>
  )
}
