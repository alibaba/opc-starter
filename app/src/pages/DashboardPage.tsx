/**
 * DashboardPage - 首页仪表盘
 * OPC-Starter 的主入口页面
 */

import { useEffect, useMemo, useRef } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  Users,
  User,
  Settings,
  Cloud,
  Bot,
  Sparkles,
  ArrowRight,
  CheckCircle2,
  Circle,
} from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useAuthStore } from '@/stores/useAuthStore'
import { useProfileStore } from '@/stores/useProfileStore'
import { dataService } from '@/services/data/DataService'
import i18n from '@/lib/i18n'

function DashboardPage() {
  const { t } = useTranslation('pages')
  const { user } = useAuthStore()
  const { profile, loadProfile } = useProfileStore()
  const profileFetchRef = useRef(false)

  useEffect(() => {
    if (profileFetchRef.current) return
    profileFetchRef.current = true
    loadProfile()
  }, [loadProfile])

  const syncStats = dataService.getSyncStats()

  const quickActions = useMemo(
    () => [
      {
        title: t('dashboard.quickActions.persons.title'),
        description: t('dashboard.quickActions.persons.description'),
        icon: Users,
        href: '/persons',
        color: 'bg-blue-500/10 text-blue-500',
      },
      {
        title: t('dashboard.quickActions.profile.title'),
        description: t('dashboard.quickActions.profile.description'),
        icon: User,
        href: '/profile',
        color: 'bg-green-500/10 text-green-500',
      },
      {
        title: t('dashboard.quickActions.cloudStorage.title'),
        description: t('dashboard.quickActions.cloudStorage.description'),
        icon: Cloud,
        href: '/settings/cloud-storage',
        color: 'bg-purple-500/10 text-purple-500',
      },
      {
        title: t('dashboard.quickActions.settings.title'),
        description: t('dashboard.quickActions.settings.description'),
        icon: Settings,
        href: '/settings',
        color: 'bg-orange-500/10 text-orange-500',
      },
    ],
    [t]
  )

  const features = useMemo(
    () => [
      { name: t('dashboard.features.auth'), done: true },
      { name: t('dashboard.features.org'), done: true },
      { name: t('dashboard.features.agentStudio'), done: true },
      { name: t('dashboard.features.dataSync'), done: true },
      { name: t('dashboard.features.tailwind'), done: true },
      { name: t('dashboard.features.typescript'), done: true },
    ],
    [t]
  )

  const displayName = profile?.fullName || user?.email || t('header.defaultUser', { ns: 'layout' })

  const syncStatusLabel =
    syncStats.status === 'syncing'
      ? t('dashboard.syncStatusSyncing')
      : syncStats.status === 'synced'
        ? t('dashboard.syncStatusSynced')
        : syncStats.status === 'error'
          ? t('dashboard.syncStatusError')
          : t('dashboard.syncStatusIdle')

  const dateLocale = i18n.language.startsWith('en') ? 'en-US' : 'zh-CN'

  return (
    <div className="min-h-screen bg-background">
      <div className="bg-linear-to-b from-primary/5 to-transparent">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="text-center">
            <div className="flex items-center justify-center gap-2 mb-4">
              <Sparkles className="w-8 h-8 text-primary" />
              <h1 className="text-4xl font-bold text-foreground">OPC-Starter</h1>
            </div>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              {t('dashboard.subtitle')}
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              {t('dashboard.welcomeBack', { name: displayName })}
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <section className="mb-12">
          <h2 className="text-2xl font-semibold text-foreground mb-6">
            {t('dashboard.quickActionsTitle')}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-stretch">
            {quickActions.map((action) => (
              <Link key={action.href} to={action.href} className="h-full">
                <Card className="h-full p-6 flex flex-col hover:shadow-lg transition-shadow cursor-pointer group">
                  <div
                    className={`w-12 h-12 rounded-lg ${action.color} flex items-center justify-center mb-4`}
                  >
                    <action.icon className="w-6 h-6" />
                  </div>
                  <h3 className="font-semibold text-foreground mb-1 group-hover:text-primary transition-colors">
                    {action.title}
                  </h3>
                  <p className="text-sm text-muted-foreground min-h-10">{action.description}</p>
                  <div className="mt-auto pt-4 flex items-center text-sm text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                    {t('dashboard.enter')} <ArrowRight className="w-4 h-4 ml-1" />
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <Card className="p-6">
            <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
              <Cloud className="w-5 h-5 text-primary" />
              {t('dashboard.systemStatusTitle')}
            </h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">{t('dashboard.networkStatus')}</span>
                <span
                  className={`flex items-center gap-1 ${syncStats.isOnline ? 'text-green-500' : 'text-red-500'}`}
                >
                  <div
                    className={`w-2 h-2 rounded-full ${syncStats.isOnline ? 'bg-green-500' : 'bg-red-500'}`}
                  />
                  {syncStats.isOnline ? t('dashboard.online') : t('dashboard.offline')}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">{t('dashboard.syncStatus')}</span>
                <span className="text-foreground">{syncStatusLabel}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">{t('dashboard.offlineQueue')}</span>
                <span className="text-foreground">
                  {t('dashboard.queueItems', { count: syncStats.queueSize })}
                </span>
              </div>
              {syncStats.lastSyncAt && (
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">{t('dashboard.lastSync')}</span>
                  <span className="text-foreground text-sm">
                    {syncStats.lastSyncAt.toLocaleString(dateLocale)}
                  </span>
                </div>
              )}
            </div>
          </Card>

          <Card className="p-6">
            <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" />
              {t('dashboard.featuresTitle')}
            </h2>
            <div className="space-y-3">
              {features.map((feature) => (
                <div key={feature.name} className="flex items-center gap-2">
                  {feature.done ? (
                    <CheckCircle2 className="w-4 h-4 text-green-500" />
                  ) : (
                    <Circle className="w-4 h-4 text-muted-foreground" />
                  )}
                  <span className={feature.done ? 'text-foreground' : 'text-muted-foreground'}>
                    {feature.name}
                  </span>
                </div>
              ))}
            </div>
          </Card>
        </div>

        <Card className="mt-8 p-6 bg-primary/5 border-primary/20">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
              <Bot className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground mb-1">{t('dashboard.agentTipTitle')}</h3>
              <p className="text-sm text-muted-foreground mb-3">{t('dashboard.agentTipBody')}</p>
              <Button variant="outline" size="sm">
                {t('dashboard.learnMore')}
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  )
}

export default DashboardPage
