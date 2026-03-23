/**
 * Skills Hub 可视化演示 E2E 测试
 *
 * 使用真实 Supabase 环境，带打字机效果的演示
 * 演示内容：登录 → 首页浏览 → 搜索 → 详情 → 发布 → 验证
 */

import { test, expect, Page } from '@playwright/test'
import * as fs from 'fs'
import * as path from 'path'

// ============================================
// 配置 - 真实 Supabase 环境
// ============================================

const BASE_URL = 'http://localhost:5173'
const TEST_USER = {
  email: 'test@example.com',
  password: '888888',
}

// 打字机效果延迟（毫秒）
const TYPE_DELAY = 80

// 生成唯一 Skill 名称避免冲突
const TEST_SKILL_NAME = `E2E Demo Skill ${Date.now()}`

// ============================================
// 辅助函数
// ============================================

/**
 * 带打字机效果的输入文本
 */
async function typeWithEffect(
  page: Page,
  locator: ReturnType<Page['locator']>,
  text: string,
  delay: number = TYPE_DELAY
) {
  await locator.click()
  for (const char of text) {
    await locator.pressSequentially(char, { delay: 0 })
    await page.waitForTimeout(delay)
  }
}

/**
 * 在页面上显示操作说明
 */
async function showStep(page: Page, stepNumber: number | string, description: string) {
  const timestamp = new Date().toLocaleTimeString()
  console.log(`\n[${timestamp}] 步骤 ${stepNumber}: ${description}`)

  await page.evaluate(
    (info) => {
      let indicator = document.getElementById('e2e-step-indicator')
      if (!indicator) {
        indicator = document.createElement('div')
        indicator.id = 'e2e-step-indicator'
        indicator.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        padding: 16px 24px;
        border-radius: 12px;
        font-family: 'SF Mono', Monaco, monospace;
        font-size: 14px;
        z-index: 999999;
        box-shadow: 0 10px 40px rgba(0,0,0,0.3);
        max-width: 400px;
        animation: slideIn 0.3s ease-out;
      `

        const style = document.createElement('style')
        style.textContent = `
        @keyframes slideIn {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        @keyframes pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.05); }
        }
      `
        document.head.appendChild(style)
        document.body.appendChild(indicator)
      }

      indicator.innerHTML = `
      <div style="font-weight: bold; margin-bottom: 8px; font-size: 16px;">
        Step ${info.stepNumber}
      </div>
      <div style="line-height: 1.5; opacity: 0.95;">
        ${info.description}
      </div>
      <div style="margin-top: 10px; font-size: 12px; opacity: 0.7;">
        ${info.timestamp}
      </div>
    `
      indicator.style.animation = 'none'
      void indicator.offsetHeight
      indicator.style.animation = 'slideIn 0.3s ease-out, pulse 2s ease-in-out infinite'
    },
    { stepNumber, description, timestamp }
  )

  await page.waitForTimeout(1500)
}

/**
 * 高亮页面元素
 */
async function highlightLocator(page: Page, locator: ReturnType<Page['locator']>) {
  const box = await locator.boundingBox()
  if (!box) return

  await page.evaluate((rect) => {
    let hl = document.getElementById('e2e-highlight')
    if (!hl) {
      hl = document.createElement('div')
      hl.id = 'e2e-highlight'
      document.body.appendChild(hl)
    }
    hl.style.cssText = `
      position: fixed;
      left: ${rect.x - 4}px;
      top: ${rect.y - 4}px;
      width: ${rect.width + 8}px;
      height: ${rect.height + 8}px;
      border: 3px solid #667eea;
      border-radius: 8px;
      box-shadow: 0 0 20px rgba(102, 126, 234, 0.6);
      z-index: 999998;
      pointer-events: none;
      transition: all 0.3s ease;
    `
    setTimeout(() => {
      if (hl) hl.style.opacity = '0'
    }, 2500)
  }, box)
}

/**
 * 创建测试用的 ZIP 文件
 */
function createTestZipFile(): Buffer {
  // 创建一个最小的有效 ZIP 文件
  // ZIP 文件格式：本地文件头 + 文件数据 + 中央目录 + 结束标记
  const localFileHeader = Buffer.from([
    0x50,
    0x4b,
    0x03,
    0x04, // 本地文件头签名
    0x0a,
    0x00, // 版本
    0x00,
    0x00, // 标志
    0x00,
    0x00, // 压缩方法 (存储)
    0x00,
    0x00, // 修改时间
    0x00,
    0x00, // 修改日期
    0x00,
    0x00,
    0x00,
    0x00, // CRC-32
    0x00,
    0x00,
    0x00,
    0x00, // 压缩后大小
    0x00,
    0x00,
    0x00,
    0x00, // 未压缩大小
    0x09,
    0x00, // 文件名长度
    0x00,
    0x00, // 额外字段长度
    // 文件名: SKILL.md
    0x53,
    0x4b,
    0x49,
    0x4c,
    0x4c,
    0x2e,
    0x6d,
    0x64,
    0x00,
  ])

  const fileContent = Buffer.from('# Test Skill\n\nThis is a test skill for E2E demo.\n')

  const centralDirectory = Buffer.from([
    0x50,
    0x4b,
    0x01,
    0x02, // 中央目录签名
    0x0a,
    0x00, // 版本
    0x0a,
    0x00, // 所需版本
    0x00,
    0x00, // 标志
    0x00,
    0x00, // 压缩方法
    0x00,
    0x00, // 修改时间
    0x00,
    0x00, // 修改日期
    0x00,
    0x00,
    0x00,
    0x00, // CRC-32
    0x00,
    0x00,
    0x00,
    0x00, // 压缩后大小
    0x00,
    0x00,
    0x00,
    0x00, // 未压缩大小
    0x09,
    0x00, // 文件名长度
    0x00,
    0x00, // 额外字段长度
    0x00,
    0x00, // 注释长度
    0x00,
    0x00, // 磁盘号
    0x00,
    0x00, // 内部属性
    0x00,
    0x00,
    0x00,
    0x00, // 外部属性
    0x00,
    0x00,
    0x00,
    0x00, // 本地文件头偏移
    // 文件名: SKILL.md
    0x53,
    0x4b,
    0x49,
    0x4c,
    0x4c,
    0x2e,
    0x6d,
    0x64,
    0x00,
  ])

  const endOfCentralDirectory = Buffer.from([
    0x50,
    0x4b,
    0x05,
    0x06, // 结束标记签名
    0x00,
    0x00, // 磁盘号
    0x00,
    0x00, // 中央目录所在磁盘
    0x01,
    0x00, // 磁盘上的中央目录记录数
    0x01,
    0x00, // 中央目录记录总数
    0x25,
    0x00,
    0x00,
    0x00, // 中央目录大小
    0x3a,
    0x00,
    0x00,
    0x00, // 中央目录偏移
    0x00,
    0x00, // 注释长度
  ])

  return Buffer.concat([localFileHeader, fileContent, centralDirectory, endOfCentralDirectory])
}

// ============================================
// 测试套件 - 可视化演示
// ============================================

test.describe('Skills Hub 可视化演示', () => {
  test.setTimeout(300000) // 5 分钟超时

  test('完整流程演示：登录 → 首页 → 搜索 → 详情 → 发布 → 验证', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 })

    // ========================================
    // 步骤 1: 访问首页 → 自动跳转到登录页
    // ========================================
    await showStep(page, 1, '访问 Skills Hub，自动跳转到登录页面')
    await page.goto(BASE_URL)
    await page.waitForURL('**/login**', { timeout: 15000 })
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(1500)

    await page.screenshot({
      path: 'test-results/visual-demo/01-login-page.png',
      fullPage: true,
    })

    // ========================================
    // 步骤 2: 输入邮箱和密码
    // ========================================
    await showStep(page, 2, '输入账号和密码')
    const emailInput = page.locator('#email')
    await highlightLocator(page, emailInput)
    await typeWithEffect(page, emailInput, TEST_USER.email)
    await page.waitForTimeout(300)

    const passwordInput = page.locator('#password')
    await highlightLocator(page, passwordInput)
    await typeWithEffect(page, passwordInput, TEST_USER.password)
    await page.waitForTimeout(500)

    await page.screenshot({
      path: 'test-results/visual-demo/02-credentials-filled.png',
      fullPage: true,
    })

    // ========================================
    // 步骤 3: 点击登录按钮
    // ========================================
    await showStep(page, 3, '点击登录按钮')
    const submitButton = page.getByRole('button', { name: /^登录$/ })
    await highlightLocator(page, submitButton)
    await submitButton.click()

    // 等待登录成功并跳转到首页
    await page.waitForURL(BASE_URL + '/', { timeout: 15000 })
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(2000)

    await page.screenshot({
      path: 'test-results/visual-demo/03-logged-in-homepage.png',
      fullPage: true,
    })

    // ========================================
    // 步骤 4: 浏览首页 Skills 广场
    // ========================================
    await showStep(page, 4, '登录成功，浏览 Skills 广场首页')

    const heroTitle = page.getByRole('heading', { name: /Skills Hub/i })
    await expect(heroTitle).toBeVisible({ timeout: 10000 })
    await page.waitForTimeout(2000)

    await page.screenshot({
      path: 'test-results/visual-demo/04-skills-square.png',
      fullPage: true,
    })

    // ========================================
    // 步骤 5: 在首页搜索栏输入 "Code"（原地搜索，不跳转）
    // ========================================
    await showStep(page, 5, '在搜索栏输入 "Code"')
    const searchBar = page.getByPlaceholder('搜索 AI Skills...')
    await highlightLocator(page, searchBar)
    await typeWithEffect(page, searchBar, 'Code', 100)
    // 等待 debounce(300ms) + 搜索请求完成
    await page.waitForTimeout(1500)

    await page.screenshot({
      path: 'test-results/visual-demo/05-search-typed.png',
      fullPage: true,
    })

    // ========================================
    // 步骤 6: 首页原地展示搜索结果（无跳转）
    // ========================================
    await showStep(page, 6, '查看搜索结果（首页原地展示）')
    // URL 应保持在首页，不跳转到 /search
    await expect(page).toHaveURL(BASE_URL + '/', { timeout: 5000 })
    // 等待搜索结果卡片渲染
    await page.waitForSelector('a[href^="/skill/"]', { timeout: 10000 }).catch(() => {})
    await page.waitForTimeout(1500)

    await page.screenshot({
      path: 'test-results/visual-demo/06-search-results.png',
      fullPage: true,
    })

    // 查看搜索结果中的 Skill 卡片（包含 "Code Reviewer"）
    const skillCards = page.locator('a[href^="/skill/"]')
    const cardCount = await skillCards.count()
    console.log(`   找到 ${cardCount} 个搜索结果`)

    // ========================================
    // 步骤 7: 点击 Code Reviewer 查看详情
    // ========================================
    if (cardCount > 0) {
      await showStep(page, 7, '点击「Code Reviewer」查看详情')
      const firstCard = skillCards.first()
      await highlightLocator(page, firstCard)
      await page.waitForTimeout(1000)
      await firstCard.click()
      await page.waitForURL('**/skill/**', { timeout: 10000 })
      await page.waitForLoadState('networkidle')
      await page.waitForTimeout(2000)

      await page.screenshot({
        path: 'test-results/visual-demo/07-skill-detail.png',
        fullPage: true,
      })

      // 查看下载按钮
      const downloadBtn = page.getByRole('button', { name: /下载|Download/i }).first()
      if (await downloadBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        await showStep(page, 8, '查看 CLI 安装命令和下载按钮')
        await highlightLocator(page, downloadBtn)
        await page.waitForTimeout(2000)

        await page.screenshot({
          path: 'test-results/visual-demo/08-download-area.png',
          fullPage: true,
        })
      }
    } else {
      await showStep(page, 7, '搜索结果为空，跳过详情查看')
    }

    // ========================================
    // 步骤 9: 进入发布页面
    // ========================================
    await showStep(page, 9, '进入「发布 Skill」页面')
    await page.goto(`${BASE_URL}/publish`)
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(2000)

    await page.screenshot({
      path: 'test-results/visual-demo/09-publish-page.png',
      fullPage: true,
    })

    // ========================================
    // 步骤 10: 填写 Skill 名称
    // ========================================
    await showStep(page, 10, '填写 Skill 名称')
    const nameInput = page.locator('#name')
    await highlightLocator(page, nameInput)
    await typeWithEffect(page, nameInput, TEST_SKILL_NAME, 60)
    await page.waitForTimeout(500)

    // ========================================
    // 步骤 11: 填写 Skill 描述
    // ========================================
    await showStep(page, 11, '填写 Skill 描述')
    const descInput = page.locator('#description')
    await highlightLocator(page, descInput)
    await typeWithEffect(
      page,
      descInput,
      'A demo skill created by E2E visual test with typewriter effect',
      40
    )
    await page.waitForTimeout(500)

    // ========================================
    // 步骤 12: 选择兼容平台
    // ========================================
    await showStep(page, 12, '选择兼容平台（Qoder），设置可见性为公开')
    const qoderCheckbox = page.locator('#qoder')
    await highlightLocator(page, qoderCheckbox)
    await qoderCheckbox.click()
    await page.waitForTimeout(500)

    // 选择"公开"可见性
    const publicRadio = page.locator('#public')
    await publicRadio.click()
    await page.waitForTimeout(300)

    // ========================================
    // 步骤 13: 填写版本号
    // ========================================
    await showStep(page, 13, '填写版本号')
    const versionInput = page.locator('#version')
    await highlightLocator(page, versionInput)
    await versionInput.fill('') // 清空默认值
    await typeWithEffect(page, versionInput, '1.0.0', 60)
    await page.waitForTimeout(500)

    await page.screenshot({
      path: 'test-results/visual-demo/10-publish-form-filled.png',
      fullPage: true,
    })

    // ========================================
    // 步骤 14: 上传 Skill 包文件
    // ========================================
    await showStep(page, 14, '上传 Skill 包文件（ZIP）')

    // 创建测试 ZIP 文件
    const testZipBuffer = createTestZipFile()
    const testZipPath = path.join('/tmp', `test-skill-${Date.now()}.zip`)
    fs.writeFileSync(testZipPath, testZipBuffer)

    const fileInput = page.locator('input[type="file"][accept*="zip"]')
    await fileInput.setInputFiles(testZipPath)
    await page.waitForTimeout(1500)

    await page.screenshot({
      path: 'test-results/visual-demo/11-file-uploaded.png',
      fullPage: true,
    })

    // ========================================
    // 步骤 15: 提交发布
    // ========================================
    await showStep(page, 15, '点击「发布 Skill」按钮提交')

    // 捕获页面控制台错误和 400 响应
    const consoleErrors: string[] = []
    const failedRequests: string[] = []
    page.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text())
    })
    page.on('pageerror', (err) => consoleErrors.push(err.message))
    page.on('response', (response) => {
      if (response.status() >= 400) {
        failedRequests.push(`${response.status()} ${response.url()}`)
        response
          .text()
          .then((body) =>
            console.log(
              `   [${response.status()}] ${response.url()}\n   Body: ${body.substring(0, 300)}`
            )
          )
          .catch(() => {})
      }
    })

    // 使用 nth(1) 选择表单底部的提交按钮（排除 Header 里的快捷入口）
    const publishButton = page.getByRole('button', { name: '发布 Skill' }).nth(1)
    await highlightLocator(page, publishButton)
    await publishButton.click()

    // 等待发布完成：优先等待跳转，如超时则捕获错误
    let navError: Error | null = null
    await page.waitForURL('**/skill/**', { timeout: 30000 }).catch((err: Error) => {
      navError = err
    })

    if (navError) {
      await page.screenshot({ path: 'test-results/visual-demo/publish-error.png', fullPage: true })
      if (consoleErrors.length > 0) console.log('   ❌ 控制台错误:', consoleErrors.join('\n'))
      if (failedRequests.length > 0) console.log('   ❌ 失败请求:', failedRequests.join('\n'))
      throw new Error(
        `发布后未跳转到详情页。失败请求: ${failedRequests.join('; ')} | 错误: ${navError}`
      )
    }
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(2000)

    await page.screenshot({
      path: 'test-results/visual-demo/12-publish-success.png',
      fullPage: true,
    })

    // 验证发布成功 - 页面 main 区域显示 Skill 名称
    const skillTitle = page.getByRole('main').getByRole('heading', { name: TEST_SKILL_NAME })
    await expect(skillTitle).toBeVisible({ timeout: 10000 })
    console.log(`   ✅ Skill "${TEST_SKILL_NAME}" 发布成功！`)

    // 清理临时文件
    fs.unlinkSync(testZipPath)

    // ========================================
    // 步骤 16: 验证「我的 Skills」页面显示新发布的 Skill
    // ========================================
    await showStep(page, 16, '进入「我的 Skills」页面验证')
    await page.goto(`${BASE_URL}/my-skills`)
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(2000)

    await page.screenshot({
      path: 'test-results/visual-demo/13-my-skills.png',
      fullPage: true,
    })

    // 验证新发布的 Skill 出现在列表中
    const mySkillCard = page.getByText(TEST_SKILL_NAME)
    await expect(mySkillCard).toBeVisible({ timeout: 10000 })
    console.log(`   ✅ Skill "${TEST_SKILL_NAME}" 出现在「我的 Skills」列表中！`)

    // ========================================
    // 步骤 17: 浏览收藏页面
    // ========================================
    await showStep(page, 17, '进入「我的收藏」页面')
    await page.goto(`${BASE_URL}/favorites`)
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(2000)

    await page.screenshot({
      path: 'test-results/visual-demo/15-favorites.png',
      fullPage: true,
    })

    // ========================================
    // 演示完成
    // ========================================
    await showStep(page, '✅', '演示完成！已展示完整流程：登录 → 首页 → 搜索 → 详情 → 发布 → 验证')

    await page.waitForTimeout(3000)

    await page.screenshot({
      path: 'test-results/visual-demo/99-complete.png',
      fullPage: true,
    })

    console.log('\n🎉 可视化演示完成！')
    console.log(`📦 成功发布 Skill: "${TEST_SKILL_NAME}"`)
    console.log('📸 截图保存在: test-results/visual-demo/')
    console.log('🎥 视频保存在: test-results/visual-demo/')
  })
})
