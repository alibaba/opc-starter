/**
 * A2UI 组件导出
 * @description A2UI 协议的前端实现
 * @version 1.0.0
 */

// 核心组件
export { A2UIRenderer, A2UIRendererSafe } from './A2UIRenderer';
export { A2UISurface, A2UISurfacePlaceholder } from './A2UISurface';
export { A2UIPortalContainer } from './A2UIPortalContainer';

// 注册表
export {
  componentRegistry,
  isValidComponentType,
  getComponent,
  registerComponent,
  getRegisteredTypes,
} from './registry';

// 工具函数
export {
  getByPath,
  setByPath,
  deleteByPath,
  resolveBindings,
  wrapActions,
  deepMerge,
  generateId,
} from './utils';

// 校验器
export {
  validateComponent,
  validateComponentTree,
  sanitizeProps,
  SecurityError,
} from './validators';

// 类型
export type { A2UIRendererProps } from './A2UIRenderer';
export type { A2UISurfaceProps } from './A2UISurface';

// 业务组件
export { PhotoPreview } from './components/PhotoPreview';
export { PhotoGrid } from './components/PhotoGrid';
export { FilterSelector } from './components/FilterSelector';
export { AIProgressCard } from './components/AIProgressCard';
export { PhotoCompare } from './components/PhotoCompare';
export { ActionButtons } from './components/ActionButtons';
export { FusionProgressRenderer } from './components/FusionProgressRenderer';
export { PhotoEditorPreview } from './components/PhotoEditorPreview';

// 布局组件
export { A2UIContainer } from './components/A2UIContainer';
export { A2UIList } from './components/A2UIList';
export { A2UIText } from './components/A2UIText';
export { A2UIImage } from './components/A2UIImage';

// 业务组件类型
export type { PhotoPreviewProps } from './components/PhotoPreview';
export type { PhotoGridProps, PhotoGridItem } from './components/PhotoGrid';
export type { FilterSelectorProps, FilterOption } from './components/FilterSelector';
export type { AIProgressCardProps } from './components/AIProgressCard';
export type { PhotoCompareProps } from './components/PhotoCompare';
export type { ActionButtonsProps, ActionButtonItem } from './components/ActionButtons';
export type { FusionProgressRendererProps } from './components/FusionProgressRenderer';
export type {
  PhotoEditorPreviewProps,
  CompareConfig,
} from './components/PhotoEditorPreview';