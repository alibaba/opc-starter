/**
 * 统一错误类型和错误码定义
 * 用于规范化应用中的错误处理
 */

/**
 * 错误类别常量
 */
export const ErrorCategory = {
  NETWORK: 'NETWORK',
  BUSINESS: 'BUSINESS',
  SYSTEM: 'SYSTEM',
  AUTH: 'AUTH',
  VALIDATION: 'VALIDATION',
  STORAGE: 'STORAGE',
  UNKNOWN: 'UNKNOWN',
} as const
export type ErrorCategory = (typeof ErrorCategory)[keyof typeof ErrorCategory]

/**
 * 错误码常量
 */
export const ErrorCode = {
  NETWORK_ERROR: 'NETWORK_ERROR',
  NETWORK_TIMEOUT: 'NETWORK_TIMEOUT',
  NETWORK_OFFLINE: 'NETWORK_OFFLINE',

  AUTH_UNAUTHORIZED: 'AUTH_UNAUTHORIZED',
  AUTH_FORBIDDEN: 'AUTH_FORBIDDEN',
  AUTH_SESSION_EXPIRED: 'AUTH_SESSION_EXPIRED',
  AUTH_INVALID_CREDENTIALS: 'AUTH_INVALID_CREDENTIALS',

  BUSINESS_NOT_FOUND: 'BUSINESS_NOT_FOUND',
  BUSINESS_ALREADY_EXISTS: 'BUSINESS_ALREADY_EXISTS',
  BUSINESS_INVALID_OPERATION: 'BUSINESS_INVALID_OPERATION',
  BUSINESS_QUOTA_EXCEEDED: 'BUSINESS_QUOTA_EXCEEDED',

  VALIDATION_REQUIRED_FIELD: 'VALIDATION_REQUIRED_FIELD',
  VALIDATION_INVALID_FORMAT: 'VALIDATION_INVALID_FORMAT',
  VALIDATION_OUT_OF_RANGE: 'VALIDATION_OUT_OF_RANGE',

  STORAGE_QUOTA_EXCEEDED: 'STORAGE_QUOTA_EXCEEDED',
  STORAGE_READ_ERROR: 'STORAGE_READ_ERROR',
  STORAGE_WRITE_ERROR: 'STORAGE_WRITE_ERROR',
  STORAGE_UPLOAD_FAILED: 'STORAGE_UPLOAD_FAILED',
  STORAGE_DOWNLOAD_FAILED: 'STORAGE_DOWNLOAD_FAILED',

  SYSTEM_INTERNAL_ERROR: 'SYSTEM_INTERNAL_ERROR',
  SYSTEM_SERVICE_UNAVAILABLE: 'SYSTEM_SERVICE_UNAVAILABLE',

  UNKNOWN_ERROR: 'UNKNOWN_ERROR',
} as const
export type ErrorCode = (typeof ErrorCode)[keyof typeof ErrorCode]

/**
 * 错误严重级别常量
 */
export const ErrorSeverity = {
  LOW: 'LOW',
  MEDIUM: 'MEDIUM',
  HIGH: 'HIGH',
  CRITICAL: 'CRITICAL',
} as const
export type ErrorSeverity = (typeof ErrorSeverity)[keyof typeof ErrorSeverity]

/**
 * 错误元数据接口
 */
export interface ErrorMetadata {
  timestamp?: Date
  userId?: string
  url?: string
  componentStack?: string
  [key: string]: unknown
}

/**
 * 应用错误接口
 */
export interface IAppError {
  code: ErrorCode
  message: string
  category: ErrorCategory
  severity: ErrorSeverity
  metadata?: ErrorMetadata
  originalError?: Error
  isRecoverable: boolean
}

/**
 * 统一应用错误类
 */
export class AppError extends Error implements IAppError {
  public readonly code: ErrorCode
  public readonly category: ErrorCategory
  public readonly severity: ErrorSeverity
  public readonly metadata?: ErrorMetadata
  public readonly originalError?: Error
  public readonly isRecoverable: boolean

  constructor(
    code: ErrorCode,
    message: string,
    options?: {
      category?: ErrorCategory
      severity?: ErrorSeverity
      metadata?: ErrorMetadata
      originalError?: Error
      isRecoverable?: boolean
    }
  ) {
    super(message)
    this.name = 'AppError'
    this.code = code
    this.message = message
    this.category = options?.category || this.inferCategory(code)
    this.severity = options?.severity || this.inferSeverity(code)
    this.metadata = {
      ...options?.metadata,
      timestamp: new Date(),
    }
    this.originalError = options?.originalError
    this.isRecoverable = options?.isRecoverable ?? this.inferRecoverability(code)

    // V8 引擎特有的堆栈捕获 API
    const ErrorConstructor = Error as typeof Error & {
      captureStackTrace?: (
        targetObject: object,
        constructorOpt?: new (...args: unknown[]) => unknown
      ) => void
    }
    if (ErrorConstructor.captureStackTrace) {
      ErrorConstructor.captureStackTrace(this, AppError)
    }
  }

  private inferCategory(code: ErrorCode): ErrorCategory {
    if (code.startsWith('NETWORK_')) return ErrorCategory.NETWORK
    if (code.startsWith('AUTH_')) return ErrorCategory.AUTH
    if (code.startsWith('BUSINESS_')) return ErrorCategory.BUSINESS
    if (code.startsWith('VALIDATION_')) return ErrorCategory.VALIDATION
    if (code.startsWith('STORAGE_')) return ErrorCategory.STORAGE
    if (code.startsWith('SYSTEM_')) return ErrorCategory.SYSTEM
    return ErrorCategory.UNKNOWN
  }

  private inferSeverity(code: ErrorCode): ErrorSeverity {
    const criticalCodes: ErrorCode[] = [
      ErrorCode.SYSTEM_INTERNAL_ERROR,
      ErrorCode.AUTH_UNAUTHORIZED,
      ErrorCode.STORAGE_QUOTA_EXCEEDED,
    ]
    const highCodes: ErrorCode[] = [
      ErrorCode.NETWORK_ERROR,
      ErrorCode.AUTH_SESSION_EXPIRED,
      ErrorCode.STORAGE_WRITE_ERROR,
    ]
    const mediumCodes: ErrorCode[] = [
      ErrorCode.BUSINESS_NOT_FOUND,
      ErrorCode.VALIDATION_INVALID_FORMAT,
    ]

    if (criticalCodes.includes(code)) return ErrorSeverity.CRITICAL
    if (highCodes.includes(code)) return ErrorSeverity.HIGH
    if (mediumCodes.includes(code)) return ErrorSeverity.MEDIUM
    return ErrorSeverity.LOW
  }

  private inferRecoverability(code: ErrorCode): boolean {
    const unrecoverableCodes: ErrorCode[] = [
      ErrorCode.SYSTEM_INTERNAL_ERROR,
      ErrorCode.AUTH_FORBIDDEN,
      ErrorCode.STORAGE_QUOTA_EXCEEDED,
    ]
    return !unrecoverableCodes.includes(code)
  }

  toJSON(): IAppError {
    return {
      code: this.code,
      message: this.message,
      category: this.category,
      severity: this.severity,
      metadata: this.metadata,
      isRecoverable: this.isRecoverable,
    }
  }

  toString(): string {
    return `[${this.category}] ${this.code}: ${this.message}`
  }
}

/**
 * 错误工厂函数
 */
export const ErrorFactory = {
  network: (message: string, originalError?: Error) =>
    new AppError(ErrorCode.NETWORK_ERROR, message, {
      originalError,
      isRecoverable: true,
    }),

  networkTimeout: (message = '网络请求超时') =>
    new AppError(ErrorCode.NETWORK_TIMEOUT, message, {
      isRecoverable: true,
    }),

  networkOffline: (message = '网络连接已断开') =>
    new AppError(ErrorCode.NETWORK_OFFLINE, message, {
      isRecoverable: true,
    }),

  unauthorized: (message = '未授权，请重新登录') =>
    new AppError(ErrorCode.AUTH_UNAUTHORIZED, message, {
      isRecoverable: false,
    }),

  forbidden: (message = '无权限访问') =>
    new AppError(ErrorCode.AUTH_FORBIDDEN, message, {
      isRecoverable: false,
    }),

  sessionExpired: (message = '会话已过期，请重新登录') =>
    new AppError(ErrorCode.AUTH_SESSION_EXPIRED, message, {
      isRecoverable: false,
    }),

  notFound: (resource: string, message?: string) =>
    new AppError(ErrorCode.BUSINESS_NOT_FOUND, message || `${resource}不存在`, {
      metadata: { resource },
      isRecoverable: false,
    }),

  alreadyExists: (resource: string, message?: string) =>
    new AppError(ErrorCode.BUSINESS_ALREADY_EXISTS, message || `${resource}已存在`, {
      metadata: { resource },
      isRecoverable: false,
    }),

  invalidOperation: (message: string) =>
    new AppError(ErrorCode.BUSINESS_INVALID_OPERATION, message, {
      isRecoverable: false,
    }),

  quotaExceeded: (message = '已超出配额限制') =>
    new AppError(ErrorCode.BUSINESS_QUOTA_EXCEEDED, message, {
      isRecoverable: false,
    }),

  validationError: (field: string, message: string) =>
    new AppError(ErrorCode.VALIDATION_INVALID_FORMAT, message, {
      metadata: { field },
      severity: ErrorSeverity.LOW,
      isRecoverable: true,
    }),

  storageQuotaExceeded: (message = '存储空间已满') =>
    new AppError(ErrorCode.STORAGE_QUOTA_EXCEEDED, message, {
      severity: ErrorSeverity.CRITICAL,
      isRecoverable: false,
    }),

  uploadFailed: (fileName: string, message?: string, originalError?: Error) =>
    new AppError(ErrorCode.STORAGE_UPLOAD_FAILED, message || `文件 ${fileName} 上传失败`, {
      metadata: { fileName },
      originalError,
      isRecoverable: true,
    }),

  downloadFailed: (fileName: string, message?: string, originalError?: Error) =>
    new AppError(ErrorCode.STORAGE_DOWNLOAD_FAILED, message || `文件 ${fileName} 下载失败`, {
      metadata: { fileName },
      originalError,
      isRecoverable: true,
    }),

  systemError: (message: string, originalError?: Error) =>
    new AppError(ErrorCode.SYSTEM_INTERNAL_ERROR, message, {
      severity: ErrorSeverity.CRITICAL,
      originalError,
      isRecoverable: false,
    }),

  unknown: (message: string, originalError?: Error) =>
    new AppError(ErrorCode.UNKNOWN_ERROR, message, {
      originalError,
      isRecoverable: false,
    }),
}

/**
 * 错误类型守卫
 */
export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError
}

/**
 * 将未知错误转换为 AppError
 */
export function toAppError(error: unknown): AppError {
  if (isAppError(error)) {
    return error
  }

  if (error instanceof Error) {
    return ErrorFactory.unknown(error.message, error)
  }

  if (typeof error === 'string') {
    return ErrorFactory.unknown(error)
  }

  return ErrorFactory.unknown('未知错误')
}
