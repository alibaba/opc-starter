/**
 * A2UI (AI-to-UI) 协议类型定义
 * @version 0.9
 * @description AI 驱动的动态 UI 渲染协议
 * @see docs/epic-23-a2ui/protocol.md
 */

// ============ 渲染目标 (STORY-23-012) ============

/**
 * 渲染目标类型
 * @description 控制 A2UI 组件在界面中的渲染位置
 * @story STORY-23-012
 */
export type A2UIRenderTarget =
  | 'inline' // 默认：在对话消息内渲染
  | 'main-area' // 主内容区：覆盖当前页面内容
  | 'fullscreen' // 全屏模态：覆盖整个视口
  | 'split'; // 分屏：主内容区 + 对话框联动

/**
 * Portal 配置
 * @description 控制 Portal 的外观和行为
 * @story STORY-23-012
 */
export interface A2UIPortalConfig {
  /** 是否显示关闭按钮 */
  showClose?: boolean;
  /** 是否显示最小化按钮 */
  showMinimize?: boolean;
  /** 背景模式 */
  backdrop?: 'blur' | 'dim' | 'none';
  /** 退出时触发的 action */
  onClose?: string;
  /** Portal 标题 */
  title?: string;
}

// ============ 组件定义 ============

/**
 * 数据绑定值，用于组件 props 中的动态绑定
 * @example { binding: "photos.0.url" }
 */
export interface BoundValue {
  binding: string; // "path.to.value"
}

/**
 * A2UI 组件定义
 * @description 描述一个可渲染的 UI 组件及其属性、事件和子组件
 */
export interface A2UIComponent {
  /** 组件唯一标识符 */
  id: string;
  /** 组件类型 */
  type: string;
  /** 组件属性，值可以是静态值或 BoundValue */
  props?: Record<string, unknown | BoundValue>;
  /** 事件映射：eventName → actionId */
  actions?: Record<string, string>;
  /** 子组件列表 */
  children?: A2UIComponent[];
  /** 渲染目标位置 @story STORY-23-012 */
  renderTarget?: A2UIRenderTarget;
  /** Portal 配置 @story STORY-23-012 */
  portalConfig?: A2UIPortalConfig;
}

/**
 * A2UI 数据模型
 * @description 用于组件数据绑定的状态对象
 */
export type A2UIDataModel = Record<string, unknown>;

// ============ 服务端消息 ============

/**
 * 开始渲染消息
 * @description 创建一个新的 Surface 并渲染初始组件
 */
export interface BeginRenderingMessage {
  type: 'beginRendering';
  /** Surface 唯一标识符 */
  surfaceId: string;
  /** 要渲染的组件树 */
  component: A2UIComponent;
  /** 可选的初始数据模型 */
  dataModel?: A2UIDataModel;
}

/**
 * Surface 更新消息
 * @description 替换 Surface 的组件树
 */
export interface SurfaceUpdateMessage {
  type: 'surfaceUpdate';
  surfaceId: string;
  component: A2UIComponent;
}

/**
 * 数据模型更新消息
 * @description 对 Surface 的数据模型进行增量更新
 */
export interface DataModelUpdateMessage {
  type: 'dataModelUpdate';
  surfaceId: string;
  /** JSON Path 格式的路径 */
  path: string;
  /** 操作类型 */
  op: 'replace' | 'add' | 'remove';
  /** 新值（remove 操作时可为 undefined） */
  value?: unknown;
}

/**
 * 删除 Surface 消息
 * @description 从渲染树中移除一个 Surface
 */
export interface DeleteSurfaceMessage {
  type: 'deleteSurface';
  surfaceId: string;
}

/**
 * 服务端消息联合类型
 */
export type A2UIServerMessage =
  | BeginRenderingMessage
  | SurfaceUpdateMessage
  | DataModelUpdateMessage
  | DeleteSurfaceMessage;

// ============ 客户端消息 ============

/**
 * 用户操作消息
 * @description 用户在组件上触发的操作
 */
export interface UserActionMessage {
  type: 'userAction';
  /** 目标 Surface ID */
  surfaceId: string;
  /** 触发操作的组件 ID */
  componentId: string;
  /** 操作标识符 */
  actionId: string;
  /** 可选的操作携带值 */
  value?: unknown;
}

/**
 * 错误消息
 * @description 客户端向服务端报告的错误
 */
export interface A2UIErrorMessage {
  type: 'error';
  surfaceId: string;
  errorType: string;
  message: string;
}

/**
 * 客户端消息联合类型
 */
export type A2UIClientMessage = UserActionMessage | A2UIErrorMessage;

// ============ 组件类型枚举 ============

/**
 * 内置组件类型
 * @description 系统提供的标准组件类型
 */
export type A2UIComponentType =
  // 基础组件
  | 'card'
  | 'card-header'
  | 'card-content'
  | 'card-title'
  | 'card-description'
  | 'card-footer'
  | 'button'
  | 'slider'
  | 'input'
  | 'progress'
  | 'badge'
  | 'image'
  | 'text'
  | 'container'
  | 'list'
  // 业务组件
  | 'photo-preview'
  | 'photo-grid'
  | 'photo-editor-preview'  // STORY-23-010: 编辑预览组件
  | 'photo-edit-confirm'    // STORY-23-010: 编辑确认组件（预览 + 保存按钮）
  | 'filter-selector'
  | 'ai-progress'
  | 'photo-compare'
  | 'action-buttons'
  | 'fusion-progress'
  // 视频组件 (STORY-23-009)
  | 'video-preview'
  | 'video-task-progress'
  // 引导组件
  | 'selection-guide';

// ============ 辅助类型 ============

/**
 * 判断值是否为 BoundValue
 */
export function isBoundValue(value: unknown): value is BoundValue {
  return (
    typeof value === 'object' &&
    value !== null &&
    'binding' in value &&
    typeof (value as BoundValue).binding === 'string'
  );
}

/**
 * Surface 状态
 * @description 单个 Surface 的完整状态
 */
export interface SurfaceState {
  id: string;
  component: A2UIComponent;
  dataModel: A2UIDataModel;
}
