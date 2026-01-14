import { setupWorker } from 'msw/browser';
import { handlers } from './handlers';

/**
 * 创建MSW浏览器Worker
 * 整合所有API处理器
 * 
 * 注意：handlers 已在 index.ts 中按正确顺序排列
 * supabaseRestHandlers 优先匹配 /supabase-proxy/rest/v1/* 请求
 */
export const worker = setupWorker(...handlers);

/**
 * 启动MSW Worker（仅开发环境）
 */
export async function startMSW() {
  try {
    console.log('[MSW] 开始启动 Mock Service Worker...')
    
    const registration = await worker.start({
      onUnhandledRequest: 'warn', // 警告未处理的请求，帮助调试
      serviceWorker: {
        url: '/mockServiceWorker.js',
      },
      // 等待 Service Worker 激活
      waitUntilReady: true,
    });
    
    console.log('[MSW] ✅ Mock Service Worker 已成功启动！', registration);
    
    // 额外等待一小段时间，确保所有 handlers 都已注册
    await new Promise(resolve => setTimeout(resolve, 100));
    console.log('[MSW] ✅ 所有 handlers 已就绪！');
    
    return registration;
  } catch (error) {
    console.error('[MSW] ❌ Mock Service Worker 启动失败:', error);
    throw error;
  }
}
