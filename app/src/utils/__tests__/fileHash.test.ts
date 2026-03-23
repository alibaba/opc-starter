/**
 * fileHash 文件哈希计算测试
 * 注：这些函数依赖 crypto.subtle，在 Node.js 测试环境中需要特殊处理
 */
import { describe, it, expect, vi } from 'vitest'
import { calculateFileMD5, calculateMD5FromBlob } from '../fileHash'

describe('fileHash', () => {
  // Mock crypto.subtle for Node.js environment
  const mockDigest = vi.fn()
  beforeEach(() => {
    vi.stubGlobal('crypto', {
      subtle: {
        digest: mockDigest,
      },
    })
    mockDigest.mockResolvedValue(new Uint8Array([0x12, 0x34, 0x56, 0x78]).buffer)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  describe('calculateFileMD5', () => {
    it('应该计算文件的 SHA-256 哈希', async () => {
      const content = 'Hello, World!'
      const file = new File([content], 'test.txt', { type: 'text/plain' })

      const hash = await calculateFileMD5(file)

      expect(hash).toBeDefined()
      expect(hash).toMatch(/^[a-f0-9]+$/) // 应该是十六进制字符串
    })

    it('应该调用 crypto.subtle.digest', async () => {
      const file = new File(['test'], 'test.txt', { type: 'text/plain' })

      await calculateFileMD5(file)

      expect(mockDigest).toHaveBeenCalledWith('SHA-256', expect.any(ArrayBuffer))
    })
  })

  describe('calculateMD5FromBlob', () => {
    it('应该计算 Blob 的 SHA-256 哈希', async () => {
      const blob = new Blob(['Hello, Blob!'], { type: 'text/plain' })

      const hash = await calculateMD5FromBlob(blob)

      expect(hash).toBeDefined()
      expect(hash).toMatch(/^[a-f0-9]+$/) // 应该是十六进制字符串
    })

    it('应该调用 crypto.subtle.digest', async () => {
      const blob = new Blob(['test'], { type: 'text/plain' })

      await calculateMD5FromBlob(blob)

      expect(mockDigest).toHaveBeenCalledWith('SHA-256', expect.any(ArrayBuffer))
    })
  })
})
