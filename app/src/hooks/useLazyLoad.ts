import { useEffect, useRef, useState } from 'react';

/**
 * 图片懒加载 Hook
 * 使用 Intersection Observer API 实现懒加载功能
 * 
 * @param options - IntersectionObserver 配置选项
 * @returns { ref, isVisible } - 元素引用和可见状态
 */
export function useLazyLoad<T extends HTMLElement>(
  options?: IntersectionObserverInit
) {
  const [isVisible, setIsVisible] = useState(false);
  const elementRef = useRef<T>(null);

  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    // 默认配置：根元素为视口，提前 200px 开始加载
    const defaultOptions: IntersectionObserverInit = {
      root: null,
      rootMargin: '200px',
      threshold: 0.01,
      ...options,
    };

    // 创建 Intersection Observer 实例
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          // 一旦可见就停止观察，避免重复触发
          observer.unobserve(entry.target);
        }
      });
    }, defaultOptions);

    observer.observe(element);

    // 清理函数
    return () => {
      if (element) {
        observer.unobserve(element);
      }
    };
  }, [options]);

  return { ref: elementRef, isVisible };
}

/**
 * 图片懒加载 Hook（简化版）
 * 专门用于图片元素的懒加载
 * 
 * @param imageSrc - 图片源地址
 * @param placeholder - 占位图地址
 * @returns { ref, src, isLoaded } - 元素引用、当前图片源和加载状态
 */
export function useLazyImage(
  imageSrc: string,
  placeholder?: string
) {
  const { ref, isVisible } = useLazyLoad<HTMLImageElement>();
  const [src, setSrc] = useState(placeholder || '');
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    if (isVisible && imageSrc) {
      // 预加载图片
      const img = new Image();
      img.src = imageSrc;
      img.onload = () => {
        setSrc(imageSrc);
        setIsLoaded(true);
      };
      img.onerror = () => {
        // 加载失败时使用占位图
        setSrc(placeholder || '');
        setIsLoaded(false);
      };
    }
  }, [isVisible, imageSrc, placeholder]);

  return { ref, src, isLoaded };
}
