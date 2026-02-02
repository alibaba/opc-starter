/**
 * A2UI Image 图片组件
 * @description 用于显示图片，支持懒加载和占位符
 */

import React, { useState } from 'react';
import { cn } from '@/lib/utils';

export interface A2UIImageProps {
  /** 图片地址 */
  src: string;
  /** 替代文本 */
  alt?: string;
  /** 宽度 */
  width?: number | string;
  /** 高度 */
  height?: number | string;
  /** 图片适应方式 */
  fit?: 'cover' | 'contain' | 'fill' | 'none';
  /** 圆角 */
  rounded?: 'none' | 'sm' | 'md' | 'lg' | 'full';
  /** 自定义类名 */
  className?: string;
}

const fitMap = {
  cover: 'object-cover',
  contain: 'object-contain',
  fill: 'object-fill',
  none: 'object-none',
};

const roundedMap = {
  none: 'rounded-none',
  sm: 'rounded-sm',
  md: 'rounded-md',
  lg: 'rounded-lg',
  full: 'rounded-full',
};

export const A2UIImage: React.FC<A2UIImageProps> = ({
  src,
  alt = '',
  width,
  height,
  fit = 'cover',
  rounded = 'md',
  className,
}) => {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  if (hasError) {
    return (
      <div
        className={cn(
          'flex items-center justify-center bg-muted text-muted-foreground',
          roundedMap[rounded],
          className
        )}
        style={{ width, height }}
      >
        <span className="text-sm">图片加载失败</span>
      </div>
    );
  }

  return (
    <div className={cn('relative overflow-hidden', roundedMap[rounded], className)}>
      {isLoading && (
        <div
          className="absolute inset-0 animate-pulse bg-muted"
          style={{ width, height }}
        />
      )}
      <img
        src={src}
        alt={alt}
        width={width}
        height={height}
        className={cn(
          fitMap[fit],
          roundedMap[rounded],
          isLoading && 'opacity-0',
          'transition-opacity duration-300'
        )}
        onLoad={() => setIsLoading(false)}
        onError={() => {
          setIsLoading(false);
          setHasError(true);
        }}
      />
    </div>
  );
};
