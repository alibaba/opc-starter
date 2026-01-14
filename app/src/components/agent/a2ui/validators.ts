/**
 * A2UI 安全校验器
 * @description 校验组件 props 安全性，防止 XSS 攻击
 * @version 1.0.0
 */

import type { A2UIComponent } from '@/types/a2ui';

/**
 * 危险 props 列表
 * 这些 props 不允许通过 A2UI 协议传递
 */
const DANGEROUS_PROPS = [
  // DOM 事件处理器（应通过 actions 统一管理）
  'onClick',
  'onMouseDown',
  'onMouseUp',
  'onKeyDown',
  'onKeyUp',
  'onKeyPress',
  'onFocus',
  'onBlur',
  'onSubmit',
  'onChange',
  'onInput',
  'onError',
  'onLoad',

  // 危险 HTML 属性
  'dangerouslySetInnerHTML',
  'innerHTML',

  // 脚本相关
  'href', // 可能包含 javascript: 协议
  'src', // 仅允许特定组件
  'action', // form action
  'formAction',

  // 样式注入
  'style', // 使用 className 代替
] as const;

/**
 * 允许使用 src/href 的组件类型白名单
 */
const URL_PROPS_WHITELIST: Record<string, string[]> = {
  image: ['src'],
  'photo-preview': ['src'],
  'photo-grid': ['items'], // items 数组中的 src
  'photo-editor-preview': ['src'], // 编辑预览组件
  'photo-edit-confirm': ['src'], // 编辑确认组件
  'video-preview': ['src'], // 视频预览组件
};

/**
 * 安全校验错误
 */
export class SecurityError extends Error {
  readonly componentId: string;
  readonly prop: string;

  constructor(message: string, componentId: string, prop: string) {
    super(message);
    this.name = 'SecurityError';
    this.componentId = componentId;
    this.prop = prop;
  }
}

/**
 * 校验组件 props 安全性
 * @throws SecurityError 如果检测到危险 props
 */
export function validateComponent(component: A2UIComponent): void {
  const { id, type, props, children } = component;

  if (props) {
    for (const [key, value] of Object.entries(props)) {
      // 检查危险 props
      if (DANGEROUS_PROPS.includes(key as (typeof DANGEROUS_PROPS)[number])) {
        // 检查是否在白名单中
        const whitelist = URL_PROPS_WHITELIST[type];
        if (!whitelist || !whitelist.includes(key)) {
          throw new SecurityError(`禁止使用危险属性: ${key}`, id, key);
        }
      }

      // 检查函数类型 props（防止注入）
      if (typeof value === 'function') {
        throw new SecurityError(`禁止传递函数类型属性: ${key}`, id, key);
      }

      // 检查 javascript: 协议
      if (typeof value === 'string') {
        if (value.toLowerCase().trim().startsWith('javascript:')) {
          throw new SecurityError(`检测到危险 URL 协议: ${key}`, id, key);
        }
        if (value.toLowerCase().trim().startsWith('data:text/html')) {
          throw new SecurityError(`检测到危险 Data URL: ${key}`, id, key);
        }
      }
    }
  }

  // 递归校验子组件
  if (children) {
    for (const child of children) {
      validateComponent(child);
    }
  }
}

/**
 * 校验组件树（不抛出异常，返回错误列表）
 */
export function validateComponentTree(
  component: A2UIComponent
): SecurityError[] {
  const errors: SecurityError[] = [];

  function validate(comp: A2UIComponent) {
    try {
      validateComponent(comp);
    } catch (error) {
      if (error instanceof SecurityError) {
        errors.push(error);
      }
    }

    // 继续检查子组件
    if (comp.children) {
      for (const child of comp.children) {
        validate(child);
      }
    }
  }

  validate(component);
  return errors;
}

/**
 * 过滤危险 props（安全降级处理）
 */
export function sanitizeProps(
  props: Record<string, unknown>,
  componentType: string
): Record<string, unknown> {
  const sanitized: Record<string, unknown> = {};
  const whitelist = URL_PROPS_WHITELIST[componentType] || [];

  for (const [key, value] of Object.entries(props)) {
    // 跳过危险 props
    if (DANGEROUS_PROPS.includes(key as (typeof DANGEROUS_PROPS)[number])) {
      if (!whitelist.includes(key)) {
        console.warn(`[A2UI] 已过滤危险属性: ${key}`);
        continue;
      }
    }

    // 跳过函数类型
    if (typeof value === 'function') {
      console.warn(`[A2UI] 已过滤函数属性: ${key}`);
      continue;
    }

    // 过滤危险 URL
    if (typeof value === 'string') {
      const trimmed = value.toLowerCase().trim();
      if (
        trimmed.startsWith('javascript:') ||
        trimmed.startsWith('data:text/html')
      ) {
        console.warn(`[A2UI] 已过滤危险 URL: ${key}`);
        continue;
      }
    }

    sanitized[key] = value;
  }

  return sanitized;
}
