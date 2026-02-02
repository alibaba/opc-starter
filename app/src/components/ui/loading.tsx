/**
 * 全局加载动画组件
 * 用于页面切换时的 Suspense fallback
 */
export function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center space-y-4">
        {/* 旋转加载器 */}
        <div className="relative w-16 h-16 mx-auto">
          <div className="absolute inset-0 border-4 border-muted rounded-full" />
          <div className="absolute inset-0 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
        
        {/* 加载文本 */}
        <p className="text-sm text-muted-foreground">加载中...</p>
      </div>
    </div>
  );
}

/**
 * 内联加载动画（小尺寸）
 */
export function InlineSpinner({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const sizeClasses = {
    sm: 'w-4 h-4 border-2',
    md: 'w-6 h-6 border-2',
    lg: 'w-8 h-8 border-4',
  };

  return (
    <div className={`relative ${sizeClasses[size]}`}>
      <div className="absolute inset-0 border-muted rounded-full" />
      <div className="absolute inset-0 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  );
}
