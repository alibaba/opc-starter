/**
 * 演示模式测试 - UI 交互与视觉效果
 *
 * 展示 Skills Hub 的各种 UI 交互和视觉效果：
 * 1. 主题切换（深色/浅色模式）
 * 2. 响应式设计（移动端适配）
 * 3. 排序和筛选交互
 * 4. 空状态展示
 * 5. 加载状态动画
 * 6. 表单交互效果
 *
 * 运行方式：
 * npm run test:e2e:demo
 * 或：npx playwright test tests/e2e/demo/demo-ui-interactions.spec.ts --headed --workers=1
 */

import { test, expect } from '@playwright/test'
import { execSync } from 'child_process'
import {
  typeWithEffect,
  clickWithEffect,
  highlightElement,
  fillFormWithEffect,
} from '../../support/helpers/demo-helpers'

// ============================================
// 自适应屏幕分辨率
// ============================================

function getScreenSize(): { width: number; height: number } {
  try {
    const output = execSync(`system_profiler SPDisplaysDataType | grep "UI Looks like"`, {
      encoding: 'utf8',
    }).trim()
    const match = output.match(/(\d+)\s*x\s*(\d+)/)
    if (match) {
      return { width: parseInt(match[1]), height: parseInt(match[2]) }
    }
  } catch {
    // fallback
  }
  return { width: 1280, height: 800 }
}

const screen = getScreenSize()
const VIEWPORT = { width: screen.width, height: screen.height }

// ============================================
// 测试配置
// ============================================

// 使用配置文件中的 baseURL (http://localhost:5174)
test.use({
  launchOptions: { slowMo: 40 },
  viewport: VIEWPORT,
  video: {
    mode: 'on',
    size: VIEWPORT,
  },
})

// ============================================
// 测试数据
// ============================================

const TEST_USER = {
  email: 'test@example.com',
  password: '888888',
}

// ============================================
// 辅助函数
// ============================================

async function clearAllAuthState(page: import('@playwright/test').Page) {
  await page.context().clearCookies()
  await page.evaluate(() => {
    try {
      localStorage.clear()
      sessionStorage.clear()
    } catch {
      // ignore
    }
  })
}

async function loginUser(page: import('@playwright/test').Page) {
  await page.goto('/login')
  await page.waitForLoadState('networkidle')
  await page.waitForTimeout(400)
  await fillFormWithEffect(page, [
    { selector: '#email', value: TEST_USER.email },
    { selector: '#password', value: TEST_USER.password },
  ])
  await clickWithEffect(page, 'button[type="submit"]', { pause: 1500 })
  await page
    .waitForURL((url) => !url.pathname.startsWith('/login'), { timeout: 8000 })
    .catch(() => {})
  await page.waitForTimeout(500)
}

async function screenshot(page: import('@playwright/test').Page, name: string) {
  await page.screenshot({
    path: `test-results/demo-ui-${name}-${Date.now()}.png`,
  })
}

// ============================================
// 演示测试套件
// ============================================

test.describe('🎬 演示模式 - UI 交互与视觉效果', () => {
  test.beforeEach(async ({ page }) => {
    await clearAllAuthState(page)
  })

  // ============================================================
  // Scene 1: 主题切换演示
  // ============================================================
  test('🎬 Scene 1: 主题切换 - 深色/浅色模式', async ({ page }) => {
    console.log('\n🎬 Scene 1: 主题切换演示')

    // Step 1: 访问首页（浅色模式默认）
    console.log('  📍 Step 1: 查看浅色模式')
    await page.goto('/')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(800)

    // 高亮页面内容
    const heroHeading = page.getByRole('heading', { name: 'Skills Hub' })
    if (await heroHeading.isVisible({ timeout: 3000 }).catch(() => false)) {
      await heroHeading.evaluate((el: HTMLElement) => {
        el.style.outline = '3px solid #6366f1'
        el.style.outlineOffset = '4px'
      })
      await page.waitForTimeout(600)
      await heroHeading.evaluate((el: HTMLElement) => {
        el.style.outline = ''
        el.style.outlineOffset = ''
      })
    }

    await screenshot(page, 'theme-light')

    // Step 2: 查找主题切换按钮
    console.log('  📍 Step 2: 查找主题切换按钮')
    const themeToggle = page
      .locator('button')
      .filter({
        has: page.locator('svg'),
      })
      .filter({
        hasText: /sun|moon|theme/i,
      })
      .or(page.locator('[data-testid="theme-toggle"], [aria-label*="theme"], [aria-label*="主题"]'))

    // Step 3: 切换到深色模式
    if (
      await themeToggle
        .first()
        .isVisible({ timeout: 2000 })
        .catch(() => false)
    ) {
      console.log('  📍 Step 3: 切换到深色模式')
      await themeToggle.first().evaluate((el: HTMLElement) => {
        el.style.outline = '3px solid #f59e0b'
        el.style.outlineOffset = '4px'
      })
      await page.waitForTimeout(500)
      await themeToggle.first().click()
      await page.waitForTimeout(800)

      await screenshot(page, 'theme-dark')

      // Step 4: 切换回浅色模式
      console.log('  📍 Step 4: 切换回浅色模式')
      await themeToggle.first().click()
      await page.waitForTimeout(500)
    } else {
      console.log('  ⚠️  未找到主题切换按钮，跳过主题切换演示')
    }

    console.log('  ✅ 主题切换演示完成')
  })

  // ============================================================
  // Scene 2: 排序交互演示
  // ============================================================
  test('🎬 Scene 2: 排序交互 - 多种排序方式', async ({ page }) => {
    console.log('\n🎬 Scene 2: 排序交互演示')

    // Step 1: 访问搜索页
    console.log('  📍 Step 1: 访问搜索页')
    await page.goto('/search')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(800)

    // Step 2: 演示下载量排序
    console.log('  📍 Step 2: 按下载量排序')
    const sortSelect = page.locator('[role="combobox"]').first()
    if (await sortSelect.isVisible({ timeout: 3000 }).catch(() => false)) {
      await sortSelect.evaluate((el: HTMLElement) => {
        el.style.outline = '3px solid #6366f1'
        el.style.outlineOffset = '4px'
      })
      await page.waitForTimeout(500)
      await sortSelect.click()
      await page.waitForTimeout(400)

      // 选择下载量
      const downloadsOption = page.getByRole('option', { name: '下载量' })
      if (await downloadsOption.isVisible({ timeout: 2000 }).catch(() => false)) {
        await downloadsOption.evaluate((el: HTMLElement) => {
          el.style.backgroundColor = '#6366f1'
          el.style.color = 'white'
        })
        await page.waitForTimeout(400)
        await downloadsOption.click()
        await page.waitForTimeout(600)
      }
    }

    await screenshot(page, 'sort-downloads')

    // Step 3: 演示点赞数排序
    console.log('  📍 Step 3: 按点赞数排序')
    if (await sortSelect.isVisible({ timeout: 2000 }).catch(() => false)) {
      await sortSelect.click()
      await page.waitForTimeout(400)

      const likesOption = page.getByRole('option', { name: '点赞数' })
      if (await likesOption.isVisible({ timeout: 2000 }).catch(() => false)) {
        await likesOption.evaluate((el: HTMLElement) => {
          el.style.backgroundColor = '#ef4444'
          el.style.color = 'white'
        })
        await page.waitForTimeout(400)
        await likesOption.click()
        await page.waitForTimeout(600)
      }
    }

    await screenshot(page, 'sort-likes')

    // Step 4: 演示最新发布排序
    console.log('  📍 Step 4: 按最新发布排序')
    if (await sortSelect.isVisible({ timeout: 2000 }).catch(() => false)) {
      await sortSelect.click()
      await page.waitForTimeout(400)

      const latestOption = page.getByRole('option', { name: '最新发布' })
      if (await latestOption.isVisible({ timeout: 2000 }).catch(() => false)) {
        await latestOption.evaluate((el: HTMLElement) => {
          el.style.backgroundColor = '#10b981'
          el.style.color = 'white'
        })
        await page.waitForTimeout(400)
        await latestOption.click()
        await page.waitForTimeout(600)
      }
    }

    await screenshot(page, 'sort-latest')
    console.log('  ✅ 排序交互演示完成')
  })

  // ============================================================
  // Scene 3: 筛选面板交互演示
  // ============================================================
  test('🎬 Scene 3: 筛选面板 - 平台筛选交互', async ({ page }) => {
    console.log('\n🎬 Scene 3: 筛选面板演示')

    // Step 1: 访问搜索页
    console.log('  📍 Step 1: 访问搜索页')
    await page.goto('/search')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(600)

    // Step 2: 打开筛选面板
    console.log('  📍 Step 2: 打开筛选面板')
    const filterBtn = page.getByRole('button', { name: /筛选|filter/i })
    if (await filterBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await filterBtn.evaluate((el: HTMLElement) => {
        el.style.outline = '3px solid #6366f1'
        el.style.outlineOffset = '4px'
      })
      await page.waitForTimeout(500)
      await filterBtn.click()
      await page.waitForTimeout(600)
    }

    // Step 3: 选择平台
    console.log('  📍 Step 3: 选择平台筛选')
    const platforms = ['Qoder', 'Cursor', 'Claude Code']
    for (const platform of platforms) {
      const platformBadge = page.locator('text=' + platform).first()
      if (await platformBadge.isVisible({ timeout: 2000 }).catch(() => false)) {
        await platformBadge.evaluate((el: HTMLElement) => {
          el.style.outline = '2px solid #6366f1'
          el.style.outlineOffset = '2px'
        })
        await page.waitForTimeout(400)
        await platformBadge.click()
        await page.waitForTimeout(300)
      }
    }

    await screenshot(page, 'filter-platforms')

    // Step 4: 清除筛选
    console.log('  📍 Step 4: 清除筛选')
    const clearBtn = page.getByRole('button', { name: /清除|清空/i })
    if (await clearBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await clearBtn.evaluate((el: HTMLElement) => {
        el.style.outline = '3px solid #ef4444'
        el.style.outlineOffset = '4px'
      })
      await page.waitForTimeout(500)
      await clearBtn.click()
      await page.waitForTimeout(400)
    }

    console.log('  ✅ 筛选面板演示完成')
  })

  // ============================================================
  // Scene 4: 空状态演示
  // ============================================================
  test('🎬 Scene 4: 空状态 - 无搜索结果', async ({ page }) => {
    console.log('\n🎬 Scene 4: 空状态演示')

    // Step 1: 搜索不存在的关键词
    console.log('  📍 Step 1: 搜索不存在的关键词')
    await page.goto('/search?q=nonexistent-skill-xyz-12345')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(1500)

    // Step 2: 高亮空状态
    console.log('  📍 Step 2: 展示空状态界面')
    const emptyState = page.getByText('未找到相关 Skills')
    if (await emptyState.isVisible({ timeout: 3000 }).catch(() => false)) {
      await emptyState.evaluate((el: HTMLElement) => {
        el.style.outline = '3px solid #f59e0b'
        el.style.outlineOffset = '4px'
      })
      await page.waitForTimeout(800)
    }

    // 高亮空状态图标
    const emptyIcon = page
      .locator('svg')
      .filter({
        hasText: /search|empty/i,
      })
      .or(page.locator('.w-16.h-16'))

    await screenshot(page, 'empty-state')

    // Step 3: 展示建议操作
    console.log('  📍 Step 3: 展示建议操作')
    const suggestion = page.getByText('尝试其他关键词')
    if (await suggestion.isVisible({ timeout: 2000 }).catch(() => false)) {
      await suggestion.evaluate((el: HTMLElement) => {
        el.style.outline = '2px solid #10b981'
        el.style.outlineOffset = '2px'
      })
      await page.waitForTimeout(500)
    }

    console.log('  ✅ 空状态演示完成')
  })

  // ============================================================
  // Scene 5: 表单交互演示
  // ============================================================
  test('🎬 Scene 5: 表单交互 - 发布表单验证', async ({ page }) => {
    console.log('\n🎬 Scene 5: 表单交互演示')

    // Step 1: 登录
    console.log('  📍 Step 1: 登录账号')
    await loginUser(page)

    // Step 2: 访问发布页
    console.log('  📍 Step 2: 访问发布页')
    await page.goto('/publish')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(800)

    // Step 3: 演示表单字段聚焦效果
    console.log('  📍 Step 3: 演示表单字段聚焦')

    // 名称字段
    const nameInput = page.locator('#name')
    if (await nameInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      await nameInput.focus()
      await page.waitForTimeout(300)
      await nameInput.evaluate((el: HTMLInputElement) => {
        el.style.boxShadow = '0 0 0 3px rgba(99, 102, 241, 0.3)'
      })
      await page.waitForTimeout(400)
      await typeWithEffect(page, '#name', 'Demo Skill', { delay: 50 })
    }

    // 描述字段
    const descInput = page.locator('#description')
    if (await descInput.isVisible({ timeout: 2000 }).catch(() => false)) {
      await descInput.focus()
      await page.waitForTimeout(300)
      await descInput.fill('这是一个演示用的 Skill 描述')
      await page.waitForTimeout(400)
    }

    // Step 4: 演示标签输入
    console.log('  📍 Step 4: 演示标签输入')
    const tagInput = page.locator('input[placeholder*="标签"], input[name="tags"]')
    if (await tagInput.isVisible({ timeout: 2000 }).catch(() => false)) {
      await tagInput.focus()
      await page.waitForTimeout(300)
      await typeWithEffect(page, 'input[placeholder*="标签"], input[name="tags"]', 'react', {
        delay: 40,
      })
      await tagInput.press('Enter')
      await page.waitForTimeout(300)
      await typeWithEffect(page, 'input[placeholder*="标签"], input[name="tags"]', 'typescript', {
        delay: 40,
      })
      await tagInput.press('Enter')
    }

    await screenshot(page, 'form-interaction')

    // Step 5: 演示平台选择
    console.log('  📍 Step 5: 演示平台选择')
    const qoderCheckbox = page.locator('input[value="qoder"], label:has-text("Qoder")')
    if (
      await qoderCheckbox
        .first()
        .isVisible({ timeout: 2000 })
        .catch(() => false)
    ) {
      await qoderCheckbox.first().evaluate((el: HTMLElement) => {
        el.style.outline = '3px solid #6366f1'
        el.style.outlineOffset = '2px'
      })
      await page.waitForTimeout(400)
      await qoderCheckbox.first().click()
      await page.waitForTimeout(300)
    }

    console.log('  ✅ 表单交互演示完成')
  })

  // ============================================================
  // Scene 6: 详情页交互演示
  // ============================================================
  test('🎬 Scene 6: 详情页交互 - 标签切换与版本选择', async ({ page }) => {
    console.log('\n🎬 Scene 6: 详情页交互演示')

    // Step 1: 访问详情页
    console.log('  📍 Step 1: 访问 Skill 详情页')
    await page.goto('/skill/react-best-practices')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(1000)

    // Step 2: 演示标签切换
    console.log('  📍 Step 2: 演示标签切换')

    // README 标签
    const readmeTab = page.getByRole('tab', { name: 'README' })
    if (await readmeTab.isVisible({ timeout: 3000 }).catch(() => false)) {
      await readmeTab.evaluate((el: HTMLElement) => {
        el.style.outline = '3px solid #6366f1'
        el.style.outlineOffset = '4px'
      })
      await page.waitForTimeout(500)
      await readmeTab.click()
      await page.waitForTimeout(400)
    }

    // 版本历史标签
    const versionsTab = page.getByRole('tab', { name: /版本|Version/i })
    if (await versionsTab.isVisible({ timeout: 2000 }).catch(() => false)) {
      await versionsTab.evaluate((el: HTMLElement) => {
        el.style.outline = '3px solid #10b981'
        el.style.outlineOffset = '4px'
      })
      await page.waitForTimeout(500)
      await versionsTab.click()
      await page.waitForTimeout(400)
    }

    await screenshot(page, 'detail-tabs')

    // Step 3: 演示版本选择器
    console.log('  📍 Step 3: 演示版本选择器')
    const versionSelector = page
      .locator('[role="combobox"]')
      .filter({
        hasText: /版本|version/i,
      })
      .or(page.locator('select'))

    if (
      await versionSelector
        .first()
        .isVisible({ timeout: 2000 })
        .catch(() => false)
    ) {
      await versionSelector.first().evaluate((el: HTMLElement) => {
        el.style.outline = '3px solid #f59e0b'
        el.style.outlineOffset = '4px'
      })
      await page.waitForTimeout(500)
      await versionSelector.first().click()
      await page.waitForTimeout(400)
    }

    // Step 4: 演示安装命令复制
    console.log('  📍 Step 4: 演示安装命令区域')
    const installCommand = page.locator('code, pre').first()
    if (await installCommand.isVisible({ timeout: 2000 }).catch(() => false)) {
      await installCommand.evaluate((el: HTMLElement) => {
        el.style.outline = '3px solid #10b981'
        el.style.outlineOffset = '4px'
        el.style.backgroundColor = '#1e1e1e'
      })
      await page.waitForTimeout(600)
    }

    await screenshot(page, 'detail-install')

    console.log('  ✅ 详情页交互演示完成')
  })

  // ============================================================
  // Scene 7: 社交互动演示
  // ============================================================
  test('🎬 Scene 7: 社交互动 - 点赞与收藏', async ({ page }) => {
    console.log('\n🎬 Scene 7: 社交互动演示')

    // Step 1: 登录
    console.log('  📍 Step 1: 登录账号')
    await loginUser(page)

    // Step 2: 访问详情页
    console.log('  📍 Step 2: 访问 Skill 详情页')
    await page.goto('/skill/react-best-practices')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(800)

    // Step 3: 演示点赞
    console.log('  📍 Step 3: 演示点赞功能')
    const likeButton = page
      .locator('button, [role="button"]')
      .filter({
        has: page.locator('svg'),
      })
      .filter({
        hasText: /\d+/,
      })
      .first()

    if (await likeButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      // 高亮点赞按钮
      await likeButton.evaluate((el: HTMLElement) => {
        el.style.outline = '3px solid #ef4444'
        el.style.outlineOffset = '4px'
        el.style.transform = 'scale(1.1)'
      })
      await page.waitForTimeout(600)

      // 点击点赞
      await likeButton.click()
      await page.waitForTimeout(500)

      // 展示点赞后状态
      await likeButton.evaluate((el: HTMLElement) => {
        el.style.backgroundColor = '#fef2f2'
      })
      await page.waitForTimeout(400)
    }

    await screenshot(page, 'social-like')

    // Step 4: 演示收藏
    console.log('  📍 Step 4: 演示收藏功能')
    const favoriteButtons = page
      .locator('button, [role="button"]')
      .filter({
        has: page.locator('svg'),
      })
      .filter({
        hasText: /\d+/,
      })

    const count = await favoriteButtons.count()
    if (count >= 2) {
      const favoriteBtn = favoriteButtons.nth(1)

      // 高亮收藏按钮
      await favoriteBtn.evaluate((el: HTMLElement) => {
        el.style.outline = '3px solid #f59e0b'
        el.style.outlineOffset = '4px'
        el.style.transform = 'scale(1.1)'
      })
      await page.waitForTimeout(600)

      // 点击收藏
      await favoriteBtn.click()
      await page.waitForTimeout(500)

      // 展示收藏后状态
      await favoriteBtn.evaluate((el: HTMLElement) => {
        el.style.backgroundColor = '#fffbeb'
      })
      await page.waitForTimeout(400)
    }

    await screenshot(page, 'social-favorite')

    console.log('  ✅ 社交互动演示完成')
  })

  // ============================================================
  // Scene 8: 用户中心导航演示
  // ============================================================
  test('🎬 Scene 8: 用户中心 - 页面导航流程', async ({ page }) => {
    console.log('\n🎬 Scene 8: 用户中心导航演示')

    // Step 1: 登录
    console.log('  📍 Step 1: 登录账号')
    await loginUser(page)

    // Step 2: 我的 Skills 页面
    console.log('  📍 Step 2: 访问我的 Skills')
    await page.goto('/my-skills')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(800)

    // 高亮页面标题
    const mySkillsTitle = page.locator('h1').first()
    if (await mySkillsTitle.isVisible().catch(() => false)) {
      await mySkillsTitle.evaluate((el: HTMLElement) => {
        el.style.outline = '3px solid #6366f1'
        el.style.outlineOffset = '4px'
      })
      await page.waitForTimeout(500)
    }

    await screenshot(page, 'user-my-skills')

    // Step 3: 我的收藏页面
    console.log('  📍 Step 3: 访问我的收藏')
    await page.goto('/favorites')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(600)

    const favoritesTitle = page.locator('h1').first()
    if (await favoritesTitle.isVisible().catch(() => false)) {
      await favoritesTitle.evaluate((el: HTMLElement) => {
        el.style.outline = '3px solid #f59e0b'
        el.style.outlineOffset = '4px'
      })
      await page.waitForTimeout(500)
    }

    await screenshot(page, 'user-favorites')

    // Step 4: 用户公开主页
    console.log('  📍 Step 4: 访问用户公开主页')
    await page.goto('/user/test-user-id-12345')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(600)

    // 高亮用户信息区域
    const userInfo = page.locator('[class*="avatar"], img').first()
    if (await userInfo.isVisible().catch(() => false)) {
      await userInfo.evaluate((el: HTMLElement) => {
        el.style.outline = '3px solid #10b981'
        el.style.outlineOffset = '4px'
      })
      await page.waitForTimeout(500)
    }

    await screenshot(page, 'user-public-profile')

    console.log('  ✅ 用户中心导航演示完成')
  })
})
