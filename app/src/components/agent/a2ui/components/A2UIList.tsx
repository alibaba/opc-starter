/**
 * A2UI List 列表组件
 * @description 用于渲染列表数据
 */

import React from 'react';
import { cn } from '@/lib/utils';

export interface A2UIListProps {
  /** 列表方向 */
  direction?: 'horizontal' | 'vertical';
  /** 间距 */
  gap?: 'none' | 'sm' | 'md' | 'lg';
  /** 自定义类名 */
  className?: string;
  /** 子元素 */
  children?: React.ReactNode;
}

const gapMap = {
  none: 'gap-0',
  sm: 'gap-2',
  md: 'gap-4',
  lg: 'gap-6',
};

export const A2UIList: React.FC<A2UIListProps> = ({
  direction = 'vertical',
  gap = 'md',
  className,
  children,
}) => {
  return (
    <div
      className={cn(
        'flex',
        direction === 'horizontal' ? 'flex-row flex-wrap' : 'flex-col',
        gapMap[gap],
        className
      )}
    >
      {children}
    </div>
  );
};
