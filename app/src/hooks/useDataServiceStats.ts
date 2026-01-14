import { useEffect, useState } from 'react';
import { dataService } from '@/services/data/DataService';

type SyncStats = ReturnType<typeof dataService.getSyncStats>;

/**
 * Hook for accessing DataService sync statistics
 * Polls for updates every second
 */
export function useDataServiceStats() {
  const [stats, setStats] = useState<SyncStats>(dataService.getSyncStats());

  useEffect(() => {
    const interval = setInterval(() => {
      const newStats = dataService.getSyncStats();
      setStats(newStats);
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  return stats;
}
