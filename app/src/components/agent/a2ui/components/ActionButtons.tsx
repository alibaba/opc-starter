/**
 * A2UI ActionButtons 操作按钮组组件
 * @description 用于显示一组操作按钮
 */

import React from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

export interface ActionButtonItem {
  id: string;
  label: string;
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  disabled?: boolean;
  loading?: boolean;
  icon?: React.ReactNode;
}

export interface ActionButtonsProps {
  /** 按钮列表 */
  buttons: ActionButtonItem[];
  /** 布局方向 */
  direction?: 'row' | 'column';
  /** 对齐方式 */
  align?: 'start' | 'center' | 'end' | 'stretch';
  /** 间距 */
  gap?: 'sm' | 'md' | 'lg';
  /** 按钮点击回调 */
  onButtonClick?: (buttonId: string) => void;
  /** 自定义类名 */
  className?: string;
}

const gapMap = {
  sm: 'gap-2',
  md: 'gap-3',
  lg: 'gap-4',
};

const alignMap = {
  start: 'justify-start',
  center: 'justify-center',
  end: 'justify-end',
  stretch: '',
};

export const ActionButtons: React.FC<ActionButtonsProps> = ({
  buttons,
  direction = 'row',
  align = 'end',
  gap = 'md',
  onButtonClick,
  className,
}) => {
  return (
    <div
      className={cn(
        'flex',
        direction === 'column' ? 'flex-col' : 'flex-row flex-wrap',
        gapMap[gap],
        alignMap[align],
        direction === 'column' && align === 'stretch' && '[&>*]:w-full',
        className
      )}
    >
      {buttons.map((button) => (
        <Button
          key={button.id}
          variant={button.variant}
          size={button.size}
          disabled={button.disabled || button.loading}
          onClick={() => onButtonClick?.(button.id)}
          className={cn(button.loading && 'cursor-wait')}
        >
          {button.loading ? (
            <svg
              className="mr-2 h-4 w-4 animate-spin"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
          ) : (
            button.icon
          )}
          {button.label}
        </Button>
      ))}
    </div>
  );
};
