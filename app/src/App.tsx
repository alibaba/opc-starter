import { useEffect, useState } from 'react'
import { AppRouter } from '@/config/routes'
import { ErrorBoundary } from '@/components/ui/error-boundary'
import { SyncStatus } from '@/components/business/SyncStatus'
import { ConflictDialog } from '@/components/business/ConflictDialog'
import type { Photo } from '@/types/photo'

interface ConflictEvent {
  resolution: 'remote-wins' | 'local-wins' | 'merged'
  local: Photo
  remote: Photo
  timestamp: Date
}

function App() {
  const [conflictData, setConflictData] = useState<ConflictEvent | null>(null)

  useEffect(() => {
    // Listen for conflict events from DataService
    const handleConflict = (event: Event) => {
      const customEvent = event as CustomEvent<ConflictEvent>
      console.log('[App] Conflict detected:', customEvent.detail)
      setConflictData(customEvent.detail)
    }

    window.addEventListener('dataservice:conflict', handleConflict)

    return () => {
      window.removeEventListener('dataservice:conflict', handleConflict)
    }
  }, [])

  return (
    <ErrorBoundary>
      <AppRouter />
      <SyncStatus />
      
      {/* Conflict Resolution Dialog */}
      <ConflictDialog
        isOpen={conflictData !== null}
        onClose={() => setConflictData(null)}
        local={conflictData?.local || null}
        remote={conflictData?.remote || null}
        resolution={conflictData?.resolution || 'merged'}
      />
    </ErrorBoundary>
  )
}

export default App
