/**
 * A2UI Container 布局组件
 * @description 通用容器组件，支持 flex 和 grid 布局
 */

import React from 'react';
import { cn } from '@/lib/utils';

export interface A2UIContainerProps {
  /** 布局方向 */
  direction?: 'row' | 'column';
  /** 对齐方式 */
  align?: 'start' | 'center' | 'end' | 'stretch';
  /** 主轴对齐 */
  justify?: 'start' | 'center' | 'end' | 'between' | 'around';
  /** 间距 */
  gap?: 'none' | 'sm' | 'md' | 'lg';
  /** 内边距 */
  padding?: 'none' | 'sm' | 'md' | 'lg';
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

const paddingMap = {
  none: 'p-0',
  sm: 'p-2',
  md: 'p-4',
  lg: 'p-6',
};

const alignMap = {
  start: 'items-start',
  center: 'items-center',
  end: 'items-end',
  stretch: 'items-stretch',
};

const justifyMap = {
  start: 'justify-start',
  center: 'justify-center',
  end: 'justify-end',
  between: 'justify-between',
  around: 'justify-around',
};

export const A2UIContainer: React.FC<A2UIContainerProps> = ({
  direction = 'column',
  align = 'stretch',
  justify = 'start',
  gap = 'md',
  padding = 'none',
  className,
  children,
}) => {
  return (
    <div
      className={cn(
        'flex',
        direction === 'row' ? 'flex-row' : 'flex-col',
        alignMap[align],
        justifyMap[justify],
        gapMap[gap],
        paddingMap[padding],
        className
      )}
    >
      {children}
    </div>
  );
};
