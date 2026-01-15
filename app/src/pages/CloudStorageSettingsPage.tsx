/**
 * 云存储设置页面 - OPC-Starter
 * 使用 Supabase Storage 管理文件存储
 */

import { useState, useEffect } from 'react'
import { Cloud, RefreshCw, HardDrive, CheckCircle2, Clock, Trash2 } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { useAuthStore } from '@/stores/useAuthStore'
import { useUIStore } from '@/stores/useUIStore'
import { dataService } from '@/services/data/DataService'
import { cn } from '@/lib/utils'

/**
 * 云存储设置页面
 */
export default function CloudStorageSettingsPage() {
  const { user } = useAuthStore()
  const { showToast } = useUIStore()
  const [isSyncing, setIsSyncing] = useState(false)
  const [syncStats, setSyncStats] = useState(dataService.getSyncStats())

  // 定期更新同步统计
  useEffect(() => {
    const interval = setInterval(() => {
      setSyncStats(dataService.getSyncStats())
    }, 1000)

    return () => clearInterval(interval)
  }, [])

  // 格式化文件大小（保留以备将来使用）
  const _formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`
  }
  // 避免 unused 警告
  void _formatBytes

  // 手动同步
  const handleManualSync = async () => {
    if (!user) {
      showToast('请先登录', 'error')
      return
    }

    setIsSyncing(true)

    try {
      showToast('正在同步数据...', 'info')

      const queueResult = await dataService.triggerQueueProcessing()
      const delta = await dataService.incrementalSync()

      setSyncStats(dataService.getSyncStats())

      const queueMessage =
        queueResult.failed > 0
          ? `队列成功 ${queueResult.success}，失败 ${queueResult.failed}`
          : `队列成功 ${queueResult.success}`

      showToast(
        `同步完成：${queueMessage}；新增 ${delta.added}，更新 ${delta.updated}，删除 ${delta.deleted}`,
        queueResult.failed > 0 ? 'warning' : 'success'
      )
    } catch (error) {
      console.error('同步失败:', error)
      showToast('同步失败', 'error')
    } finally {
      setIsSyncing(false)
    }
  }

  // 清理本地缓存
  const handleClearCache = async () => {
    if (window.confirm('确定要清理本地缓存吗？这不会删除云端数据。')) {
      try {
        // 清理 localStorage 中的缓存数据
        const keysToRemove = Object.keys(localStorage).filter(
          (key) => key.startsWith('cache_') || key.startsWith('temp_')
        )
        keysToRemove.forEach((key) => localStorage.removeItem(key))

        showToast('缓存已清理', 'success')
      } catch (error) {
        console.error('清理缓存失败:', error)
        showToast('清理缓存失败', 'error')
      }
    }
  }

  if (!user) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card className="p-8 text-center">
          <Cloud className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
          <h2 className="text-2xl font-bold text-foreground mb-2">云存储设置</h2>
          <p className="text-muted-foreground mb-6">请先登录以使用云存储功能</p>
          <Button onClick={() => (window.location.href = '/login')}>立即登录</Button>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="space-y-6">
        {/* 页面标题 */}
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">云存储设置</h1>
          <p className="text-muted-foreground">管理您的 Supabase Storage 存储和同步设置</p>
        </div>

        {/* 存储配额 */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <HardDrive className="w-5 h-5 text-muted-foreground" />
              <h2 className="text-lg font-semibold">Supabase Storage</h2>
            </div>
            <span className="text-sm text-muted-foreground">免费层 1GB</span>
          </div>

          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-muted-foreground">存储使用</span>
                <span className="font-medium">按量计费</span>
              </div>
              <Progress value={10} className="h-2" />
              <p className="text-xs text-muted-foreground mt-1">Supabase 免费层提供 1GB 存储空间</p>
            </div>

            <div className="bg-primary/10 border border-primary/20 rounded-lg p-3">
              <p className="text-sm text-primary">
                💡 提示：升级到 Pro 计划可获得更多存储空间和功能
              </p>
            </div>
          </div>
        </Card>

        {/* 同步状态 */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <RefreshCw
                className={cn(
                  'w-5 h-5 text-muted-foreground',
                  syncStats.status === 'syncing' && 'animate-spin text-primary'
                )}
              />
              <h2 className="text-lg font-semibold">同步状态</h2>
            </div>
            <div className="flex items-center space-x-2">
              <div
                className={cn(
                  'w-2 h-2 rounded-full',
                  syncStats.isOnline ? 'bg-green-500' : 'bg-red-500'
                )}
              />
              <span className="text-sm text-muted-foreground">
                {syncStats.isOnline ? '在线' : '离线'}
              </span>
            </div>
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-3 bg-muted rounded-lg">
                <div className="text-xl font-bold text-foreground">{syncStats.queueSize}</div>
                <div className="text-xs text-muted-foreground mt-1">离线队列</div>
              </div>

              <div className="text-center p-3 bg-primary/10 rounded-lg">
                <div className="text-xl font-bold text-primary">
                  {syncStats.status === 'syncing'
                    ? '同步中'
                    : syncStats.status === 'synced'
                      ? '已同步'
                      : syncStats.status === 'error'
                        ? '异常'
                        : '空闲'}
                </div>
                <div className="text-xs text-primary/80 mt-1">当前状态</div>
              </div>

              <div className="text-center p-3 bg-warning/10 rounded-lg">
                <div className="flex items-center justify-center space-x-1">
                  <Clock className="w-4 h-4 text-warning" />
                  <span className="text-xl font-bold text-warning">
                    {syncStats.conflictStats.total}
                  </span>
                </div>
                <div className="text-xs text-warning/80 mt-1">冲突累计</div>
              </div>

              <div className="text-center p-3 bg-green-500/10 rounded-lg">
                <div className="flex items-center justify-center space-x-1">
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                  <span className="text-xl font-bold text-green-500">
                    {syncStats.hasInitialSynced ? '已完成' : '未完成'}
                  </span>
                </div>
                <div className="text-xs text-green-500/80 mt-1">初次同步</div>
              </div>
            </div>

            {syncStats.lastSyncAt && (
              <div className="text-sm text-muted-foreground text-center">
                最后同步: {syncStats.lastSyncAt.toLocaleString('zh-CN')}
              </div>
            )}
          </div>
        </Card>

        {/* 操作按钮 */}
        <Card className="p-6">
          <h2 className="text-lg font-semibold mb-4">操作</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Button onClick={handleManualSync} disabled={isSyncing} className="w-full">
              <RefreshCw className={cn('w-4 h-4 mr-2', isSyncing && 'animate-spin')} />
              {isSyncing ? '同步中...' : '手动同步'}
            </Button>

            <Button variant="outline" onClick={handleClearCache} className="w-full">
              <Trash2 className="w-4 h-4 mr-2" />
              清理缓存
            </Button>
          </div>
        </Card>

        {/* 说明信息 */}
        <Card className="p-6 bg-primary/5 border-primary/20">
          <h3 className="font-medium text-primary mb-2">💡 使用提示</h3>
          <ul className="text-sm text-primary/80 space-y-1 list-disc list-inside">
            <li>数据会自动在后台同步到 Supabase</li>
            <li>离线时数据保存在本地，上线后自动同步</li>
            <li>同步失败的操作会在网络恢复后自动重试</li>
            <li>清理缓存不会删除云端数据</li>
          </ul>
        </Card>
      </div>
    </div>
  )
}
