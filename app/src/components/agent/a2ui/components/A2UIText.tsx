/**
 * A2UI Text 文本组件
 * @description 用于显示各种样式的文本
 */

import React from 'react';
import { cn } from '@/lib/utils';

export interface A2UITextProps {
  /** 文本内容（推荐） */
  content?: string;
  /** 文本内容（兼容 AI 返回格式） */
  text?: string;
  /** 文本变体 */
  variant?: 'body' | 'heading' | 'caption' | 'label';
  /** 文本大小 */
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  /** 文本颜色 */
  color?: 'default' | 'muted' | 'primary' | 'success' | 'warning' | 'error';
  /** 是否加粗 */
  bold?: boolean;
  /** 自定义类名 */
  className?: string;
  /** 子元素 */
  children?: React.ReactNode;
}

const sizeMap = {
  xs: 'text-xs',
  sm: 'text-sm',
  md: 'text-base',
  lg: 'text-lg',
  xl: 'text-xl',
};

const colorMap = {
  default: 'text-foreground',
  muted: 'text-muted-foreground',
  primary: 'text-primary',
  success: 'text-green-600 dark:text-green-400',
  warning: 'text-yellow-600 dark:text-yellow-400',
  error: 'text-destructive',
};

const variantMap = {
  body: '',
  heading: 'font-semibold tracking-tight',
  caption: 'text-muted-foreground',
  label: 'font-medium',
};

export const A2UIText: React.FC<A2UITextProps> = ({
  content,
  text,
  variant = 'body',
  size = 'md',
  color = 'default',
  bold = false,
  className,
  children,
}) => {
  const Tag = variant === 'heading' ? 'h3' : 'p';
  // 兼容 AI 返回的 text prop，优先使用 content
  const textContent = content ?? text;

  return (
    <Tag
      className={cn(
        sizeMap[size],
        colorMap[color],
        variantMap[variant],
        bold && 'font-bold',
        className
      )}
    >
      {textContent ?? children}
    </Tag>
  );
};
