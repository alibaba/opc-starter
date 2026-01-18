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
