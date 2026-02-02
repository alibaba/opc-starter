import type { ReactNode } from 'react'
import React, { Component } from 'react'
import { AlertTriangle, RefreshCw, WifiOff, ShieldAlert, Database } from 'lucide-react'
import { Button } from './button'
import { isAppError, ErrorCategory, ErrorSeverity } from '@/types/error'

interface Props {
  children: ReactNode
  fallback?: ReactNode
  onReset?: () => void
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void
}

interface State {
  hasError: boolean
  error: Error | null
  errorInfo: React.ErrorInfo | null
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    }
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return {
      hasError: true,
      error,
    }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo)

    if (isAppError(error)) {
      console.error('AppError details:', {
        code: error.code,
        category: error.category,
        severity: error.severity,
        metadata: error.metadata,
      })
    }

    this.setState({
      error,
      errorInfo,
    })

    this.props.onError?.(error, errorInfo)
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    })
    this.props.onReset?.()
  }

  getErrorIcon(category: ErrorCategory) {
    switch (category) {
      case ErrorCategory.NETWORK:
        return <WifiOff className="w-8 h-8 text-destructive" />
      case ErrorCategory.AUTH:
        return <ShieldAlert className="w-8 h-8 text-destructive" />
      case ErrorCategory.STORAGE:
        return <Database className="w-8 h-8 text-destructive" />
      default:
        return <AlertTriangle className="w-8 h-8 text-destructive" />
    }
  }

  getErrorTitle(error: Error | null): string {
    if (isAppError(error)) {
      switch (error.category) {
        case ErrorCategory.NETWORK:
          return '网络连接错误'
        case ErrorCategory.AUTH:
          return '身份验证失败'
        case ErrorCategory.STORAGE:
          return '存储错误'
        case ErrorCategory.BUSINESS:
          return '操作失败'
        case ErrorCategory.VALIDATION:
          return '数据验证失败'
        default:
          return '糟糕，出错了'
      }
    }
    return '糟糕，出错了'
  }

  getErrorMessage(error: Error | null): string {
    if (isAppError(error)) {
      return error.message
    }
    return '应用程序遇到了一个意外错误，我们已经记录了这个问题。'
  }

  shouldShowRetry(error: Error | null): boolean {
    if (isAppError(error)) {
      return error.isRecoverable
    }
    return true
  }

  getErrorSeverityColor(error: Error | null): string {
    if (isAppError(error)) {
      switch (error.severity) {
        case ErrorSeverity.CRITICAL:
          return 'bg-destructive/20'
        case ErrorSeverity.HIGH:
          return 'bg-warning/20'
        case ErrorSeverity.MEDIUM:
          return 'bg-warning/10'
        case ErrorSeverity.LOW:
          return 'bg-primary/10'
      }
    }
    return 'bg-destructive/20'
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      return (
        <div className="min-h-screen flex items-center justify-center bg-background px-4">
          <div className="max-w-md w-full bg-card rounded-lg shadow-lg p-8 border">
            <div className="flex flex-col items-center text-center">
              <div
                className={`w-16 h-16 ${this.getErrorSeverityColor(this.state.error)} rounded-full flex items-center justify-center mb-4`}
              >
                {isAppError(this.state.error) ? (
                  this.getErrorIcon(this.state.error.category)
                ) : (
                  <AlertTriangle className="w-8 h-8 text-destructive" />
                )}
              </div>
              <h1 className="text-2xl font-bold text-foreground mb-2">
                {this.getErrorTitle(this.state.error)}
              </h1>
              <p className="text-muted-foreground mb-6">{this.getErrorMessage(this.state.error)}</p>

              {isAppError(this.state.error) && this.state.error.code && (
                <div className="w-full mb-4 p-3 bg-muted rounded-lg">
                  <div className="text-xs text-muted-foreground mb-1">错误代码</div>
                  <div className="text-sm font-mono text-foreground">{this.state.error.code}</div>
                </div>
              )}

              {import.meta.env.DEV && this.state.error && (
                <div className="w-full mb-6 p-4 bg-muted rounded-lg text-left">
                  <div className="text-sm font-semibold text-foreground mb-2">错误详情：</div>
                  <pre className="text-xs text-destructive overflow-auto max-h-40">
                    {this.state.error.toString()}
                    {this.state.errorInfo && (
                      <>
                        {'\n\n'}
                        {this.state.errorInfo.componentStack}
                      </>
                    )}
                  </pre>
                </div>
              )}

              <div className="flex gap-3">
                {this.shouldShowRetry(this.state.error) && (
                  <Button onClick={this.handleReset} className="flex items-center gap-2">
                    <RefreshCw className="w-4 h-4" />
                    重新加载
                  </Button>
                )}
                <Button variant="outline" onClick={() => (window.location.href = '/')}>
                  返回首页
                </Button>
              </div>
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

// 功能级错误边界（更轻量的错误提示）
interface FeatureErrorBoundaryProps {
  children: ReactNode
  featureName?: string
  onReset?: () => void
}

export class FeatureErrorBoundary extends Component<FeatureErrorBoundaryProps, State> {
  constructor(props: FeatureErrorBoundaryProps) {
    super(props)
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    }
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return {
      hasError: true,
      error,
    }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('FeatureErrorBoundary caught an error:', error, errorInfo)
    this.setState({
      error,
      errorInfo,
    })
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    })
    this.props.onReset?.()
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-6">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="font-semibold text-destructive mb-1">
                {this.props.featureName || '此功能'}暂时不可用
              </h3>
              <p className="text-sm text-destructive/80 mb-3">
                {this.state.error?.message || '发生了一个错误'}
              </p>
              <Button
                size="sm"
                variant="outline"
                onClick={this.handleReset}
                className="border-destructive/30 text-destructive hover:bg-destructive/10"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                重试
              </Button>
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

// React Hook 版本的错误边界（使用高阶组件）
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  errorBoundaryProps?: Omit<Props, 'children'>
) {
  const WrappedComponent = (props: P) => (
    <ErrorBoundary {...errorBoundaryProps}>
      <Component {...props} />
    </ErrorBoundary>
  )

  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`

  return WrappedComponent
}
