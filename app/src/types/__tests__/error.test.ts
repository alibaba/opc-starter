import { describe, it, expect } from 'vitest'
import {
  AppError,
  ErrorCode,
  ErrorCategory,
  ErrorSeverity,
  ErrorFactory,
  isAppError,
  toAppError,
} from '../error'

describe('AppError', () => {
  it('should create an AppError with required fields', () => {
    const error = new AppError(ErrorCode.NETWORK_ERROR, '网络错误')

    expect(error).toBeInstanceOf(Error)
    expect(error).toBeInstanceOf(AppError)
    expect(error.name).toBe('AppError')
    expect(error.code).toBe(ErrorCode.NETWORK_ERROR)
    expect(error.message).toBe('网络错误')
  })

  it('should infer category from error code', () => {
    const networkError = new AppError(ErrorCode.NETWORK_ERROR, '网络错误')
    expect(networkError.category).toBe(ErrorCategory.NETWORK)

    const authError = new AppError(ErrorCode.AUTH_UNAUTHORIZED, '未授权')
    expect(authError.category).toBe(ErrorCategory.AUTH)

    const storageError = new AppError(ErrorCode.STORAGE_UPLOAD_FAILED, '上传失败')
    expect(storageError.category).toBe(ErrorCategory.STORAGE)
  })

  it('should infer severity from error code', () => {
    const criticalError = new AppError(ErrorCode.SYSTEM_INTERNAL_ERROR, '系统错误')
    expect(criticalError.severity).toBe(ErrorSeverity.CRITICAL)

    const highError = new AppError(ErrorCode.NETWORK_ERROR, '网络错误')
    expect(highError.severity).toBe(ErrorSeverity.HIGH)

    const mediumError = new AppError(ErrorCode.BUSINESS_NOT_FOUND, '未找到')
    expect(mediumError.severity).toBe(ErrorSeverity.MEDIUM)
  })

  it('should infer recoverability from error code', () => {
    const recoverableError = new AppError(ErrorCode.NETWORK_ERROR, '网络错误')
    expect(recoverableError.isRecoverable).toBe(true)

    const unrecoverableError = new AppError(ErrorCode.SYSTEM_INTERNAL_ERROR, '系统错误')
    expect(unrecoverableError.isRecoverable).toBe(false)
  })

  it('should accept custom options', () => {
    const error = new AppError(ErrorCode.NETWORK_ERROR, '网络错误', {
      category: ErrorCategory.SYSTEM,
      severity: ErrorSeverity.LOW,
      isRecoverable: false,
      metadata: { userId: '123' },
    })

    expect(error.category).toBe(ErrorCategory.SYSTEM)
    expect(error.severity).toBe(ErrorSeverity.LOW)
    expect(error.isRecoverable).toBe(false)
    expect(error.metadata?.userId).toBe('123')
  })

  it('should store original error', () => {
    const originalError = new Error('原始错误')
    const error = new AppError(ErrorCode.NETWORK_ERROR, '网络错误', {
      originalError,
    })

    expect(error.originalError).toBe(originalError)
  })

  it('should add timestamp to metadata', () => {
    const error = new AppError(ErrorCode.NETWORK_ERROR, '网络错误')
    expect(error.metadata?.timestamp).toBeInstanceOf(Date)
  })

  it('should convert to JSON', () => {
    const error = new AppError(ErrorCode.NETWORK_ERROR, '网络错误')
    const json = error.toJSON()

    expect(json).toHaveProperty('code', ErrorCode.NETWORK_ERROR)
    expect(json).toHaveProperty('message', '网络错误')
    expect(json).toHaveProperty('category', ErrorCategory.NETWORK)
    expect(json).toHaveProperty('severity')
    expect(json).toHaveProperty('isRecoverable')
    expect(json).not.toHaveProperty('originalError')
  })

  it('should convert to string', () => {
    const error = new AppError(ErrorCode.NETWORK_ERROR, '网络错误')
    expect(error.toString()).toBe('[NETWORK] NETWORK_ERROR: 网络错误')
  })
})

describe('ErrorFactory', () => {
  it('should create network error', () => {
    const error = ErrorFactory.network('网络超时')
    expect(error.code).toBe(ErrorCode.NETWORK_ERROR)
    expect(error.category).toBe(ErrorCategory.NETWORK)
    expect(error.isRecoverable).toBe(true)
  })

  it('should create network error with original error', () => {
    const original = new Error('timeout')
    const error = ErrorFactory.network('网络超时', original)
    expect(error.originalError).toBe(original)
  })

  it('should create network timeout error', () => {
    const error = ErrorFactory.networkTimeout()
    expect(error.code).toBe(ErrorCode.NETWORK_TIMEOUT)
    expect(error.message).toBe('网络请求超时')
    expect(error.isRecoverable).toBe(true)
  })

  it('should create network timeout error with custom message', () => {
    const error = ErrorFactory.networkTimeout('自定义超时')
    expect(error.message).toBe('自定义超时')
  })

  it('should create network offline error', () => {
    const error = ErrorFactory.networkOffline()
    expect(error.code).toBe(ErrorCode.NETWORK_OFFLINE)
    expect(error.message).toBe('网络连接已断开')
    expect(error.isRecoverable).toBe(true)
  })

  it('should create unauthorized error', () => {
    const error = ErrorFactory.unauthorized()
    expect(error.code).toBe(ErrorCode.AUTH_UNAUTHORIZED)
    expect(error.category).toBe(ErrorCategory.AUTH)
    expect(error.isRecoverable).toBe(false)
  })

  it('should create forbidden error', () => {
    const error = ErrorFactory.forbidden()
    expect(error.code).toBe(ErrorCode.AUTH_FORBIDDEN)
    expect(error.message).toBe('无权限访问')
    expect(error.isRecoverable).toBe(false)
  })

  it('should create session expired error', () => {
    const error = ErrorFactory.sessionExpired()
    expect(error.code).toBe(ErrorCode.AUTH_SESSION_EXPIRED)
    expect(error.message).toBe('会话已过期，请重新登录')
    expect(error.isRecoverable).toBe(false)
  })

  it('should create not found error with metadata', () => {
    const error = ErrorFactory.notFound('照片')
    expect(error.code).toBe(ErrorCode.BUSINESS_NOT_FOUND)
    expect(error.metadata?.resource).toBe('照片')
  })

  it('should create not found error with custom message', () => {
    const error = ErrorFactory.notFound('照片', '该照片已被删除')
    expect(error.message).toBe('该照片已被删除')
  })

  it('should create already exists error', () => {
    const error = ErrorFactory.alreadyExists('用户')
    expect(error.code).toBe(ErrorCode.BUSINESS_ALREADY_EXISTS)
    expect(error.message).toBe('用户已存在')
    expect(error.metadata?.resource).toBe('用户')
  })

  it('should create already exists error with custom message', () => {
    const error = ErrorFactory.alreadyExists('用户', '该邮箱已注册')
    expect(error.message).toBe('该邮箱已注册')
  })

  it('should create invalid operation error', () => {
    const error = ErrorFactory.invalidOperation('不能删除根组织')
    expect(error.code).toBe(ErrorCode.BUSINESS_INVALID_OPERATION)
    expect(error.message).toBe('不能删除根组织')
  })

  it('should create quota exceeded error', () => {
    const error = ErrorFactory.quotaExceeded()
    expect(error.code).toBe(ErrorCode.BUSINESS_QUOTA_EXCEEDED)
    expect(error.message).toBe('已超出配额限制')
  })

  it('should create upload failed error', () => {
    const error = ErrorFactory.uploadFailed('photo.jpg')
    expect(error.code).toBe(ErrorCode.STORAGE_UPLOAD_FAILED)
    expect(error.metadata?.fileName).toBe('photo.jpg')
    expect(error.isRecoverable).toBe(true)
  })

  it('should create upload failed error with custom message and original error', () => {
    const original = new Error('S3 error')
    const error = ErrorFactory.uploadFailed('photo.jpg', '上传超时', original)
    expect(error.message).toBe('上传超时')
    expect(error.originalError).toBe(original)
  })

  it('should create download failed error', () => {
    const error = ErrorFactory.downloadFailed('report.pdf')
    expect(error.code).toBe(ErrorCode.STORAGE_DOWNLOAD_FAILED)
    expect(error.metadata?.fileName).toBe('report.pdf')
    expect(error.message).toBe('文件 report.pdf 下载失败')
    expect(error.isRecoverable).toBe(true)
  })

  it('should create download failed error with custom message', () => {
    const original = new Error('Network error')
    const error = ErrorFactory.downloadFailed('report.pdf', '下载中断', original)
    expect(error.message).toBe('下载中断')
    expect(error.originalError).toBe(original)
  })

  it('should create storage quota exceeded error', () => {
    const error = ErrorFactory.storageQuotaExceeded()
    expect(error.code).toBe(ErrorCode.STORAGE_QUOTA_EXCEEDED)
    expect(error.severity).toBe(ErrorSeverity.CRITICAL)
    expect(error.isRecoverable).toBe(false)
  })

  it('should create validation error', () => {
    const error = ErrorFactory.validationError('email', '邮箱格式不正确')
    expect(error.code).toBe(ErrorCode.VALIDATION_INVALID_FORMAT)
    expect(error.severity).toBe(ErrorSeverity.LOW)
    expect(error.metadata?.field).toBe('email')
  })

  it('should create system error', () => {
    const original = new Error('Fatal')
    const error = ErrorFactory.systemError('系统崩溃', original)
    expect(error.code).toBe(ErrorCode.SYSTEM_INTERNAL_ERROR)
    expect(error.severity).toBe(ErrorSeverity.CRITICAL)
    expect(error.isRecoverable).toBe(false)
    expect(error.originalError).toBe(original)
  })

  it('should create unknown error', () => {
    const original = new Error('Unexpected')
    const error = ErrorFactory.unknown('未知异常', original)
    expect(error.code).toBe(ErrorCode.UNKNOWN_ERROR)
    expect(error.isRecoverable).toBe(false)
    expect(error.originalError).toBe(original)
  })
})

describe('AppError - additional category inference', () => {
  it('should infer BUSINESS category', () => {
    const error = new AppError(ErrorCode.BUSINESS_ALREADY_EXISTS, 'exists')
    expect(error.category).toBe(ErrorCategory.BUSINESS)
  })

  it('should infer VALIDATION category', () => {
    const error = new AppError(ErrorCode.VALIDATION_REQUIRED_FIELD, 'required')
    expect(error.category).toBe(ErrorCategory.VALIDATION)
  })

  it('should infer SYSTEM category', () => {
    const error = new AppError(ErrorCode.SYSTEM_SERVICE_UNAVAILABLE, 'unavailable')
    expect(error.category).toBe(ErrorCategory.SYSTEM)
  })

  it('should infer UNKNOWN category for unknown codes', () => {
    const error = new AppError(ErrorCode.UNKNOWN_ERROR, 'unknown')
    expect(error.category).toBe(ErrorCategory.UNKNOWN)
  })
})

describe('AppError - additional severity inference', () => {
  it('should infer LOW severity for unknown codes', () => {
    const error = new AppError(ErrorCode.NETWORK_OFFLINE, 'offline')
    expect(error.severity).toBe(ErrorSeverity.LOW)
  })

  it('should infer CRITICAL for AUTH_UNAUTHORIZED', () => {
    const error = new AppError(ErrorCode.AUTH_UNAUTHORIZED, '未授权')
    expect(error.severity).toBe(ErrorSeverity.CRITICAL)
  })

  it('should infer CRITICAL for STORAGE_QUOTA_EXCEEDED', () => {
    const error = new AppError(ErrorCode.STORAGE_QUOTA_EXCEEDED, '配额用尽')
    expect(error.severity).toBe(ErrorSeverity.CRITICAL)
  })

  it('should infer HIGH for AUTH_SESSION_EXPIRED', () => {
    const error = new AppError(ErrorCode.AUTH_SESSION_EXPIRED, '过期')
    expect(error.severity).toBe(ErrorSeverity.HIGH)
  })

  it('should infer HIGH for STORAGE_WRITE_ERROR', () => {
    const error = new AppError(ErrorCode.STORAGE_WRITE_ERROR, '写入错误')
    expect(error.severity).toBe(ErrorSeverity.HIGH)
  })

  it('should infer MEDIUM for VALIDATION_INVALID_FORMAT', () => {
    const error = new AppError(ErrorCode.VALIDATION_INVALID_FORMAT, '格式错误')
    expect(error.severity).toBe(ErrorSeverity.MEDIUM)
  })
})

describe('AppError - recoverability inference', () => {
  it('should be unrecoverable for AUTH_FORBIDDEN', () => {
    const error = new AppError(ErrorCode.AUTH_FORBIDDEN, '禁止')
    expect(error.isRecoverable).toBe(false)
  })

  it('should be unrecoverable for STORAGE_QUOTA_EXCEEDED', () => {
    const error = new AppError(ErrorCode.STORAGE_QUOTA_EXCEEDED, '配额')
    expect(error.isRecoverable).toBe(false)
  })

  it('should be recoverable for NETWORK_TIMEOUT', () => {
    const error = new AppError(ErrorCode.NETWORK_TIMEOUT, '超时')
    expect(error.isRecoverable).toBe(true)
  })

  it('should be recoverable for VALIDATION codes', () => {
    const error = new AppError(ErrorCode.VALIDATION_REQUIRED_FIELD, '必填')
    expect(error.isRecoverable).toBe(true)
  })
})

describe('isAppError', () => {
  it('should identify AppError instances', () => {
    const appError = new AppError(ErrorCode.NETWORK_ERROR, '网络错误')
    expect(isAppError(appError)).toBe(true)

    const normalError = new Error('普通错误')
    expect(isAppError(normalError)).toBe(false)

    expect(isAppError('string error')).toBe(false)
    expect(isAppError(null)).toBe(false)
    expect(isAppError(undefined)).toBe(false)
  })
})

describe('toAppError', () => {
  it('should return AppError as is', () => {
    const appError = new AppError(ErrorCode.NETWORK_ERROR, '网络错误')
    expect(toAppError(appError)).toBe(appError)
  })

  it('should convert Error to AppError', () => {
    const error = new Error('普通错误')
    const appError = toAppError(error)

    expect(appError).toBeInstanceOf(AppError)
    expect(appError.code).toBe(ErrorCode.UNKNOWN_ERROR)
    expect(appError.message).toBe('普通错误')
    expect(appError.originalError).toBe(error)
  })

  it('should convert string to AppError', () => {
    const appError = toAppError('错误消息')

    expect(appError).toBeInstanceOf(AppError)
    expect(appError.code).toBe(ErrorCode.UNKNOWN_ERROR)
    expect(appError.message).toBe('错误消息')
  })

  it('should convert unknown values to AppError', () => {
    const appError = toAppError({ foo: 'bar' })

    expect(appError).toBeInstanceOf(AppError)
    expect(appError.code).toBe(ErrorCode.UNKNOWN_ERROR)
    expect(appError.message).toBe('未知错误')
  })
})
