/**
 * DashboardPage - 首页仪表盘
 * OPC-Starter 的主入口页面
 */

import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { 
  Users, 
  User, 
  Settings, 
  Cloud, 
  Bot,
  Sparkles,
  ArrowRight,
  CheckCircle2,
  Circle
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/stores/useAuthStore';
import { useProfileStore } from '@/stores/useProfileStore';
import { dataService } from '@/services/data/DataService';

function DashboardPage() {
  const { user } = useAuthStore();
  const { profile, loadProfile } = useProfileStore();
  const profileFetchRef = useRef(false);

  useEffect(() => {
    if (profileFetchRef.current) return;
    profileFetchRef.current = true;
    loadProfile();
  }, [loadProfile]);

  const syncStats = dataService.getSyncStats();

  const quickActions = [
    {
      title: '组织管理',
      description: '管理团队成员和组织架构',
      icon: Users,
      href: '/persons',
      color: 'bg-blue-500/10 text-blue-500',
    },
    {
      title: '个人中心',
      description: '更新个人信息和头像',
      icon: User,
      href: '/profile',
      color: 'bg-green-500/10 text-green-500',
    },
    {
      title: '云存储设置',
      description: '管理存储和同步设置',
      icon: Cloud,
      href: '/settings/cloud-storage',
      color: 'bg-purple-500/10 text-purple-500',
    },
    {
      title: '系统设置',
      description: '配置应用偏好',
      icon: Settings,
      href: '/settings',
      color: 'bg-orange-500/10 text-orange-500',
    },
  ];

  const features = [
    { name: 'Supabase Auth 认证', done: true },
    { name: '组织架构管理', done: true },
    { name: 'Agent Studio (A2UI)', done: true },
    { name: '数据同步 (IndexedDB + Realtime)', done: true },
    { name: 'Tailwind CSS v4', done: true },
    { name: 'TypeScript 严格模式', done: true },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <div className="bg-linear-to-b from-primary/5 to-transparent">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="text-center">
            <div className="flex items-center justify-center gap-2 mb-4">
              <Sparkles className="w-8 h-8 text-primary" />
              <h1 className="text-4xl font-bold text-foreground">
                OPC-Starter
              </h1>
            </div>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              一人公司启动器 - AI-Friendly React Boilerplate
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              欢迎回来，{profile?.fullName || user?.email || '用户'}！
            </p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Quick Actions */}
        <section className="mb-12">
          <h2 className="text-2xl font-semibold text-foreground mb-6">
            快速入口
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {quickActions.map((action) => (
              <Link key={action.href} to={action.href}>
                <Card className="p-6 hover:shadow-lg transition-shadow cursor-pointer group">
                  <div className={`w-12 h-12 rounded-lg ${action.color} flex items-center justify-center mb-4`}>
                    <action.icon className="w-6 h-6" />
                  </div>
                  <h3 className="font-semibold text-foreground mb-1 group-hover:text-primary transition-colors">
                    {action.title}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {action.description}
                  </p>
                  <div className="mt-4 flex items-center text-sm text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                    进入 <ArrowRight className="w-4 h-4 ml-1" />
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        </section>

        {/* Status & Features */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* System Status */}
          <Card className="p-6">
            <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
              <Cloud className="w-5 h-5 text-primary" />
              系统状态
            </h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">网络状态</span>
                <span className={`flex items-center gap-1 ${syncStats.isOnline ? 'text-green-500' : 'text-red-500'}`}>
                  <div className={`w-2 h-2 rounded-full ${syncStats.isOnline ? 'bg-green-500' : 'bg-red-500'}`} />
                  {syncStats.isOnline ? '在线' : '离线'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">同步状态</span>
                <span className="text-foreground">
                  {syncStats.status === 'syncing' ? '同步中...' : 
                   syncStats.status === 'synced' ? '已同步' : 
                   syncStats.status === 'error' ? '同步异常' : '空闲'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">离线队列</span>
                <span className="text-foreground">{syncStats.queueSize} 项</span>
              </div>
              {syncStats.lastSyncAt && (
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">最后同步</span>
                  <span className="text-foreground text-sm">
                    {syncStats.lastSyncAt.toLocaleString('zh-CN')}
                  </span>
                </div>
              )}
            </div>
          </Card>

          {/* Features */}
          <Card className="p-6">
            <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" />
              已集成功能
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

        {/* Agent Tip */}
        <Card className="mt-8 p-6 bg-primary/5 border-primary/20">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
              <Bot className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground mb-1">
                💡 提示：使用 Agent Studio
              </h3>
              <p className="text-sm text-muted-foreground mb-3">
                点击右下角的 AI 助手按钮，可以使用自然语言与系统交互。
                Agent 可以帮助你导航页面、回答问题等。
              </p>
              <Button variant="outline" size="sm">
                了解更多
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}

export default DashboardPage;
