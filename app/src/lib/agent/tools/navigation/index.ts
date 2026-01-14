/**
 * Navigation Tool - OPC-Starter
 * 页面导航工具
 */

import { z } from 'zod';
import { defineTool } from '../registry';

export type NavigateCallback = (path: string) => void;

let navigateCallback: NavigateCallback | null = null;

export function setNavigateCallback(cb: NavigateCallback | null): void {
  navigateCallback = cb;
}

const navigationParamsSchema = z.object({
  page: z.enum(['home', 'persons', 'profile', 'settings', 'storage']).describe('目标页面'),
});

export const navigationTool = defineTool({
  name: 'navigateToPage',
  description: '导航到指定页面。可选页面: home(首页), persons(组织管理), profile(个人中心), settings(设置), storage(云存储设置)',
  category: 'navigation',
  parameters: navigationParamsSchema,

  async execute(params) {
    try {
      if (!navigateCallback) {
        return {
          success: false,
          error: '导航服务未初始化。请稍后重试。',
        };
      }

      const pageMap: Record<string, { path: string; name: string }> = {
        home: { path: '/', name: '首页' },
        persons: { path: '/persons', name: '组织管理' },
        profile: { path: '/profile', name: '个人中心' },
        settings: { path: '/settings', name: '设置' },
        storage: { path: '/settings/cloud-storage', name: '云存储设置' },
      };

      const target = pageMap[params.page];
      if (!target) {
        return {
          success: false,
          error: `不支持的页面类型: ${params.page}`,
        };
      }

      navigateCallback(target.path);

      return {
        success: true,
        message: `正在导航到${target.name}页面...`,
        data: {
          navigatedTo: target.path,
          page: params.page,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: `导航失败: ${(error as Error).message}`,
      };
    }
  },
});
