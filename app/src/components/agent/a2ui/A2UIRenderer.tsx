/**
 * A2UI Renderer 核心渲染器
 * @description 将 A2UI JSON 组件树递归渲染为 React 组件
 * @version 1.0.0
 */

import React, { useMemo } from 'react'
import type { A2UIComponent, A2UIDataModel } from '@/types/a2ui'
import { isValidComponentType, getComponent } from './registry'
import { resolveBindings, wrapActions } from './utils'
import { validateComponent, SecurityError, sanitizeProps } from './validators'

/**
 * 未知组件警告
 */
interface UnknownComponentWarningProps {
  type: string
  id: string
}

const UnknownComponentWarning: React.FC<UnknownComponentWarningProps> = ({ type, id }) => {
  return (
    <div className="rounded-md border border-yellow-500/50 bg-yellow-50 p-3 text-sm text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-200">
      <div className="flex items-center gap-2">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 20 20"
          fill="currentColor"
          className="h-5 w-5"
        >
          <path
            fillRule="evenodd"
            d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z"
            clipRule="evenodd"
          />
        </svg>
        <span>
          未知组件类型: <code className="font-mono">{type}</code> (ID: {id})
        </span>
      </div>
    </div>
  )
}

/**
 * 安全错误组件
 */
interface SecurityErrorDisplayProps {
  error: SecurityError
}

const SecurityErrorDisplay: React.FC<SecurityErrorDisplayProps> = ({ error }) => {
  return (
    <div className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
      <div className="flex items-center gap-2">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 20 20"
          fill="currentColor"
          className="h-5 w-5"
        >
          <path
            fillRule="evenodd"
            d="M10 1a4.5 4.5 0 00-4.5 4.5V9H5a2 2 0 00-2 2v6a2 2 0 002 2h10a2 2 0 002-2v-6a2 2 0 00-2-2h-.5V5.5A4.5 4.5 0 0010 1zm3 8V5.5a3 3 0 10-6 0V9h6z"
            clipRule="evenodd"
          />
        </svg>
        <span>安全校验失败: {error.message}</span>
      </div>
    </div>
  )
}

/**
 * A2UIRenderer Props
 */
export interface A2UIRendererProps {
  /** 要渲染的组件定义 */
  component: A2UIComponent
  /** 数据模型 */
  dataModel: A2UIDataModel
  /** 用户操作回调 */
  onAction: (componentId: string, actionId: string, value?: unknown) => void
  /** 是否严格模式（发现错误立即停止渲染） */
  strictMode?: boolean
}

/**
 * A2UI Renderer 组件
 */
export const A2UIRenderer: React.FC<A2UIRendererProps> = ({
  component,
  dataModel,
  onAction,
  strictMode = false,
}) => {
  // 严格模式：进行完整的安全校验（包括子组件）
  // 非严格模式：只对当前组件的 props 进行校验，子组件各自处理
  // 注意：useMemo 必须在条件判断之前调用，保证 Hook 调用顺序一致
  const securityError = useMemo(() => {
    // 防御性检查：如果 component 未定义，返回 null
    if (!component) {
      return null
    }
    if (!strictMode) {
      // 非严格模式：只校验当前组件的 props，不递归校验子组件
      // 依赖 sanitizeProps 进行安全过滤
      return null
    }
    try {
      validateComponent(component)
      return null
    } catch (error) {
      if (error instanceof SecurityError) {
        return error
      }
      throw error
    }
  }, [component, strictMode])

  // 防御性检查：如果 component 未定义，返回 null
  if (!component) {
    console.warn('[A2UI] A2UIRenderer 收到 undefined component')
    return null
  }

  // 严格模式下显示安全错误
  if (securityError && strictMode) {
    console.error('[A2UI] 安全校验失败:', securityError)
    return <SecurityErrorDisplay error={securityError} />
  }

  // 检查组件类型
  if (!isValidComponentType(component.type)) {
    console.warn(`[A2UI] 未知组件类型: ${component.type}`)
    return <UnknownComponentWarning type={component.type} id={component.id} />
  }

  // 获取组件
  const Component = getComponent(component.type)
  if (!Component) {
    return <UnknownComponentWarning type={component.type} id={component.id} />
  }

  // 解析 props 绑定
  const rawProps = resolveBindings(component.props, dataModel)

  // 安全过滤 props（非严格模式始终过滤）
  const resolvedProps = strictMode ? rawProps : sanitizeProps(rawProps, component.type)

  // 包装事件处理器
  const eventHandlers = wrapActions(component.actions, onAction, component.id)

  // 递归渲染子组件
  const children = component.children?.map((child) => (
    <A2UIRenderer
      key={child.id}
      component={child}
      dataModel={dataModel}
      onAction={onAction}
      strictMode={strictMode}
    />
  ))

  // 渲染
  return (
    <Component {...resolvedProps} {...eventHandlers}>
      {children}
    </Component>
  )
}

/**
 * A2UIRenderer with Error Boundary
 */
interface A2UIRendererWithBoundaryProps extends A2UIRendererProps {
  /** 错误发生时的回调 */
  onError?: (error: Error) => void
}

interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
}

class A2UIErrorBoundary extends React.Component<
  { children: React.ReactNode; onError?: (error: Error) => void },
  ErrorBoundaryState
> {
  constructor(props: { children: React.ReactNode; onError?: (error: Error) => void }) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error) {
    console.error('[A2UI] 渲染错误:', error)
    this.props.onError?.(error)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="rounded-md border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
          <div className="flex items-center gap-2">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
              className="h-5 w-5"
            >
              <path
                fillRule="evenodd"
                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-5a.75.75 0 01.75.75v4.5a.75.75 0 01-1.5 0v-4.5A.75.75 0 0110 5zm0 10a1 1 0 100-2 1 1 0 000 2z"
                clipRule="evenodd"
              />
            </svg>
            <span>组件渲染失败</span>
          </div>
          {this.state.error && (
            <pre className="mt-2 overflow-auto text-xs">{this.state.error.message}</pre>
          )}
        </div>
      )
    }

    return this.props.children
  }
}

export const A2UIRendererSafe: React.FC<A2UIRendererWithBoundaryProps> = ({
  onError,
  ...props
}) => {
  return (
    <A2UIErrorBoundary onError={onError}>
      <A2UIRenderer {...props} />
    </A2UIErrorBoundary>
  )
}
