/**
 * downloadHelper 单元测试
 * 测试下载工具函数
 */

import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { downloadBlob, downloadBase64, base64ToBlob } from '../downloadHelper'

describe('downloadHelper', () => {
  let mockCreateObjectURL: ReturnType<typeof vi.fn>
  let mockRevokeObjectURL: ReturnType<typeof vi.fn>
  let mockCreateElement: ReturnType<typeof vi.fn>
  let mockAppendChild: ReturnType<typeof vi.fn>
  let mockRemoveChild: ReturnType<typeof vi.fn>
  let mockLink: { href: string; download: string; click: ReturnType<typeof vi.fn> }

  beforeEach(() => {
    mockCreateObjectURL = vi.fn().mockReturnValue('blob:mock-url')
    mockRevokeObjectURL = vi.fn()
    mockLink = {
      href: '',
      download: '',
      click: vi.fn(),
    }
    mockCreateElement = vi.fn().mockImplementation((tag: string) => {
      if (tag === 'a') {
        return mockLink
      }
      return document.createElement(tag)
    })
    mockAppendChild = vi.fn()
    mockRemoveChild = vi.fn()

    vi.spyOn(URL, 'createObjectURL').mockImplementation(
      mockCreateObjectURL as (obj: Blob | MediaSource) => string
    )
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(
      mockRevokeObjectURL as (url: string) => void
    )
    vi.spyOn(document, 'createElement').mockImplementation(
      mockCreateElement as typeof document.createElement
    )
    vi.spyOn(document.body, 'appendChild').mockImplementation(
      mockAppendChild as (node: Node) => Node
    )
    vi.spyOn(document.body, 'removeChild').mockImplementation(
      mockRemoveChild as (child: Node) => Node
    )
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('downloadBlob', () => {
    it('创建 link 并设置正确的 href 和 download，点击后移除并 revoke URL', () => {
      const blob = new Blob(['test'], { type: 'text/plain' })
      downloadBlob(blob, 'test.txt')

      expect(mockCreateObjectURL).toHaveBeenCalledWith(blob)
      expect(mockLink.href).toBe('blob:mock-url')
      expect(mockLink.download).toBe('test.txt')
      expect(mockAppendChild).toHaveBeenCalledWith(mockLink)
      expect(mockLink.click).toHaveBeenCalled()
      expect(mockRemoveChild).toHaveBeenCalledWith(mockLink)
      expect(mockRevokeObjectURL).toHaveBeenCalledWith('blob:mock-url')
    })
  })

  describe('downloadBase64', () => {
    it('创建 link 并设置 href 为 base64，点击后移除', () => {
      const dataUri = 'data:image/png;base64,iVBORw0KGgo='
      downloadBase64(dataUri, 'image.png')

      expect(mockCreateElement).toHaveBeenCalledWith('a')
      expect(mockLink.href).toBe(dataUri)
      expect(mockLink.download).toBe('image.png')
      expect(mockAppendChild).toHaveBeenCalledWith(mockLink)
      expect(mockLink.click).toHaveBeenCalled()
      expect(mockRemoveChild).toHaveBeenCalledWith(mockLink)
    })
  })

  describe('base64ToBlob', () => {
    it('正确解析 data URI 格式', () => {
      const dataUri = 'data:image/png;base64,iVBORw0KGgo='
      const blob = base64ToBlob(dataUri)

      expect(blob).toBeInstanceOf(Blob)
      expect(blob.type).toBe('image/png')
      expect(blob.size).toBeGreaterThan(0)
    })

    it('plain base64 字符串（无 data URI 前缀）会抛出或产生异常', () => {
      const plainBase64 = 'iVBORw0KGgo='
      expect(() => base64ToBlob(plainBase64)).toThrow()
    })
  })
})
