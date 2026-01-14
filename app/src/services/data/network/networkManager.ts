export interface NetworkManager {
  isOnline(): boolean
  setOnline(value: boolean): void
  setup(callbacks: NetworkCallbacks): void
  cleanup(): void
}

export interface NetworkCallbacks {
  onOnline: () => void
  onOffline: () => void
}

export function createNetworkManager(): NetworkManager {
  let online = navigator.onLine
  let onlineHandler: (() => void) | null = null
  let offlineHandler: (() => void) | null = null

  const notifyNetworkChange = (isOnline: boolean): void => {
    window.dispatchEvent(
      new CustomEvent('dataservice:network', {
        detail: { isOnline, timestamp: new Date() },
      })
    )
  }

  const setup = (callbacks: NetworkCallbacks): void => {
    onlineHandler = () => {
      online = true
      console.log('[DataService] 🌐 网络已连接')
      notifyNetworkChange(true)
      callbacks.onOnline()
    }

    offlineHandler = () => {
      online = false
      console.log('[DataService] 📴 网络已断开，后续操作将保存到本地')
      notifyNetworkChange(false)
      callbacks.onOffline()
    }

    window.addEventListener('online', onlineHandler)
    window.addEventListener('offline', offlineHandler)
  }

  const cleanup = (): void => {
    if (onlineHandler) {
      window.removeEventListener('online', onlineHandler)
    }
    if (offlineHandler) {
      window.removeEventListener('offline', offlineHandler)
    }
  }

  const isOnlineFn = (): boolean => online
  
  const setOnline = (value: boolean): void => {
    online = value
  }

  return {
    isOnline: isOnlineFn,
    setOnline,
    setup,
    cleanup,
  }
}