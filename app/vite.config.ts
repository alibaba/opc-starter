import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // 根据 mode 加载对应的环境变量文件
  // mode: 'development' → .env.development
  // mode: 'test' → .env.test
  // mode: 'production' → .env.production
  const env = loadEnv(mode, process.cwd(), '')

  return {
    plugins: [react()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    server: {
      proxy: {
        '/supabase-proxy': {
          target: env.VITE_SUPABASE_URL,
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/supabase-proxy/, ''),
          configure: (proxy) => {
            proxy.on('error', (err) => {
              console.log('proxy error', err)
            })
            proxy.on('proxyReq', (_proxyReq, req) => {
              console.log('Sending Request to the Target:', req.method, req.url)
            })
            proxy.on('proxyRes', (proxyRes, req) => {
              console.log('Received Response from the Target:', proxyRes.statusCode, req.url)
            })
          },
        },
      },
    },
    // 定义全局常量，可在代码中使用
    // 安全: 测试凭证仅在开发/测试模式注入，生产构建不包含
    define: {
      'import.meta.env.VITE_USE_MOCK_AUTH': JSON.stringify(env.VITE_USE_MOCK_AUTH),
      ...(mode !== 'production' && {
        'import.meta.env.TEST_USER_EMAIL': JSON.stringify(env.TEST_USER_EMAIL),
        'import.meta.env.TEST_USER_PWD': JSON.stringify(env.TEST_USER_PWD),
      }),
    },
    build: {
      // 打包优化配置
      rollupOptions: {
        output: {
          // 手动配置 chunk 拆分策略
          manualChunks: {
            // React 核心库单独打包
            'react-vendor': ['react', 'react-dom', 'react-router-dom'],
            // UI 组件库单独打包
            'ui-vendor': [
              '@radix-ui/react-dialog',
              '@radix-ui/react-progress',
              '@radix-ui/react-slot',
            ],
            // 状态管理和 HTTP 库
            'store-vendor': ['zustand', 'axios'],
            // 工具库
            'utils-vendor': ['date-fns', 'idb', 'lucide-react'],
            // 注意: msw 和 @faker-js/faker 已移至 devDependencies，不参与生产构建
          },
        },
      },
      // 设置 chunk 大小警告阈值
      chunkSizeWarningLimit: 600,
      // 启用 CSS 代码分割
      cssCodeSplit: true,
      // 生成 sourcemap（可选，生产环境可关闭）
      sourcemap: false,
      // 压缩配置
      minify: 'terser',
    },
    // 优化依赖预构建
    optimizeDeps: {
      include: ['react', 'react-dom', 'react-router-dom', 'zustand', 'date-fns', 'lucide-react'],
    },
  }
})
