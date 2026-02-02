/**
 * A2UI Button 包装组件
 * @description 包装 shadcn Button，支持 AI 返回的 text prop 转换为 children
 * @version 1.0.0
 */

import React from 'react';
import { Button, type ButtonProps } from '@/components/ui/button';

export interface A2UIButtonProps extends Omit<ButtonProps, 'children'> {
  /** 按钮文本（AI 返回格式） */
  text?: string;
  /** 子元素 */
  children?: React.ReactNode;
}

/**
 * A2UI Button 组件
 * 支持通过 text prop 设置按钮文本，兼容 AI 返回的格式
 */
export const A2UIButton: React.FC<A2UIButtonProps> = ({
  text,
  children,
  ...props
}) => {
  return (
    <Button {...props}>
      {text ?? children}
    </Button>
  );
};

export default A2UIButton;
