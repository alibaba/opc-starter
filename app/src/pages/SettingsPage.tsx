/**
 * SettingsPage - 通用设置页面
 */

import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Settings, Cloud, Bell, Shield, Palette, ArrowRight } from 'lucide-react'
import { Card } from '@/components/ui/card'

function SettingsPage() {
  const { t } = useTranslation('pages')

  const settingsGroups = [
    {
      title: t('settings.groups.cloudStorage.title'),
      description: t('settings.groups.cloudStorage.description'),
      icon: Cloud,
      href: '/settings/cloud-storage',
      color: 'bg-blue-500/10 text-blue-500',
    },
    {
      title: t('settings.groups.notifications.title'),
      description: t('settings.groups.notifications.description'),
      icon: Bell,
      href: '#',
      color: 'bg-yellow-500/10 text-yellow-500',
      disabled: true,
    },
    {
      title: t('settings.groups.security.title'),
      description: t('settings.groups.security.description'),
      icon: Shield,
      href: '#',
      color: 'bg-red-500/10 text-red-500',
      disabled: true,
    },
    {
      title: t('settings.groups.appearance.title'),
      description: t('settings.groups.appearance.description'),
      icon: Palette,
      href: '#',
      color: 'bg-purple-500/10 text-purple-500',
      disabled: true,
    },
  ]

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-card border-b">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center gap-3">
            <Settings className="w-6 h-6 text-primary" />
            <h1 className="text-2xl font-bold text-foreground">{t('settings.title')}</h1>
          </div>
          <p className="text-muted-foreground mt-1">{t('settings.subtitle')}</p>
        </div>
      </div>

      {/* Settings List */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid gap-4">
          {settingsGroups.map((group) => {
            const content = (
              <Card
                className={`p-6 ${group.disabled ? 'opacity-50 cursor-not-allowed' : 'hover:shadow-md transition-shadow cursor-pointer group'}`}
              >
                <div className="flex items-center gap-4">
                  <div
                    className={`w-12 h-12 rounded-lg ${group.color} flex items-center justify-center flex-shrink-0`}
                  >
                    <group.icon className="w-6 h-6" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors">
                      {group.title}
                      {group.disabled && (
                        <span className="ml-2 text-xs text-muted-foreground font-normal">
                          {t('settings.comingSoon')}
                        </span>
                      )}
                    </h3>
                    <p className="text-sm text-muted-foreground">{group.description}</p>
                  </div>
                  {!group.disabled && (
                    <ArrowRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
                  )}
                </div>
              </Card>
            )

            if (group.disabled) {
              return <div key={group.title}>{content}</div>
            }

            return (
              <Link key={group.title} to={group.href}>
                {content}
              </Link>
            )
          })}
        </div>

        {/* App Info */}
        <Card className="mt-8 p-6">
          <h3 className="font-semibold text-foreground mb-4">{t('settings.about')}</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t('settings.appName')}</span>
              <span className="text-foreground">OPC-Starter</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t('settings.version')}</span>
              <span className="text-foreground">1.0.0</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t('settings.techStack')}</span>
              <span className="text-foreground">React 19 + TypeScript 5.9</span>
            </div>
          </div>
        </Card>
      </div>
    </div>
  )
}

export default SettingsPage
