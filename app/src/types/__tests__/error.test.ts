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

  it('should create unauthorized error', () => {
    const error = ErrorFactory.unauthorized()
    expect(error.code).toBe(ErrorCode.AUTH_UNAUTHORIZED)
    expect(error.category).toBe(ErrorCategory.AUTH)
    expect(error.isRecoverable).toBe(false)
  })

  it('should create not found error with metadata', () => {
    const error = ErrorFactory.notFound('照片')
    expect(error.code).toBe(ErrorCode.BUSINESS_NOT_FOUND)
    expect(error.metadata?.resource).toBe('照片')
  })

  it('should create upload failed error', () => {
    const error = ErrorFactory.uploadFailed('photo.jpg')
    expect(error.code).toBe(ErrorCode.STORAGE_UPLOAD_FAILED)
    expect(error.metadata?.fileName).toBe('photo.jpg')
    expect(error.isRecoverable).toBe(true)
  })

  it('should create validation error', () => {
    const error = ErrorFactory.validationError('email', '邮箱格式不正确')
    expect(error.code).toBe(ErrorCode.VALIDATION_INVALID_FORMAT)
    expect(error.severity).toBe(ErrorSeverity.LOW)
    expect(error.metadata?.field).toBe('email')
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
