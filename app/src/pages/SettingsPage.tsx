/**
 * SettingsPage - 通用设置页面
 */

import { Link } from 'react-router-dom';
import { Settings, Cloud, Bell, Shield, Palette, ArrowRight } from 'lucide-react';
import { Card } from '@/components/ui/card';

function SettingsPage() {
  const settingsGroups = [
    {
      title: '云存储',
      description: '管理存储空间和同步设置',
      icon: Cloud,
      href: '/settings/cloud-storage',
      color: 'bg-blue-500/10 text-blue-500',
    },
    {
      title: '通知',
      description: '配置通知和提醒偏好',
      icon: Bell,
      href: '#',
      color: 'bg-yellow-500/10 text-yellow-500',
      disabled: true,
    },
    {
      title: '安全',
      description: '密码和安全设置',
      icon: Shield,
      href: '#',
      color: 'bg-red-500/10 text-red-500',
      disabled: true,
    },
    {
      title: '外观',
      description: '主题和显示设置',
      icon: Palette,
      href: '#',
      color: 'bg-purple-500/10 text-purple-500',
      disabled: true,
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-card border-b">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center gap-3">
            <Settings className="w-6 h-6 text-primary" />
            <h1 className="text-2xl font-bold text-foreground">设置</h1>
          </div>
          <p className="text-muted-foreground mt-1">
            管理应用配置和偏好设置
          </p>
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
                  <div className={`w-12 h-12 rounded-lg ${group.color} flex items-center justify-center flex-shrink-0`}>
                    <group.icon className="w-6 h-6" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors">
                      {group.title}
                      {group.disabled && (
                        <span className="ml-2 text-xs text-muted-foreground font-normal">
                          (即将推出)
                        </span>
                      )}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {group.description}
                    </p>
                  </div>
                  {!group.disabled && (
                    <ArrowRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
                  )}
                </div>
              </Card>
            );

            if (group.disabled) {
              return <div key={group.title}>{content}</div>;
            }

            return (
              <Link key={group.title} to={group.href}>
                {content}
              </Link>
            );
          })}
        </div>

        {/* App Info */}
        <Card className="mt-8 p-6">
          <h3 className="font-semibold text-foreground mb-4">关于</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">应用名称</span>
              <span className="text-foreground">OPC-Starter</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">版本</span>
              <span className="text-foreground">1.0.0</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">技术栈</span>
              <span className="text-foreground">React 19 + TypeScript 5.9</span>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}

export default SettingsPage;
