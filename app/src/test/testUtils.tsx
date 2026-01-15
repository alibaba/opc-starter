/* eslint-disable react-refresh/only-export-components */
/**
 * 测试工具函数
 * 提供通用的测试辅助功能
 */
import type { ReactNode } from 'react'
import { render } from '@testing-library/react'
import type { RenderOptions } from '@testing-library/react'
import { BrowserRouter, MemoryRouter } from 'react-router-dom'

/**
 * 包装组件以支持路由测试
 */
interface WrapperProps {
  children: ReactNode
}

export function RouterWrapper({ children }: WrapperProps) {
  return <BrowserRouter>{children}</BrowserRouter>
}

/**
 * 使用 MemoryRouter 包装组件（支持初始路由）
 */
export function createMemoryRouterWrapper(initialEntries: string[] = ['/']) {
  return function MemoryRouterWrapper({ children }: WrapperProps) {
    return <MemoryRouter initialEntries={initialEntries}>{children}</MemoryRouter>
  }
}

/**
 * 自定义 render 函数，自动包装路由
 */
export function renderWithRouter(ui: React.ReactElement, options?: Omit<RenderOptions, 'wrapper'>) {
  return render(ui, { wrapper: RouterWrapper, ...options })
}

/**
 * Mock Photo 数据工厂
 */
export function createMockPhoto(
  overrides: Partial<{
    id: string
    title: string
    url: string
    thumbnail: string
    base64: string
    oss_url: string
    cloudUrl: string
    created_at: string
    updated_at: string
  }> = {}
) {
  return {
    id: `photo-${Math.random().toString(36).substr(2, 9)}`,
    title: 'Test Photo',
    url: 'https://example.com/photo.jpg',
    thumbnail: 'https://example.com/thumb.jpg',
    base64: '',
    oss_url: '',
    cloudUrl: '',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  }
}

/**
 * Mock Person 数据工厂
 */
export function createMockPerson(
  overrides: Partial<{
    id: string
    name: string
    photoCount: number
  }> = {}
) {
  return {
    id: `person-${Math.random().toString(36).substr(2, 9)}`,
    name: 'Test Person',
    photoCount: 0,
    ...overrides,
  }
}

/**
 * Mock Album 数据工厂
 */
export function createMockAlbum(
  overrides: Partial<{
    id: string
    title: string
    description: string
    type: 'manual' | 'auto'
    visibility: 'private' | 'organization' | 'public'
    photoIds: string[]
    coverPhoto: string
    coverPhotoUrl: string
    created_at: string
    updated_at: string
  }> = {}
) {
  return {
    id: `album-${Math.random().toString(36).substr(2, 9)}`,
    title: 'Test Album',
    description: 'Test Description',
    type: 'manual' as const,
    visibility: 'private' as const,
    photoIds: [],
    coverPhoto: '',
    coverPhotoUrl: '',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  }
}
