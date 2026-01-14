import { useState, useCallback, useEffect } from 'react';

interface UseInfiniteScrollOptions {
  threshold?: number; // 触发加载的距离阈值（像素）
  enabled?: boolean; // 是否启用无限滚动
}

interface UseInfiniteScrollResult {
  hasMore: boolean;
  isLoading: boolean;
  loadMore: () => void;
  setHasMore: (hasMore: boolean) => void;
  setIsLoading: (loading: boolean) => void;
}

/**
 * 无限滚动Hook
 */
export function useInfiniteScroll(
  fetchMore: () => Promise<void>,
  options: UseInfiniteScrollOptions = {}
): UseInfiniteScrollResult {
  const { threshold = 300, enabled = true } = options;
  const [hasMore, setHasMore] = useState(true);
  const [isLoading, setIsLoading] = useState(false);

  /**
   * 加载更多数据
   */
  const loadMore = useCallback(async () => {
    if (isLoading || !hasMore || !enabled) {
      return;
    }

    setIsLoading(true);
    try {
      await fetchMore();
    } catch (error) {
      console.error('加载更多数据失败:', error);
    } finally {
      setIsLoading(false);
    }
  }, [isLoading, hasMore, enabled, fetchMore]);

  /**
   * 监听滚动事件
   */
  useEffect(() => {
    if (!enabled) {
      return;
    }

    const handleScroll = () => {
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
      const scrollHeight = document.documentElement.scrollHeight;
      const clientHeight = window.innerHeight;

      // 判断是否滚动到底部附近
      if (scrollHeight - scrollTop - clientHeight < threshold) {
        loadMore();
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [enabled, threshold, loadMore]);

  return {
    hasMore,
    isLoading,
    loadMore,
    setHasMore,
    setIsLoading,
  };
}
