/**
 * 获取当前上下文工具
 * OPC-Starter - 通用上下文获取
 */

import { z } from 'zod';
import { defineTool } from '../registry';

const getCurrentContextParamsSchema = z.object({});

export const getCurrentContextTool = defineTool({
  name: 'getCurrentContext',
  description: '获取当前应用上下文信息，包括当前页面、用户状态等',
  category: 'context',
  parameters: getCurrentContextParamsSchema,

  async execute() {
    try {
      // 获取当前路由
      const currentPath = window.location.pathname;
      
      // 获取页面标题
      const pageTitle = document.title;

      // 获取当前时间
      const now = new Date();

      return {
        success: true,
        message: '获取当前上下文成功',
        data: {
          currentPath,
          pageTitle,
          timestamp: now.toISOString(),
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        },
        ui: {
          id: `context-${Date.now()}`,
          type: 'text',
          props: {
            content: `当前页面: ${currentPath}\n时间: ${now.toLocaleString('zh-CN')}`,
          },
        },
      };
    } catch (error) {
      return {
        success: false,
        error: `获取上下文失败: ${(error as Error).message}`,
      };
    }
  },
});
