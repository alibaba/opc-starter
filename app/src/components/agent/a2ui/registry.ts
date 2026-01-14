/**
 * A2UI 组件注册表 - OPC-Starter
 * @description 管理可渲染的 A2UI 组件映射
 * @version 1.0.0
 */

import React from 'react';

// ===== 基础 UI 组件 =====
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';

// A2UI 包装的基础组件（支持 AI 返回的 props 格式）
import { A2UIButton } from './components/A2UIButton';

// ===== A2UI 布局组件 =====
import { A2UIContainer } from './components/A2UIContainer';
import { A2UIList } from './components/A2UIList';
import { A2UIText } from './components/A2UIText';
import { A2UIImage } from './components/A2UIImage';

// ===== A2UI 业务组件 =====
import { ActionButtons } from './components/ActionButtons';

import type { A2UIComponentType } from '@/types/a2ui';

/**
 * 组件 Props 类型映射
 */
export type ComponentPropsMap = {
  // 基础组件
  card: React.ComponentProps<typeof Card>;
  'card-header': React.ComponentProps<typeof CardHeader>;
  'card-content': React.ComponentProps<typeof CardContent>;
  'card-title': React.ComponentProps<typeof CardTitle>;
  'card-description': React.ComponentProps<typeof CardDescription>;
  'card-footer': React.ComponentProps<typeof CardFooter>;
  button: React.ComponentProps<typeof A2UIButton>;
  slider: React.ComponentProps<typeof Slider>;
  input: React.ComponentProps<typeof Input>;
  progress: React.ComponentProps<typeof Progress>;
  badge: React.ComponentProps<typeof Badge>;

  // 布局组件
  container: React.ComponentProps<typeof A2UIContainer>;
  list: React.ComponentProps<typeof A2UIList>;
  text: React.ComponentProps<typeof A2UIText>;
  image: React.ComponentProps<typeof A2UIImage>;

  // 业务组件
  'action-buttons': React.ComponentProps<typeof ActionButtons>;
};

/**
 * 组件注册表
 * 键为 A2UI 组件类型，值为对应的 React 组件
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const componentRegistry: Record<string, React.ComponentType<any>> = {
  // ===== 基础组件 =====
  card: Card,
  'card-header': CardHeader,
  'card-content': CardContent,
  'card-title': CardTitle,
  'card-description': CardDescription,
  'card-footer': CardFooter,
  button: A2UIButton,
  slider: Slider,
  input: Input,
  progress: Progress,
  badge: Badge,

  // ===== 布局组件 =====
  container: A2UIContainer,
  list: A2UIList,
  text: A2UIText,
  image: A2UIImage,

  // ===== 业务组件 =====
  'action-buttons': ActionButtons,
};

/**
 * 检查组件类型是否有效
 */
export function isValidComponentType(type: string): type is A2UIComponentType {
  return type in componentRegistry;
}

/**
 * 获取组件
 */
export function getComponent(
  type: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): React.ComponentType<any> | undefined {
  return componentRegistry[type];
}

/**
 * 注册自定义组件（扩展点）
 */
export function registerComponent(
  type: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  component: React.ComponentType<any>
): void {
  if (componentRegistry[type]) {
    console.warn(`[A2UI Registry] 覆盖已存在的组件类型: ${type}`);
  }
  componentRegistry[type] = component;
}

/**
 * 获取所有已注册的组件类型
 */
export function getRegisteredTypes(): string[] {
  return Object.keys(componentRegistry);
}
