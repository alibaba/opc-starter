/**
 * Tooltip 组件
 * 简单的提示框组件
 */

import React, { useState } from 'react';
import { cn } from '@/lib/utils';

export interface TooltipProviderProps {
  children: React.ReactNode;
  delayDuration?: number;
}

export interface TooltipProps {
  children: React.ReactNode;
}

export interface TooltipTriggerProps {
  asChild?: boolean;
  children: React.ReactNode;
  className?: string;
}

export interface TooltipContentProps {
  children: React.ReactNode;
  className?: string;
  side?: 'top' | 'right' | 'bottom' | 'left';
}

const TooltipContext = React.createContext<{
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
}>({
  isOpen: false,
  setIsOpen: () => {},
});

export function TooltipProvider({ children }: TooltipProviderProps) {
  // delayDuration 暂不实现，仅用于 API 兼容
  return <>{children}</>;
}

export function Tooltip({ children }: TooltipProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <TooltipContext.Provider value={{ isOpen, setIsOpen }}>
      <div className="relative inline-block">{children}</div>
    </TooltipContext.Provider>
  );
}

export function TooltipTrigger({ asChild, children, className }: TooltipTriggerProps) {
  const { setIsOpen } = React.useContext(TooltipContext);

  const handleMouseEnter = () => setIsOpen(true);
  const handleMouseLeave = () => setIsOpen(false);

  if (asChild && React.isValidElement(children)) {
    return React.cloneElement(children, {
      onMouseEnter: handleMouseEnter,
      onMouseLeave: handleMouseLeave,
    } as React.HTMLAttributes<HTMLElement>);
  }

  return (
    <div className={className} onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave}>
      {children}
    </div>
  );
}

export function TooltipContent({ children, className, side = 'top' }: TooltipContentProps) {
  const { isOpen } = React.useContext(TooltipContext);

  if (!isOpen) return null;

  // 根据 side 设置位置
  const positionClasses = {
    top: 'bottom-full left-1/2 -translate-x-1/2 -translate-y-2',
    right: 'left-full top-1/2 -translate-y-1/2 translate-x-2',
    bottom: 'top-full left-1/2 -translate-x-1/2 translate-y-2',
    left: 'right-full top-1/2 -translate-y-1/2 -translate-x-2',
  };

  const arrowClasses = {
    top: 'absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-gray-900',
    right: 'absolute right-full top-1/2 -translate-y-1/2 -mr-1 border-4 border-transparent border-r-gray-900',
    bottom: 'absolute bottom-full left-1/2 -translate-x-1/2 -mb-1 border-4 border-transparent border-b-gray-900',
    left: 'absolute left-full top-1/2 -translate-y-1/2 -ml-1 border-4 border-transparent border-l-gray-900',
  };

  return (
    <div
      className={cn(
        'absolute z-50 px-3 py-2 text-sm text-white bg-slate-900 rounded-md shadow-lg',
        positionClasses[side],
        'whitespace-nowrap',
        'animate-in fade-in-0 zoom-in-95',
        className
      )}
    >
      {children}
      <div className={arrowClasses[side]} />
    </div>
  );
}

