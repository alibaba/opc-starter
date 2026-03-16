/**
 * Playwright 测试辅助函数
 */

import { Page } from '@playwright/test'

/**
 * 等待页面稳定（无网络活动）
 */
export async function waitForPageStable(page: Page, timeout = 5000): Promise<void> {
  await page.waitForLoadState('networkidle', { timeout })
}

/**
 * 清除认证状态
 */
export async function clearAuthState(page: Page): Promise<void> {
  await page.context().clearCookies()
  await page.evaluate(() => {
    localStorage.clear()
    sessionStorage.clear()
  })
}

/**
 * 检查是否已登录（通过 URL 判断）
 */
export async function isLoggedIn(page: Page): Promise<boolean> {
  const url = page.url()
  return !url.includes('/login') && !url.includes('/register')
}

/**
 * 等待元素可见
 */
export async function waitForElement(page: Page, selector: string, timeout = 10000): Promise<void> {
  await page.waitForSelector(selector, { state: 'visible', timeout })
}

/**
 * 截图辅助（带时间戳）
 */
export async function takeScreenshot(page: Page, name: string): Promise<void> {
  await page.screenshot({
    path: `test-results/screenshots/${name}-${Date.now()}.png`,
    fullPage: true,
  })
}
