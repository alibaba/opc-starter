import { create } from 'zustand'

export type ToastVariant = 'default' | 'success' | 'error' | 'warning' | 'info'

export interface Toast {
  id: string
  title?: string
  description?: string
  variant?: ToastVariant
  duration?: number
  action?: {
    label: string
    onClick: () => void
  }
}

interface ToastState {
  toasts: Toast[]
  add: (toast: Omit<Toast, 'id'>) => void
  remove: (id: string) => void
  removeAll: () => void
}

export const useToastStore = create<ToastState>((set) => ({
  toasts: [],
  add: (toast) => {
    const id = Math.random().toString(36).substring(2, 9)
    const newToast: Toast = {
      id,
      variant: 'default',
      duration: 5000,
      ...toast,
    }

    set((state) => ({
      toasts: [...state.toasts, newToast],
    }))

    // 自动移除
    if (newToast.duration && newToast.duration > 0) {
      setTimeout(() => {
        set((state) => ({
          toasts: state.toasts.filter((t) => t.id !== id),
        }))
      }, newToast.duration)
    }

    return id
  },
  remove: (id) =>
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    })),
  removeAll: () => set({ toasts: [] }),
}))

// Toast Hook
export const useToast = () => {
  const { add, remove, removeAll } = useToastStore()

  return {
    toast: add,
    dismiss: remove,
    dismissAll: removeAll,
    success: (title: string, description?: string) =>
      add({ title, description, variant: 'success' }),
    error: (title: string, description?: string) =>
      add({ title, description, variant: 'error' }),
    warning: (title: string, description?: string) =>
      add({ title, description, variant: 'warning' }),
    info: (title: string, description?: string) =>
      add({ title, description, variant: 'info' }),
  }
}
