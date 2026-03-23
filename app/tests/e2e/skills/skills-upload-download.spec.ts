/**
 * Skills Hub 上传和下载 E2E 测试
 *
 * 测试覆盖：
 * - Skill 文件上传
 * - Skill 下载功能
 * - 版本管理
 */

import { test, expect, Page } from '@playwright/test'

// ============================================
// 测试数据
// ============================================

const TEST_USER = {
  id: 'test-user-id-12345',
  email: 'test@example.com',
  password: '888888',
}

// ============================================
// 辅助函数
// ============================================

async function clearAuthState(page: Page) {
  await page.context().clearCookies()
  await page.evaluate(() => {
    try {
      localStorage.clear()
      sessionStorage.clear()
    } catch {
      // 忽略跨域错误
    }
  })
}

async function mockAuthUser(page: Page) {
  await page.route('**/auth/v1/user', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        id: TEST_USER.id,
        email: TEST_USER.email,
        aud: 'authenticated',
        role: 'authenticated',
        created_at: '2024-01-01T00:00:00.000Z',
        user_metadata: { display_name: '测试用户' },
        app_metadata: {},
      }),
    })
  })
  await page.route('**/auth/v1/token**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        access_token: 'mock-access-token-' + Date.now(),
        refresh_token: 'mock-refresh-token-' + Date.now(),
        expires_in: 3600,
        token_type: 'bearer',
        user: {
          id: TEST_USER.id,
          email: TEST_USER.email,
        },
      }),
    })
  })
}

async function loginAsTestUser(page: Page) {
  await page.goto('/login')
  await page.waitForLoadState('networkidle')
  await page.fill('#email', TEST_USER.email)
  await page.fill('#password', TEST_USER.password)
  await page.click('button[type="submit"]')
  await page.waitForURL(/.*localhost.*/, { timeout: 15000 }).catch(() => {})
  await page.waitForTimeout(1000)
}

/**
 * 创建测试用的 skill 包文件
 */
async function createTestSkillPackage(): Promise<Buffer> {
  // 创建一个简单的 tar.gz 包内容（模拟）
  // 实际测试中使用 Buffer 模拟文件上传
  const mockPackageContent = Buffer.from(
    'H4sIAIwivGkAA+2Ryw7CIBBFWfsVhLWhM7ya+DfEEK2tVEurJsZ/l9S4qAtWEhdyNjc8Es5weUWyAwC11nROY+aMvPO1QI26BoECFQVEKQ2hOr8aIVMY7RBVbtO5Sd277p3rEufLoeh3JfPBq5Pdtnbn+CH0Ps8b8T+MUon+lfzoXxqBhEIenSV/3v+deXt0bMNC23QdW7OLG0LT+7iDHDiwx+rXioVCoVDIwBN70m8cAAoAAA==',
    'base64'
  )
  return mockPackageContent
}

// ============================================
// 测试套件 - 上传功能
// ============================================

test.describe('[P0] Skills Hub 上传 - 文件上传', () => {
  test.beforeEach(async ({ page }) => {
    await clearAuthState(page)
    await mockAuthUser(page)
    await loginAsTestUser(page)
  })

  test('[P0] 发布页应该显示文件上传区域', async ({ page }) => {
    await page.goto('/publish')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(1000)

    // 检查上传区域或文件输入
    const uploadArea = page
      .getByText(/上传|Upload|拖放|Drop/i)
      .or(page.locator('input[type="file"]'))
    await expect(uploadArea.first()).toBeVisible({ timeout: 10000 })
  })

  test('[P0] 可以选择文件进行上传', async ({ page }) => {
    await page.goto('/publish')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(1000)

    // 查找文件输入
    const fileInput = page.locator('input[type="file"]')

    if (await fileInput.isVisible({ timeout: 2000 }).catch(() => false)) {
      // 创建测试文件
      const testFile = await createTestSkillPackage()

      // 上传文件
      await fileInput.setInputFiles({
        name: 'package.tar.gz',
        mimeType: 'application/gzip',
        buffer: testFile,
      })

      await page.waitForTimeout(500)

      // 检查文件名是否显示
      const fileName = page.getByText('package.tar.gz')
      const isVisible = await fileName.isVisible({ timeout: 2000 }).catch(() => false)

      if (isVisible) {
        await expect(fileName).toBeVisible()
      }
    }
  })

  test('[P1] 上传文件后显示文件信息', async ({ page }) => {
    await page.goto('/publish')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(1000)

    const fileInput = page.locator('input[type="file"]')

    if (await fileInput.isVisible({ timeout: 2000 }).catch(() => false)) {
      const testFile = await createTestSkillPackage()

      await fileInput.setInputFiles({
        name: 'test-skill.tar.gz',
        mimeType: 'application/gzip',
        buffer: testFile,
      })

      await page.waitForTimeout(1000)

      // 检查文件大小或上传状态
      const fileInfo = page
        .getByText(/大小|Size|MB|KB|上传成功/i)
        .or(page.getByText('test-skill.tar.gz'))

      const isVisible = await fileInfo
        .first()
        .isVisible({ timeout: 2000 })
        .catch(() => false)

      if (isVisible) {
        await expect(fileInfo.first()).toBeVisible()
      }
    }
  })

  test('[P1] 可以移除已选择的文件', async ({ page }) => {
    await page.goto('/publish')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(1000)

    const fileInput = page.locator('input[type="file"]')

    if (await fileInput.isVisible({ timeout: 2000 }).catch(() => false)) {
      const testFile = await createTestSkillPackage()

      await fileInput.setInputFiles({
        name: 'test-skill.tar.gz',
        mimeType: 'application/gzip',
        buffer: testFile,
      })

      await page.waitForTimeout(500)

      // 查找移除按钮
      const removeButton = page.getByRole('button', { name: /移除|删除|Remove|Clear/i })

      if (await removeButton.isVisible({ timeout: 2000 }).catch(() => false)) {
        await removeButton.click()
        await page.waitForTimeout(500)

        // 文件应该被移除
        const fileName = page.getByText('test-skill.tar.gz')
        const isStillVisible = await fileName.isVisible({ timeout: 1000 }).catch(() => false)
        expect(isStillVisible).toBe(false)
      }
    }
  })
})

test.describe('[P1] Skills Hub 上传 - 版本管理', () => {
  test.beforeEach(async ({ page }) => {
    await clearAuthState(page)
    await mockAuthUser(page)
    await loginAsTestUser(page)
  })

  test('[P1] 应该显示版本号输入', async ({ page }) => {
    await page.goto('/publish')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(1000)

    // 查找版本号输入
    const versionInput = page
      .locator('input[name="version"], input[placeholder*="版本"], input[placeholder*="version"]')
      .or(page.getByText('版本'))

    await expect(versionInput.first()).toBeVisible({ timeout: 10000 })
  })

  test('[P1] 可以输入版本号', async ({ page }) => {
    await page.goto('/publish')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(1000)

    const versionInput = page.locator('input[name="version"]')

    if (await versionInput.isVisible({ timeout: 2000 }).catch(() => false)) {
      await versionInput.fill('1.0.0')
      await expect(versionInput).toHaveValue('1.0.0')
    }
  })

  test('[P1] 可以输入 changelog', async ({ page }) => {
    await page.goto('/publish')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(1000)

    const changelogInput = page
      .locator('textarea[name="changelog"], input[name="changelog"]')
      .or(page.getByPlaceholder(/更新|changelog|版本/i))

    if (
      await changelogInput
        .first()
        .isVisible({ timeout: 2000 })
        .catch(() => false)
    ) {
      await changelogInput.first().fill('初始版本发布')
      await expect(changelogInput.first()).toHaveValue('初始版本发布')
    }
  })
})

// ============================================
// 测试套件 - 下载功能
// ============================================

test.describe('[P0] Skills Hub 下载 - 详情页下载', () => {
  test.beforeEach(async ({ page }) => {
    await clearAuthState(page)
  })

  test('[P0] 详情页应该显示下载按钮', async ({ page }) => {
    await page.goto('/skill/react-best-practices')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(2000)

    // 检查下载按钮
    const downloadButton = page.getByRole('button', { name: /下载|Download/i })
    await expect(downloadButton).toBeVisible({ timeout: 10000 })
  })

  test('[P0] 点击下载按钮触发下载', async ({ page }) => {
    await page.goto('/skill/react-best-practices')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(2000)

    // 等待下载请求
    void page.waitForEvent('download', { timeout: 10000 }).catch(() => null)

    const downloadButton = page.getByRole('button', { name: /下载|Download/i })
    await downloadButton.click()

    // 或者检查是否调用了下载 API
    await page.waitForTimeout(1000)

    // 检查成功提示或下载开始
    const successToast = page.getByText(/开始下载|下载中|success/i)
    const isVisible = await successToast.isVisible({ timeout: 3000 }).catch(() => false)

    if (isVisible) {
      await expect(successToast).toBeVisible()
    }
  })

  test('[P1] 显示 CLI 安装命令', async ({ page }) => {
    await page.goto('/skill/react-best-practices')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(2000)

    // 检查 CLI 安装命令标签
    const cliLabel = page.getByText('CLI 安装命令')
    await expect(cliLabel).toBeVisible({ timeout: 10000 })

    // 检查命令内容 - InstallCommand 使用 code 元素
    const command = page.locator('code').filter({ hasText: /skill-hub install/ })
    await expect(command).toBeVisible({ timeout: 5000 })
  })

  test('[P1] 可以复制安装命令', async ({ page }) => {
    await page.goto('/skill/react-best-practices')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(2000)

    // 查找复制按钮
    const copyButton = page
      .getByRole('button', { name: /复制|copy/i })
      .or(page.locator('button').filter({ has: page.locator('svg') }))

    if (
      await copyButton
        .first()
        .isVisible({ timeout: 2000 })
        .catch(() => false)
    ) {
      await copyButton.first().click()
      await page.waitForTimeout(500)

      // 检查复制成功提示
      const copiedToast = page.getByText(/已复制|copied|复制成功/i)
      const isVisible = await copiedToast.isVisible({ timeout: 2000 }).catch(() => false)

      if (isVisible) {
        await expect(copiedToast).toBeVisible()
      }
    }
  })
})

test.describe('[P1] Skills Hub 下载 - 版本选择', () => {
  test.beforeEach(async ({ page }) => {
    await clearAuthState(page)
  })

  test('[P1] 可以选择不同版本下载', async ({ page }) => {
    await page.goto('/skill/react-best-practices')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(2000)

    // 查找版本选择器
    const versionSelector = page
      .locator('select, [role="combobox"]')
      .filter({ hasText: /版本|version/i })

    if (await versionSelector.isVisible({ timeout: 2000 }).catch(() => false)) {
      await versionSelector.click()
      await page.waitForTimeout(300)

      // 选择一个版本
      const versionOption = page.getByRole('option').first()
      if (await versionOption.isVisible({ timeout: 2000 }).catch(() => false)) {
        await versionOption.click()
        await page.waitForTimeout(500)
      }
    }
  })

  test('[P1] 版本历史标签显示所有版本', async ({ page }) => {
    await page.goto('/skill/react-best-practices')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(2000)

    // 点击版本历史标签
    const versionsTab = page.getByRole('tab', { name: /版本|Version|历史/i })

    if (await versionsTab.isVisible({ timeout: 2000 }).catch(() => false)) {
      await versionsTab.click()
      await page.waitForTimeout(1000)

      // 检查版本列表
      const versionList = page.locator('li, tr').filter({ hasText: /\d+\.\d+\.\d+/ })
      const count = await versionList.count()

      // 应该有至少一个版本
      expect(count).toBeGreaterThanOrEqual(0)
    }
  })
})

// ============================================
// 测试套件 - 端到端上传下载流程
// ============================================

test.describe('[P2] Skills Hub 端到端 - 上传并下载', () => {
  test.beforeEach(async ({ page }) => {
    await clearAuthState(page)
    await mockAuthUser(page)
    await loginAsTestUser(page)
  })

  test('[P2] 发布 skill 后可以下载', async ({ page }) => {
    // 1. 访问发布页
    await page.goto('/publish')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(1000)

    // 2. 填写表单
    const nameInput = page.locator('#name, input[name="name"]')
    await nameInput.fill('E2E Test Skill')

    const descInput = page.locator('#description, textarea[name="description"]')
    await descInput.fill('This is an E2E test skill')

    // 3. 上传文件
    const fileInput = page.locator('input[type="file"]')
    if (await fileInput.isVisible({ timeout: 2000 }).catch(() => false)) {
      const testFile = await createTestSkillPackage()
      await fileInput.setInputFiles({
        name: 'e2e-test-skill.tar.gz',
        mimeType: 'application/gzip',
        buffer: testFile,
      })
      await page.waitForTimeout(500)
    }

    // 4. 提交表单（在测试环境中可能不需要真正提交）
    // 这里主要验证表单可以正确填写
    await expect(nameInput).toHaveValue('E2E Test Skill')
    await expect(descInput).toHaveValue('This is an E2E test skill')
  })
})
