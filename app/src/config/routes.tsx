import { lazy, Suspense } from 'react';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { LoadingSpinner } from '@/components/ui/loading';
import { ProtectedRoute } from '@/auth/components/ProtectedRoute';

// 路由级别的代码分割：使用 React.lazy 动态导入页面组件
const DashboardPage = lazy(() => import('@/pages/DashboardPage'));
const PersonsPage = lazy(() => import('@/pages/PersonsPage'));
const ProfilePage = lazy(() => import('@/pages/ProfilePage'));
const SettingsPage = lazy(() => import('@/pages/SettingsPage'));
const CloudStorageSettingsPage = lazy(() => import('@/pages/CloudStorageSettingsPage'));

// 认证页面
const LoginPage = lazy(() => import('@/auth/pages/LoginPage'));
const RegisterPage = lazy(() => import('@/auth/pages/RegisterPage'));

/**
 * 路由配置 - OPC-Starter
 */
export const router = createBrowserRouter([
  // 认证路由（不需要登录）
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    path: '/register',
    element: <RegisterPage />,
  },
  // 应用主路由（需要登录）
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
        element: <DashboardPage />,
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
]);

/**
 * App路由组件
 * 使用 Suspense 包裹路由，处理懒加载的 fallback
 */
export function AppRouter() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <RouterProvider router={router} />
    </Suspense>
  );
}
