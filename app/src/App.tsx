/**
 * App - 根组件，包含路由、错误边界与同步状态展示
 */
import { AppRouter } from '@/config/routes'
import { ErrorBoundary } from '@/components/ui/error-boundary'
import { SyncStatus } from '@/components/business/SyncStatus'

function App() {
  return (
    <ErrorBoundary>
      <AppRouter />
      <SyncStatus />
    </ErrorBoundary>
  )
}

export default App
