/**
 * 演示模式辅助函数
 * 提供打字机效果、高亮效果等演示增强功能
 */

import { Page } from '@playwright/test'

/**
 * 演示配置
 */
export const DEMO_CONFIG = {
  // 打字延迟（毫秒）- 快速演示
  typeDelay: 40,
  // 点击后暂停（毫秒）
  clickPause: 300,
  // 页面加载等待（毫秒）
  pageLoadPause: 500,
  // 操作间暂停（毫秒）
  actionPause: 150,
}

/**
 * 打字机效果输入文本
 * 模拟人类逐字输入的效果
 */
export async function typeWithEffect(
  page: Page,
  selector: string,
  text: string,
  options?: { delay?: number; clear?: boolean }
): Promise<void> {
  const delay = options?.delay ?? DEMO_CONFIG.typeDelay
  const locator = page.locator(selector)

  // 清空现有内容
  if (options?.clear !== false) {
    await locator.clear()
    await page.waitForTimeout(100)
  }

  // 聚焦元素
  await locator.focus()
  await page.waitForTimeout(100)

  // 逐字输入
  for (const char of text) {
    await locator.pressSequentially(char, { delay })
    await page.waitForTimeout(delay / 2)
  }

  // 输入完成后的短暂暂停
  await page.waitForTimeout(DEMO_CONFIG.actionPause)
}

/**
 * 高亮元素效果
 * 给目标元素添加临时高亮边框
 */
export async function highlightElement(
  page: Page,
  selector: string,
  duration = 800
): Promise<void> {
  const locator = page.locator(selector)

  // 添加高亮样式
  await locator.evaluate((el) => {
    el.style.outline = '3px solid #ff6b6b'
    el.style.outlineOffset = '2px'
    el.style.transition = 'outline 0.2s ease'
  })

  // 等待高亮显示
  await page.waitForTimeout(duration)

  // 移除高亮样式
  await locator.evaluate((el) => {
    el.style.outline = ''
    el.style.outlineOffset = ''
  })
}

/**
 * 演示模式点击
 * 先高亮元素，再点击
 */
export async function clickWithEffect(
  page: Page,
  selector: string,
  options?: { highlight?: boolean; pause?: number }
): Promise<void> {
  const locator = page.locator(selector)
  const highlight = options?.highlight ?? true
  const pause = options?.pause ?? DEMO_CONFIG.clickPause

  // 高亮效果
  if (highlight) {
    await highlightElement(page, selector, 500)
  }

  // 点击
  await locator.click()

  // 点击后暂停
  await page.waitForTimeout(pause)
}

/**
 * 演示模式选择下拉框
 */
export async function selectWithEffect(
  page: Page,
  selector: string,
  value: string,
  options?: { highlight?: boolean }
): Promise<void> {
  const highlight = options?.highlight ?? true

  if (highlight) {
    await highlightElement(page, selector, 500)
  }

  await page.selectOption(selector, value)
  await page.waitForTimeout(DEMO_CONFIG.actionPause)
}

/**
 * 演示模式填写表单
 * 依次填写表单字段，带打字机效果
 */
export async function fillFormWithEffect(
  page: Page,
  fields: Array<{ selector: string; value: string; label?: string }>
): Promise<void> {
  for (const field of fields) {
    // 高亮当前字段
    await highlightElement(page, field.selector, 400)

    // 打字机效果输入
    await typeWithEffect(page, field.selector, field.value)

    // 字段间暂停
    await page.waitForTimeout(DEMO_CONFIG.actionPause)
  }
}

/**
 * 等待并显示加载状态
 */
export async function waitForLoadingWithEffect(
  page: Page,
  loadingSelector: string,
  contentSelector: string,
  timeout = 10000
): Promise<void> {
  // 等待加载指示器出现
  try {
    await page.waitForSelector(loadingSelector, { timeout: 1000 })
    await page.waitForTimeout(500)
  } catch {
    // 加载指示器可能很快消失
  }

  // 等待内容出现
  await page.waitForSelector(contentSelector, { timeout })
  await page.waitForTimeout(DEMO_CONFIG.pageLoadPause)
}

/**
 * 演示模式导航
 */
export async function navigateWithEffect(
  page: Page,
  url: string,
  options?: { waitForSelector?: string }
): Promise<void> {
  // 导航到页面
  await page.goto(url)

  // 等待页面加载
  await page.waitForLoadState('networkidle')
  await page.waitForTimeout(DEMO_CONFIG.pageLoadPause)

  // 等待特定元素
  if (options?.waitForSelector) {
    await page.waitForSelector(options.waitForSelector)
  }
}

/**
 * 截图并添加注释
 */
export async function screenshotWithAnnotation(
  page: Page,
  filename: string,
  annotation?: string
): Promise<void> {
  await page.screenshot({
    path: `test-results/screenshots/${filename}.png`,
    fullPage: true,
  })

  if (annotation) {
    console.log(`📸 ${annotation}`)
  }
}

/**
 * 演示模式：完整登录流程
 */
export async function demoLogin(page: Page, email: string, password: string): Promise<void> {
  // 导航到登录页
  await navigateWithEffect(page, '/login', {
    waitForSelector: '#email',
  })

  // 填写表单
  await fillFormWithEffect(page, [
    { selector: '#email', value: email, label: '邮箱' },
    { selector: '#password', value: password, label: '密码' },
  ])

  // 点击登录按钮
  await clickWithEffect(page, 'button[type="submit"]', {
    highlight: true,
    pause: 1000,
  })
}

/**
 * 演示模式：完整注册流程
 */
export async function demoRegister(
  page: Page,
  displayName: string,
  email: string,
  password: string
): Promise<void> {
  // 导航到注册页
  await navigateWithEffect(page, '/register', {
    waitForSelector: '#displayName',
  })

  // 填写表单
  await fillFormWithEffect(page, [
    { selector: '#displayName', value: displayName, label: '昵称' },
    { selector: '#email', value: email, label: '邮箱' },
    { selector: '#password', value: password, label: '密码' },
    { selector: '#confirmPassword', value: password, label: '确认密码' },
  ])

  // 点击注册按钮
  await clickWithEffect(page, 'button[type="submit"]', {
    highlight: true,
    pause: 1000,
  })
}
