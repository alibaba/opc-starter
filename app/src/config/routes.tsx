/**
 * 应用路由配置与 AppRouter 组件
 */
import { lazy, Suspense } from 'react'
import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import { MainLayout } from '@/components/layout/MainLayout'
import { LoadingSpinner } from '@/components/ui/loading'
import { ProtectedRoute } from '@/auth/components/ProtectedRoute'

// 路由级别的代码分割：使用 React.lazy 动态导入页面组件
const PersonsPage = lazy(() => import('@/pages/PersonsPage'))
const ProfilePage = lazy(() => import('@/pages/ProfilePage'))
const SettingsPage = lazy(() => import('@/pages/SettingsPage'))
const CloudStorageSettingsPage = lazy(() => import('@/pages/CloudStorageSettingsPage'))

// 认证页面
const LoginPage = lazy(() => import('@/auth/pages/LoginPage'))
const RegisterPage = lazy(() => import('@/auth/pages/RegisterPage'))

// Skills Hub 页面
// 注意：HomePage 已替换为 SkillsSquarePage，HomePage 代码保留但暂不挂载
// const HomePage = lazy(() => import('@/pages/skills/HomePage').then(m => ({ default: m.HomePage })))
const SkillsSquarePage = lazy(() =>
  import('@/pages/skills/SkillsSquarePage').then((m) => ({ default: m.SkillsSquarePage }))
)
const SearchPage = lazy(() =>
  import('@/pages/skills/SearchPage').then((m) => ({ default: m.SearchPage }))
)
const SkillDetailPage = lazy(() =>
  import('@/pages/skills/SkillDetailPage').then((m) => ({ default: m.SkillDetailPage }))
)
const PublishPage = lazy(() =>
  import('@/pages/skills/PublishPage').then((m) => ({ default: m.PublishPage }))
)
const UserSkillsPage = lazy(() =>
  import('@/pages/skills/UserSkillsPage').then((m) => ({ default: m.UserSkillsPage }))
)
const UserFavoritesPage = lazy(() =>
  import('@/pages/skills/UserFavoritesPage').then((m) => ({ default: m.UserFavoritesPage }))
)
const UserProfilePage = lazy(() =>
  import('@/pages/skills/UserProfilePage').then((m) => ({ default: m.UserProfilePage }))
)
const SkillEditPage = lazy(() =>
  import('@/pages/skills/SkillEditPage').then((m) => ({ default: m.SkillEditPage }))
)

/**
 * 路由配置 - OPC-Starter
 * 注意：默认首页现在是 SkillsSquarePage（带 MainLayout 的 Skills 广场）
 * 原 HomePage 代码保留在 pages/skills/HomePage.tsx 但暂不挂载
 */
export const router = createBrowserRouter([
  // Skills Hub 公开详情页（不需要登录，但需要独立布局）
  {
    path: '/skill/:slug',
    element: <SkillDetailPage />,
  },
  {
    path: '/skill/:slug/edit',
    element: <SkillEditPage />,
  },
  {
    path: '/user/:userId',
    element: <UserProfilePage />,
  },

  // 认证路由（不需要登录）
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    path: '/register',
    element: <RegisterPage />,
  },

  // 应用主路由（需要登录）- 默认首页 Skills 广场
  {
    path: '/',
    element: (
      <ProtectedRoute>
        <MainLayout />
      </ProtectedRoute>
    ),
    children: [
      {
        index: true,
        element: <SkillsSquarePage />,
      },
      // Skills Hub 路由（需要登录）
      {
        path: 'search',
        element: <SearchPage />,
      },
      {
        path: 'publish',
        element: <PublishPage />,
      },
      {
        path: 'my-skills',
        element: <UserSkillsPage />,
      },
      {
        path: 'favorites',
        element: <UserFavoritesPage />,
      },
      {
        path: 'persons',
        element: <PersonsPage />,
      },
      {
        path: 'profile',
        element: <ProfilePage />,
      },
      {
        path: 'settings',
        element: <SettingsPage />,
      },
      {
        path: 'settings/cloud-storage',
        element: <CloudStorageSettingsPage />,
      },
    ],
  },
])

/**
 * App路由组件
 * 使用 Suspense 包裹路由，处理懒加载的 fallback
 */
export function AppRouter() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <RouterProvider router={router} />
    </Suspense>
  )
}
