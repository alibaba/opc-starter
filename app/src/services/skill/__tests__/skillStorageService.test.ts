/**
 * SkillStorageService 单元测试
 *
 * 测试覆盖：
 * - 版本发布
 * - 文件上传/下载
 * - 文件验证
 * - 文件删除
 * - 工具函数
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import type { PublishVersionRequest, DownloadSkillRequest } from '@/types/skill'

// Mock Supabase - 使用工厂函数，在内部定义所有 mock
vi.mock('@/lib/supabase/client', () => {
  // 在工厂函数内部创建共享的 mockStorage
  const mockStorage = {
    upload: vi.fn(),
    remove: vi.fn(),
    list: vi.fn(),
    getPublicUrl: vi.fn().mockReturnValue({ data: { publicUrl: 'https://example.com/file.zip' } }),
  }

  return {
    supabase: {
      functions: {
        invoke: vi.fn(),
      },
      storage: {
        from: vi.fn().mockReturnValue(mockStorage),
      },
    },
  }
})

// Import after mocking
import { supabase } from '@/lib/supabase/client'
import { skillStorageService } from '../skillStorageService'

// ============================================
// 测试数据
// ============================================

const mockFile = new File(['test content'], 'test.zip', { type: 'application/zip' })

const mockPublishRequest: PublishVersionRequest = {
  skill_id: 'skill-1',
  version: '1.0.0',
  changelog: 'Initial release',
  readme: '# README',
  file_size: 1024,
}

const mockDownloadRequest: DownloadSkillRequest = {
  skill_slug: 'test-skill',
  version: '1.0.0',
  install_type: 'web',
  client_info: {
    platform: 'macos',
    version: '1.0.0',
    os: 'darwin',
  },
}

// ============================================
// 测试套件
// ============================================

describe('skillStorageService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  // ============================================================
  // publishVersion
  // ============================================================
  describe('publishVersion', () => {
    it('应该成功发布版本', async () => {
      const mockResponse = {
        upload_url: 'https://signed-url.example.com',
        storage_path: 'skills/skill-1/1.0.0.zip',
        version_id: 'version-1',
      }
      vi.mocked(supabase.functions.invoke).mockResolvedValue({ data: mockResponse, error: null })

      const result = await skillStorageService.publishVersion(mockPublishRequest)

      expect(result).toEqual(mockResponse)
      expect(supabase.functions.invoke).toHaveBeenCalledWith('skills-publish', {
        body: {
          action: 'publish_version',
          ...mockPublishRequest,
        },
      })
    })

    it('发布失败应该抛出错误', async () => {
      const error = new Error('Publish failed')
      vi.mocked(supabase.functions.invoke).mockResolvedValue({ data: null, error })

      await expect(skillStorageService.publishVersion(mockPublishRequest)).rejects.toThrow(
        'Publish failed'
      )
    })
  })

  // ============================================================
  // uploadWithSignedUrl
  // ============================================================
  describe('uploadWithSignedUrl', () => {
    // 保存原始 XMLHttpRequest
    let originalXHR: typeof XMLHttpRequest

    beforeEach(() => {
      originalXHR = globalThis.XMLHttpRequest
    })

    afterEach(() => {
      globalThis.XMLHttpRequest = originalXHR
    })

    it('应该使用签名 URL 上传文件', async () => {
      const mockXHR = {
        upload: { addEventListener: vi.fn() },
        addEventListener: vi.fn((event: string, handler: () => void) => {
          if (event === 'load') {
            setTimeout(() => {
              Object.defineProperty(mockXHR, 'status', { value: 200 })
              handler()
            }, 10)
          }
        }),
        open: vi.fn(),
        setRequestHeader: vi.fn(),
        send: vi.fn(),
        status: 200,
      }

      class MockXHR {
        upload = { addEventListener: mockXHR.upload.addEventListener }
        addEventListener = mockXHR.addEventListener
        open = mockXHR.open
        setRequestHeader = mockXHR.setRequestHeader
        send = mockXHR.send
        status = 200
      }
      globalThis.XMLHttpRequest = MockXHR as unknown as typeof XMLHttpRequest

      const onProgress = vi.fn()
      const promise = skillStorageService.uploadWithSignedUrl(
        'https://signed-url.example.com',
        mockFile,
        onProgress
      )

      await expect(promise).resolves.not.toThrow()
      expect(mockXHR.open).toHaveBeenCalledWith('PUT', 'https://signed-url.example.com')
      expect(mockXHR.setRequestHeader).toHaveBeenCalledWith('Content-Type', 'application/zip')
    })

    it('上传失败应该抛出错误', async () => {
      const mockXHR = {
        upload: { addEventListener: vi.fn() },
        addEventListener: vi.fn((event: string, handler: () => void) => {
          if (event === 'error') {
            setTimeout(handler, 10)
          }
        }),
        open: vi.fn(),
        setRequestHeader: vi.fn(),
        send: vi.fn(),
      }

      class MockXHR {
        upload = { addEventListener: mockXHR.upload.addEventListener }
        addEventListener = mockXHR.addEventListener
        open = mockXHR.open
        setRequestHeader = mockXHR.setRequestHeader
        send = mockXHR.send
      }
      globalThis.XMLHttpRequest = MockXHR as unknown as typeof XMLHttpRequest

      await expect(
        skillStorageService.uploadWithSignedUrl('https://signed-url.example.com', mockFile)
      ).rejects.toThrow('Network error')
    })

    it('上传中止应该抛出错误', async () => {
      const mockXHR = {
        upload: { addEventListener: vi.fn() },
        addEventListener: vi.fn((event: string, handler: () => void) => {
          if (event === 'abort') {
            setTimeout(handler, 10)
          }
        }),
        open: vi.fn(),
        setRequestHeader: vi.fn(),
        send: vi.fn(),
      }

      class MockXHR {
        upload = { addEventListener: mockXHR.upload.addEventListener }
        addEventListener = mockXHR.addEventListener
        open = mockXHR.open
        setRequestHeader = mockXHR.setRequestHeader
        send = mockXHR.send
      }
      globalThis.XMLHttpRequest = MockXHR as unknown as typeof XMLHttpRequest

      await expect(
        skillStorageService.uploadWithSignedUrl('https://signed-url.example.com', mockFile)
      ).rejects.toThrow('Upload aborted')
    })

    it('应该报告上传进度', async () => {
      const onProgress = vi.fn()
      let progressHandler:
        | ((event: { lengthComputable: boolean; loaded: number; total: number }) => void)
        | null = null

      const mockXHR = {
        upload: {
          addEventListener: vi.fn((event: string, handler: typeof progressHandler) => {
            if (event === 'progress') {
              progressHandler = handler
            }
          }),
        },
        addEventListener: vi.fn((event: string, handler: () => void) => {
          if (event === 'load') {
            setTimeout(() => {
              // 先触发进度事件
              if (progressHandler) {
                progressHandler({ lengthComputable: true, loaded: 50, total: 100 })
              }
              Object.defineProperty(mockXHR, 'status', { value: 200 })
              handler()
            }, 10)
          }
        }),
        open: vi.fn(),
        setRequestHeader: vi.fn(),
        send: vi.fn(),
        status: 200,
      }

      class MockXHR {
        upload = { addEventListener: mockXHR.upload.addEventListener }
        addEventListener = mockXHR.addEventListener
        open = mockXHR.open
        setRequestHeader = mockXHR.setRequestHeader
        send = mockXHR.send
        status = 200
      }
      globalThis.XMLHttpRequest = MockXHR as unknown as typeof XMLHttpRequest

      await skillStorageService.uploadWithSignedUrl(
        'https://signed-url.example.com',
        mockFile,
        onProgress
      )

      expect(onProgress).toHaveBeenCalledWith(50)
    })
  })

  // ============================================================
  // getDownloadUrl
  // ============================================================
  describe('getDownloadUrl', () => {
    it('应该获取下载链接', async () => {
      const mockResponse = {
        download_url: 'https://download.example.com/file.zip',
        version: '1.0.0',
        file_size: 1024,
        file_hash: 'abc123',
      }
      vi.mocked(supabase.functions.invoke).mockResolvedValue({ data: mockResponse, error: null })

      const result = await skillStorageService.getDownloadUrl(mockDownloadRequest)

      expect(result).toEqual(mockResponse)
      expect(supabase.functions.invoke).toHaveBeenCalledWith('skills-download', {
        body: mockDownloadRequest,
      })
    })

    it('获取下载链接失败应该抛出错误', async () => {
      const error = new Error('Download failed')
      vi.mocked(supabase.functions.invoke).mockResolvedValue({ data: null, error })

      await expect(skillStorageService.getDownloadUrl(mockDownloadRequest)).rejects.toThrow(
        'Download failed'
      )
    })
  })

  // ============================================================
  // downloadFile
  // ============================================================
  describe('downloadFile', () => {
    it('应该下载文件并触发浏览器下载', async () => {
      const mockBlob = new Blob(['test'], { type: 'application/zip' })
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        blob: vi.fn().mockResolvedValue(mockBlob),
      })

      // Mock URL 和 document
      const mockUrl = 'blob:mock-url'
      global.URL.createObjectURL = vi.fn().mockReturnValue(mockUrl)
      global.URL.revokeObjectURL = vi.fn()

      const mockLink = {
        href: '',
        download: '',
        click: vi.fn(),
      }
      const mockBody = {
        appendChild: vi.fn(),
        removeChild: vi.fn(),
      }
      vi.spyOn(document, 'createElement').mockReturnValue(mockLink as unknown as HTMLAnchorElement)
      vi.spyOn(document, 'body', 'get').mockReturnValue(mockBody as unknown as HTMLBodyElement)

      await skillStorageService.downloadFile('https://download.example.com/file.zip', 'test.zip')

      expect(global.fetch).toHaveBeenCalledWith('https://download.example.com/file.zip')
      expect(mockLink.download).toBe('test.zip')
      expect(mockLink.click).toHaveBeenCalled()
      expect(global.URL.revokeObjectURL).toHaveBeenCalledWith(mockUrl)
    })

    it('下载失败应该抛出错误', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        statusText: 'Not Found',
      })

      await expect(
        skillStorageService.downloadFile('https://download.example.com/file.zip', 'test.zip')
      ).rejects.toThrow('Not Found')
    })
  })

  // ============================================================
  // uploadFile
  // ============================================================
  describe('uploadFile', () => {
    it('应该直接上传文件到 storage', async () => {
      const mockStorage = {
        upload: vi.fn().mockResolvedValue({ data: { path: 'skills/test.zip' }, error: null }),
      }
      vi.mocked(supabase.storage.from).mockReturnValue(mockStorage as never)

      const result = await skillStorageService.uploadFile(mockFile, 'skills/test.zip')

      expect(result).toEqual({ path: 'skills/test.zip' })
      expect(mockStorage.upload).toHaveBeenCalledWith('skills/test.zip', mockFile, {
        contentType: 'application/zip',
        upsert: false,
      })
    })

    it('上传失败应该抛出错误', async () => {
      const error = new Error('Upload failed')
      const mockStorage = {
        upload: vi.fn().mockResolvedValue({ data: null, error }),
      }
      vi.mocked(supabase.storage.from).mockReturnValue(mockStorage as never)

      await expect(skillStorageService.uploadFile(mockFile, 'skills/test.zip')).rejects.toThrow(
        'Upload failed'
      )
    })
  })

  // ============================================================
  // deleteFile
  // ============================================================
  describe('deleteFile', () => {
    it('应该删除文件', async () => {
      const mockStorage = {
        remove: vi.fn().mockResolvedValue({ error: null }),
      }
      vi.mocked(supabase.storage.from).mockReturnValue(mockStorage as never)

      await skillStorageService.deleteFile('skills/test.zip')

      expect(mockStorage.remove).toHaveBeenCalledWith(['skills/test.zip'])
    })

    it('删除失败应该抛出错误', async () => {
      const error = new Error('Delete failed')
      const mockStorage = {
        remove: vi.fn().mockResolvedValue({ error }),
      }
      vi.mocked(supabase.storage.from).mockReturnValue(mockStorage as never)

      await expect(skillStorageService.deleteFile('skills/test.zip')).rejects.toThrow(
        'Delete failed'
      )
    })
  })

  // ============================================================
  // getPublicUrl
  // ============================================================
  describe('getPublicUrl', () => {
    it('应该获取文件公开 URL', () => {
      // 为 getPublicUrl 测试设置特定的 mock 返回值
      const mockStorageWithPublicUrl = {
        getPublicUrl: vi
          .fn()
          .mockReturnValue({ data: { publicUrl: 'https://example.com/skills/test.zip' } }),
      }
      vi.mocked(supabase.storage.from).mockReturnValue(mockStorageWithPublicUrl as never)

      const url = skillStorageService.getPublicUrl('skills/test.zip')

      expect(url).toBe('https://example.com/skills/test.zip')
      expect(supabase.storage.from).toHaveBeenCalledWith('skills')
      expect(mockStorageWithPublicUrl.getPublicUrl).toHaveBeenCalledWith('skills/test.zip')
    })
  })

  // ============================================================
  // validateFileType
  // ============================================================
  describe('validateFileType', () => {
    it('应该接受有效的压缩文件类型', () => {
      const zipFile = new File([''], 'test.zip', { type: 'application/zip' })
      expect(skillStorageService.validateFileType(zipFile)).toBe(true)

      const tarFile = new File([''], 'test.tar', { type: 'application/x-tar' })
      expect(skillStorageService.validateFileType(tarFile)).toBe(true)

      const gzipFile = new File([''], 'test.gz', { type: 'application/gzip' })
      expect(skillStorageService.validateFileType(gzipFile)).toBe(true)
    })

    it('应该拒绝无效的文件类型', () => {
      const txtFile = new File([''], 'test.txt', { type: 'text/plain' })
      expect(skillStorageService.validateFileType(txtFile)).toBe(false)

      const exeFile = new File([''], 'test.exe', { type: 'application/x-msdownload' })
      expect(skillStorageService.validateFileType(exeFile)).toBe(false)
    })
  })

  // ============================================================
  // validateFileSize
  // ============================================================
  describe('validateFileSize', () => {
    it('应该接受小于 10MB 的文件', () => {
      const smallFile = new File(['x'.repeat(1024 * 1024)], 'small.zip', {
        type: 'application/zip',
      }) // 1MB
      expect(skillStorageService.validateFileSize(smallFile)).toBe(true)

      const exactFile = new File(['x'.repeat(10 * 1024 * 1024)], 'exact.zip', {
        type: 'application/zip',
      }) // 10MB
      expect(skillStorageService.validateFileSize(exactFile)).toBe(true)
    })

    it('应该拒绝大于 10MB 的文件', () => {
      const largeFile = new File(['x'.repeat(11 * 1024 * 1024)], 'large.zip', {
        type: 'application/zip',
      }) // 11MB
      expect(skillStorageService.validateFileSize(largeFile)).toBe(false)
    })
  })

  // ============================================================
  // formatFileSize
  // ============================================================
  describe('formatFileSize', () => {
    it('应该格式化字节', () => {
      expect(skillStorageService.formatFileSize(0)).toBe('0 Bytes')
      expect(skillStorageService.formatFileSize(512)).toBe('512 Bytes')
    })

    it('应该格式化为 KB', () => {
      expect(skillStorageService.formatFileSize(1024)).toBe('1 KB')
      expect(skillStorageService.formatFileSize(1536)).toBe('1.5 KB')
    })

    it('应该格式化为 MB', () => {
      expect(skillStorageService.formatFileSize(1024 * 1024)).toBe('1 MB')
      expect(skillStorageService.formatFileSize(5 * 1024 * 1024)).toBe('5 MB')
    })

    it('应该格式化为 GB', () => {
      expect(skillStorageService.formatFileSize(1024 * 1024 * 1024)).toBe('1 GB')
    })
  })

  // ============================================================
  // deleteSkillFiles
  // ============================================================
  describe('deleteSkillFiles', () => {
    it('应该删除 Skill 的所有文件', async () => {
      const mockFiles = [{ name: '1.0.0.zip' }, { name: '1.1.0.zip' }]
      const mockStorage = {
        list: vi.fn().mockResolvedValue({ data: mockFiles, error: null }),
        remove: vi.fn().mockResolvedValue({ error: null }),
      }
      vi.mocked(supabase.storage.from).mockReturnValue(mockStorage as never)

      await skillStorageService.deleteSkillFiles('user-1', 'test-skill')

      expect(mockStorage.list).toHaveBeenCalledWith('user-1/test-skill/', { limit: 1000 })
      expect(mockStorage.remove).toHaveBeenCalledWith([
        'user-1/test-skill/1.0.0.zip',
        'user-1/test-skill/1.1.0.zip',
      ])
    })

    it('没有文件时不应该调用删除', async () => {
      const mockStorage = {
        list: vi.fn().mockResolvedValue({ data: [], error: null }),
        remove: vi.fn(),
      }
      vi.mocked(supabase.storage.from).mockReturnValue(mockStorage as never)

      await skillStorageService.deleteSkillFiles('user-1', 'test-skill')

      expect(mockStorage.remove).not.toHaveBeenCalled()
    })

    it('list 返回 null 时不应该调用删除', async () => {
      const mockStorage = {
        list: vi.fn().mockResolvedValue({ data: null, error: null }),
        remove: vi.fn(),
      }
      vi.mocked(supabase.storage.from).mockReturnValue(mockStorage as never)

      await skillStorageService.deleteSkillFiles('user-1', 'test-skill')

      expect(mockStorage.remove).not.toHaveBeenCalled()
    })
  })
})
