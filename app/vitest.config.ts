import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    // 排除 Playwright E2E 测试和其他测试框架
    exclude: [
      'node_modules',
      'dist',
      'tests/e2e/**',
      'tests/support/**',
      'cypress/**',
      '**/*.spec.ts',
      '**/*.spec.js',
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      exclude: [
        'node_modules/',
        'src/test/',
        'src/mocks/',
        '**/*.d.ts',
        '**/*.config.*',
        '**/mockData',
        'dist/',
        'cypress/',
        'public/',
      ],
      include: ['src/**/*.{ts,tsx}'],
      thresholds: {
        lines: 25,
        functions: 25,
        branches: 18,
        statements: 25,
      },
    },
  },
})
