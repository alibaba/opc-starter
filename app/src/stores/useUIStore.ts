import { create } from 'zustand';

/**
 * Modal配置
 */
interface ModalConfig {
  isOpen: boolean;
  title?: string;
  content?: React.ReactNode;
  onConfirm?: () => void;
  onCancel?: () => void;
}

/**
 * Toast配置
 */
interface ToastConfig {
  isVisible: boolean;
  message: string;
  type: 'success' | 'error' | 'warning' | 'info';
  duration?: number;
}

/**
 * UI状态管理
 */
interface UIState {
  // 状态
  loading: boolean;
  uploadProgress: number; // 0-100
  modal: ModalConfig;
  toast: ToastConfig;

  // Actions
  showLoading: () => void;
  hideLoading: () => void;
  setUploadProgress: (progress: number) => void;
  openModal: (config: Omit<ModalConfig, 'isOpen'>) => void;
  closeModal: () => void;
  showToast: (message: string, type?: ToastConfig['type'], duration?: number) => void;
  hideToast: () => void;
}

export const useUIStore = create<UIState>((set) => ({
  // 初始状态
  loading: false,
  uploadProgress: 0,
  modal: {
    isOpen: false,
  },
  toast: {
    isVisible: false,
    message: '',
    type: 'info',
    duration: 3000,
  },

  // Actions实现
  showLoading: () => set({ loading: true }),

  hideLoading: () => set({ loading: false }),

  setUploadProgress: (progress) => set({ uploadProgress: progress }),

  openModal: (config) =>
    set({
      modal: {
        isOpen: true,
        ...config,
      },
    }),

  closeModal: () =>
    set({
      modal: {
        isOpen: false,
      },
    }),

  showToast: (message, type = 'info', duration = 3000) =>
    set({
      toast: {
        isVisible: true,
        message,
        type,
        duration,
      },
    }),

  hideToast: () =>
    set((state) => ({
      toast: {
        ...state.toast,
        isVisible: false,
      },
    })),
}));
