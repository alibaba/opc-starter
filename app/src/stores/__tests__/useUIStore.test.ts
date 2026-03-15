/**
 * useUIStore 单元测试
 * 测试 UI 状态管理的纯状态操作
 */

import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useUIStore } from '../useUIStore'

describe('useUIStore', () => {
  beforeEach(() => {
    useUIStore.setState({
      loading: false,
      uploadProgress: 0,
      modal: { isOpen: false },
      toast: { isVisible: false, message: '', type: 'info', duration: 3000 },
    })
  })

  describe('showLoading / hideLoading', () => {
    it('showLoading 将 loading 设为 true', () => {
      const { showLoading } = useUIStore.getState()
      showLoading()
      expect(useUIStore.getState().loading).toBe(true)
    })

    it('hideLoading 将 loading 设为 false', () => {
      useUIStore.setState({ loading: true })
      const { hideLoading } = useUIStore.getState()
      hideLoading()
      expect(useUIStore.getState().loading).toBe(false)
    })
  })

  describe('setUploadProgress', () => {
    it('setUploadProgress 设置 uploadProgress', () => {
      const { setUploadProgress } = useUIStore.getState()
      setUploadProgress(50)
      expect(useUIStore.getState().uploadProgress).toBe(50)
    })
  })

  describe('openModal / closeModal', () => {
    it('openModal 设置 modal.isOpen 为 true 并合并 config', () => {
      const onConfirm = vi.fn()
      const { openModal } = useUIStore.getState()
      openModal({
        title: '测试标题',
        content: '测试内容',
        onConfirm,
      })
      const { modal } = useUIStore.getState()
      expect(modal.isOpen).toBe(true)
      expect(modal.title).toBe('测试标题')
      expect(modal.content).toBe('测试内容')
      expect(modal.onConfirm).toBe(onConfirm)
    })

    it('closeModal 设置 modal.isOpen 为 false', () => {
      useUIStore.setState({
        modal: { isOpen: true, title: '标题' },
      })
      const { closeModal } = useUIStore.getState()
      closeModal()
      expect(useUIStore.getState().modal.isOpen).toBe(false)
    })
  })

  describe('showToast / hideToast', () => {
    it('showToast 设置 toast 可见，默认 type 为 info，duration 为 3000', () => {
      const { showToast } = useUIStore.getState()
      showToast('测试消息')
      const { toast } = useUIStore.getState()
      expect(toast.isVisible).toBe(true)
      expect(toast.message).toBe('测试消息')
      expect(toast.type).toBe('info')
      expect(toast.duration).toBe(3000)
    })

    it('showToast 支持自定义 type 和 duration', () => {
      const { showToast } = useUIStore.getState()
      showToast('成功', 'success', 5000)
      const { toast } = useUIStore.getState()
      expect(toast.type).toBe('success')
      expect(toast.duration).toBe(5000)
    })

    it('hideToast 隐藏 toast', () => {
      useUIStore.setState({
        toast: { isVisible: true, message: '消息', type: 'info', duration: 3000 },
      })
      const { hideToast } = useUIStore.getState()
      hideToast()
      expect(useUIStore.getState().toast.isVisible).toBe(false)
    })
  })
})
