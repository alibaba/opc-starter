/**
 * A2UI 工具函数
 * @description 数据绑定解析、路径操作等工具
 * @version 1.0.0
 */

import type { BoundValue, A2UIDataModel } from '@/types/a2ui';
import { isBoundValue } from '@/types/a2ui';

/**
 * 根据路径从对象中获取值
 * @param obj 数据对象
 * @param path 点分隔的路径，如 "photos.0.url"
 * @returns 路径对应的值，如果不存在返回 undefined
 */
export function getByPath(
  obj: Record<string, unknown>,
  path: string
): unknown {
  const segments = path.split('.');
  let current: unknown = obj;

  for (const segment of segments) {
    if (current === null || current === undefined) {
      return undefined;
    }

    if (typeof current === 'object') {
      current = (current as Record<string, unknown>)[segment];
    } else {
      return undefined;
    }
  }

  return current;
}

/**
 * 根据路径设置对象中的值
 * @param obj 数据对象
 * @param path 点分隔的路径
 * @param value 要设置的值
 */
export function setByPath(
  obj: Record<string, unknown>,
  path: string,
  value: unknown
): void {
  const segments = path.split('.');
  let current: Record<string, unknown> = obj;

  for (let i = 0; i < segments.length - 1; i++) {
    const segment = segments[i];
    if (!(segment in current) || typeof current[segment] !== 'object') {
      // 判断下一个 segment 是否是数字索引
      const nextSegment = segments[i + 1];
      current[segment] = /^\d+$/.test(nextSegment) ? [] : {};
    }
    current = current[segment] as Record<string, unknown>;
  }

  current[segments[segments.length - 1]] = value;
}

/**
 * 删除对象中指定路径的值
 * @param obj 数据对象
 * @param path 点分隔的路径
 */
export function deleteByPath(
  obj: Record<string, unknown>,
  path: string
): void {
  const segments = path.split('.');
  let current: Record<string, unknown> = obj;

  for (let i = 0; i < segments.length - 1; i++) {
    const segment = segments[i];
    if (!(segment in current)) {
      return; // 路径不存在，无需删除
    }
    current = current[segment] as Record<string, unknown>;
  }

  delete current[segments[segments.length - 1]];
}

/**
 * 解析组件 props 中的绑定值
 * @param props 组件 props
 * @param dataModel 数据模型
 * @returns 解析后的 props
 */
export function resolveBindings(
  props: Record<string, unknown | BoundValue> | undefined,
  dataModel: A2UIDataModel
): Record<string, unknown> {
  if (!props) return {};

  const resolved: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(props)) {
    if (isBoundValue(value)) {
      // 解析绑定
      resolved[key] = getByPath(dataModel, value.binding);
    } else {
      resolved[key] = value;
    }
  }

  return resolved;
}

/**
 * 创建事件处理器包装函数
 * @param actions 组件定义的 actions 映射
 * @param onAction 用户操作回调
 * @param componentId 组件 ID
 * @returns 包装后的事件处理器对象
 */
export function wrapActions(
  actions: Record<string, string> | undefined,
  onAction: (componentId: string, actionId: string, value?: unknown) => void,
  componentId: string
): Record<string, (value?: unknown) => void> {
  if (!actions) return {};

  const handlers: Record<string, (value?: unknown) => void> = {};

  for (const [eventName, actionId] of Object.entries(actions)) {
    // 转换事件名称：click → onClick, change → onChange
    // 如果已经有 on 前缀（如 onClick），则保持原样，避免变成 onOnClick
    const handlerName = eventName.startsWith('on')
      ? eventName
      : `on${eventName.charAt(0).toUpperCase()}${eventName.slice(1)}`;
    handlers[handlerName] = (value?: unknown) => {
      onAction(componentId, actionId, value);
    };
  }

  return handlers;
}

/**
 * 深度合并两个对象
 */
export function deepMerge<T extends Record<string, unknown>>(
  target: T,
  source: Partial<T>
): T {
  const result = { ...target };

  for (const key in source) {
    if (Object.prototype.hasOwnProperty.call(source, key)) {
      const sourceValue = source[key];
      const targetValue = result[key];

      if (
        typeof sourceValue === 'object' &&
        sourceValue !== null &&
        !Array.isArray(sourceValue) &&
        typeof targetValue === 'object' &&
        targetValue !== null &&
        !Array.isArray(targetValue)
      ) {
        result[key] = deepMerge(
          targetValue as Record<string, unknown>,
          sourceValue as Record<string, unknown>
        ) as T[Extract<keyof T, string>];
      } else {
        result[key] = sourceValue as T[Extract<keyof T, string>];
      }
    }
  }

  return result;
}

/**
 * 生成唯一 ID
 */
export function generateId(prefix = 'a2ui'): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}
