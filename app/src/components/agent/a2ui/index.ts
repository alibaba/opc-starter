/**
 * A2UI 组件导出
 * @description A2UI 协议的前端实现
 * @version 2.0.0 - 移除 Photo 相关组件
 */

// 核心组件
export { A2UIRenderer, A2UIRendererSafe } from './A2UIRenderer'
export { A2UISurface, A2UISurfacePlaceholder } from './A2UISurface'
export { A2UIPortalContainer } from './A2UIPortalContainer'

// 注册表
export {
  componentRegistry,
  isValidComponentType,
  getComponent,
  registerComponent,
  getRegisteredTypes,
} from './registry'

// 工具函数
export {
  getByPath,
  setByPath,
  deleteByPath,
  resolveBindings,
  wrapActions,
  deepMerge,
  generateId,
} from './utils'

// 校验器
export {
  validateComponent,
  validateComponentTree,
  sanitizeProps,
  SecurityError,
} from './validators'

// 类型
export type { A2UIRendererProps } from './A2UIRenderer'
export type { A2UISurfaceProps } from './A2UISurface'

// 业务组件
export { ActionButtons } from './components/ActionButtons'

// 布局组件
export { A2UIContainer } from './components/A2UIContainer'
export { A2UIList } from './components/A2UIList'
export { A2UIText } from './components/A2UIText'
export { A2UIImage } from './components/A2UIImage'

// 业务组件类型
export type { ActionButtonsProps, ActionButtonItem } from './components/ActionButtons'
