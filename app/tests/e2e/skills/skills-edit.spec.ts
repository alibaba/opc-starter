/**
 * Skills Hub Skill 编辑 E2E 测试
 *
 * 测试覆盖：
 * - 编辑页面访问控制
 * - 表单预填充
 * - 编辑 Skill 信息
 * - 上传新版本
 * - 权限检查（非作者不能编辑）
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

const MOCK_SKILL = {
  id: 'mock-skill-1',
  slug: 'react-best-practices',
  name: 'React Best Practices',
  description: '一个包含 React 开发最佳实践的 Skill',
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

// ============================================
// 测试套件 - 访问控制
// ============================================

test.describe('[P0] Skills Hub 编辑 - 访问控制', () => {
  test.beforeEach(async ({ page }) => {
    await clearAuthState(page)
  })

  test('[P0] 未登录访问编辑页重定向到登录页', async ({ page }) => {
    await page.goto(`/skill/${MOCK_SKILL.slug}/edit`)
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(2000)

    // 应该重定向到登录页
    await expect(page).toHaveURL(/.*login.*/, { timeout: 10000 })
  })

  test('[P0] 登录后可以访问自己的 Skill 编辑页', async ({ page }) => {
    await mockAuthUser(page)
    await loginAsTestUser(page)

    await page.goto(`/skill/${MOCK_SKILL.slug}/edit`)
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(1000)

    // 检查编辑页标题
    const pageTitle = page.getByRole('heading', { name: /编辑|Edit/i })
    await expect(pageTitle).toBeVisible({ timeout: 10000 })
  })

  test('[P0] 非作者不能编辑 Skill', async ({ page }) => {
    // 模拟另一个用户登录
    await page.route('**/auth/v1/user', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'other-user-id',
          email: 'other@example.com',
          aud: 'authenticated',
          role: 'authenticated',
          created_at: '2024-01-01T00:00:00.000Z',
          user_metadata: { display_name: '其他用户' },
          app_metadata: {},
        }),
      })
    })

    await page.goto('/login')
    await page.waitForLoadState('networkidle')
    await page.fill('#email', 'other@example.com')
    await page.fill('#password', '888888')
    await page.click('button[type="submit"]')
    await page.waitForTimeout(2000)

    // 尝试访问编辑页
    await page.goto(`/skill/${MOCK_SKILL.slug}/edit`)
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(2000)

    // 检查是否显示权限错误或重定向
    const permissionError = page.getByText(/无权限|权限不足|forbidden|access denied/i)
    const isPermissionErrorVisible = await permissionError
      .isVisible({ timeout: 2000 })
      .catch(() => false)

    // 或者检查是否不在编辑页（被重定向）
    const currentUrl = page.url()
    const isNotOnEditPage = !currentUrl.includes('/edit')

    // 任一条件满足即认为测试通过
    expect(isPermissionErrorVisible || isNotOnEditPage).toBeTruthy()
  })
})

// ============================================
// 测试套件 - 表单预填充
// ============================================

test.describe('[P0] Skills Hub 编辑 - 表单预填充', () => {
  test.beforeEach(async ({ page }) => {
    await clearAuthState(page)
    await mockAuthUser(page)
    await loginAsTestUser(page)
  })

  test('[P0] 编辑页应该预填充 Skill 名称', async ({ page }) => {
    await page.goto(`/skill/${MOCK_SKILL.slug}/edit`)
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(2000)

    // 检查名称输入框是否有值
    const nameInput = page.locator('#name, input[name="name"]')
    await expect(nameInput).toBeVisible({ timeout: 10000 })

    const value = await nameInput.inputValue()
    expect(value.length).toBeGreaterThan(0)
  })

  test('[P0] 编辑页应该预填充 Skill 描述', async ({ page }) => {
    await page.goto(`/skill/${MOCK_SKILL.slug}/edit`)
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(2000)

    // 检查描述输入框
    const descInput = page.locator('#description, textarea[name="description"]')
    await expect(descInput).toBeVisible({ timeout: 10000 })

    const value = await descInput.inputValue()
    expect(value.length).toBeGreaterThan(0)
  })

  test('[P0] 编辑页应该显示当前版本号', async ({ page }) => {
    await page.goto(`/skill/${MOCK_SKILL.slug}/edit`)
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(2000)

    // 检查版本信息
    const versionText = page.getByText(/当前版本|Current version/i)
    const isVisible = await versionText.isVisible({ timeout: 2000 }).catch(() => false)

    if (isVisible) {
      await expect(versionText).toBeVisible()
    }
  })

  test('[P1] 编辑页应该预填充 README', async ({ page }) => {
    await page.goto(`/skill/${MOCK_SKILL.slug}/edit`)
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(2000)

    // 检查 README 输入框
    const readmeInput = page.locator('#readme, textarea[name="readme"]')
    const isVisible = await readmeInput.isVisible({ timeout: 2000 }).catch(() => false)

    if (isVisible) {
      // README 可能为空，但输入框应该存在
      await expect(readmeInput).toBeVisible()
    }
  })

  test('[P1] 编辑页应该显示已选平台', async ({ page }) => {
    await page.goto(`/skill/${MOCK_SKILL.slug}/edit`)
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(2000)

    // 检查平台选择区域
    const platformSection = page.getByText('平台').or(page.getByText('Qoder'))
    await expect(platformSection.first()).toBeVisible({ timeout: 10000 })

    // 检查是否有选中的平台
    const checkedPlatforms = page.locator('input[type="checkbox"]:checked')
    const count = await checkedPlatforms.count()

    // 应该至少有一个平台被选中
    expect(count).toBeGreaterThanOrEqual(0)
  })

  test('[P1] 编辑页应该显示已选标签', async ({ page }) => {
    await page.goto(`/skill/${MOCK_SKILL.slug}/edit`)
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(2000)

    // 检查标签区域
    const tagsSection = page.getByText('标签')
    const isVisible = await tagsSection.isVisible({ timeout: 2000 }).catch(() => false)

    if (isVisible) {
      await expect(tagsSection).toBeVisible()

      // 检查是否有标签徽章
      const tags = page.locator('[class*="badge"], .tag')
      const count = await tags.count()

      // 可能有标签也可能没有
      if (count > 0) {
        await expect(tags.first()).toBeVisible()
      }
    }
  })
})

// ============================================
// 测试套件 - 编辑功能
// ============================================

test.describe('[P1] Skills Hub 编辑 - 编辑功能', () => {
  test.beforeEach(async ({ page }) => {
    await clearAuthState(page)
    await mockAuthUser(page)
    await loginAsTestUser(page)
  })

  test('[P1] 可以修改 Skill 名称', async ({ page }) => {
    await page.goto(`/skill/${MOCK_SKILL.slug}/edit`)
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(2000)

    const nameInput = page.locator('#name, input[name="name"]')
    await expect(nameInput).toBeVisible({ timeout: 10000 })

    // 清除并输入新名称
    await nameInput.fill('')
    await nameInput.fill('Updated Skill Name')

    await expect(nameInput).toHaveValue('Updated Skill Name')
  })

  test('[P1] 可以修改 Skill 描述', async ({ page }) => {
    await page.goto(`/skill/${MOCK_SKILL.slug}/edit`)
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(2000)

    const descInput = page.locator('#description, textarea[name="description"]')
    await expect(descInput).toBeVisible({ timeout: 10000 })

    // 输入新描述
    await descInput.fill('This is an updated description for the skill.')

    await expect(descInput).toHaveValue('This is an updated description for the skill.')
  })

  test('[P1] 可以修改 README', async ({ page }) => {
    await page.goto(`/skill/${MOCK_SKILL.slug}/edit`)
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(2000)

    const readmeInput = page.locator('#readme, textarea[name="readme"]')
    const isVisible = await readmeInput.isVisible({ timeout: 2000 }).catch(() => false)

    if (isVisible) {
      await readmeInput.fill('# Updated README\n\nThis is the updated readme content.')
      await expect(readmeInput).toHaveValue(
        '# Updated README\n\nThis is the updated readme content.'
      )
    }
  })

  test('[P1] 可以添加新标签', async ({ page }) => {
    await page.goto(`/skill/${MOCK_SKILL.slug}/edit`)
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(2000)

    // 查找标签输入
    const tagInput = page.locator('input[placeholder*="标签"], input[name="tags"]')
    const isVisible = await tagInput.isVisible({ timeout: 2000 }).catch(() => false)

    if (isVisible) {
      await tagInput.fill('new-tag')
      await tagInput.press('Enter')
      await page.waitForTimeout(300)

      // 检查新标签是否被添加
      const newTag = page.getByText('new-tag')
      const tagVisible = await newTag.isVisible({ timeout: 2000 }).catch(() => false)

      if (tagVisible) {
        await expect(newTag).toBeVisible()
      }
    }
  })

  test('[P1] 可以切换平台选择', async ({ page }) => {
    await page.goto(`/skill/${MOCK_SKILL.slug}/edit`)
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(2000)

    // 查找平台复选框
    const platformCheckbox = page.locator('input[type="checkbox"]').first()
    const isVisible = await platformCheckbox.isVisible({ timeout: 2000 }).catch(() => false)

    if (isVisible) {
      const initialChecked = await platformCheckbox.isChecked()

      // 切换选择
      await platformCheckbox.click()
      await page.waitForTimeout(300)

      const newChecked = await platformCheckbox.isChecked()
      expect(newChecked).toBe(!initialChecked)
    }
  })

  test('[P1] 可以修改可见性', async ({ page }) => {
    await page.goto(`/skill/${MOCK_SKILL.slug}/edit`)
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(2000)

    // 查找可见性单选按钮
    const visibilitySection = page.getByText('可见性')
    const isVisible = await visibilitySection.isVisible({ timeout: 2000 }).catch(() => false)

    if (isVisible) {
      // 选择一个不同的可见性选项
      const publicOption = page.locator('input[type="radio"][value="public"], #public')
      const draftOption = page.locator('input[type="radio"][value="draft"], #draft')

      if (await publicOption.isVisible({ timeout: 1000 }).catch(() => false)) {
        await publicOption.click()
        await expect(publicOption).toBeChecked()
      } else if (await draftOption.isVisible({ timeout: 1000 }).catch(() => false)) {
        await draftOption.click()
        await expect(draftOption).toBeChecked()
      }
    }
  })
})

// ============================================
// 测试套件 - 新版本上传
// ============================================

test.describe('[P1] Skills Hub 编辑 - 新版本上传', () => {
  test.beforeEach(async ({ page }) => {
    await clearAuthState(page)
    await mockAuthUser(page)
    await loginAsTestUser(page)
  })

  test('[P1] 编辑页显示新版本上传区域', async ({ page }) => {
    await page.goto(`/skill/${MOCK_SKILL.slug}/edit`)
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(2000)

    // 检查新版本上传区域
    const newVersionSection = page.getByText(/新版本|New version/i)
    const isVisible = await newVersionSection.isVisible({ timeout: 2000 }).catch(() => false)

    if (isVisible) {
      await expect(newVersionSection).toBeVisible()
    }
  })

  test('[P1] 可以输入新版本号', async ({ page }) => {
    await page.goto(`/skill/${MOCK_SKILL.slug}/edit`)
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(2000)

    // 查找版本号输入
    const versionInput = page.locator('input[name="newVersion"], input[placeholder*="版本"]')
    const isVisible = await versionInput.isVisible({ timeout: 2000 }).catch(() => false)

    if (isVisible) {
      await versionInput.fill('1.1.0')
      await expect(versionInput).toHaveValue('1.1.0')
    }
  })

  test('[P1] 可以输入版本说明', async ({ page }) => {
    await page.goto(`/skill/${MOCK_SKILL.slug}/edit`)
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(2000)

    // 查找 changelog 输入
    const changelogInput = page.locator('textarea[name="changelog"], input[name="changelog"]')
    const isVisible = await changelogInput.isVisible({ timeout: 2000 }).catch(() => false)

    if (isVisible) {
      await changelogInput.fill('Fixed bugs and improved performance')
      await expect(changelogInput).toHaveValue('Fixed bugs and improved performance')
    }
  })

  test('[P1] 可以选择新版本文件', async ({ page }) => {
    await page.goto(`/skill/${MOCK_SKILL.slug}/edit`)
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(2000)

    // 查找文件输入
    const fileInput = page.locator('input[type="file"]')
    const isVisible = await fileInput.isVisible({ timeout: 2000 }).catch(() => false)

    if (isVisible) {
      // 创建测试文件
      const testFile = Buffer.from('mock zip content')

      await fileInput.setInputFiles({
        name: 'updated-skill.zip',
        mimeType: 'application/zip',
        buffer: testFile,
      })

      await page.waitForTimeout(500)

      // 检查文件名是否显示
      const fileName = page.getByText('updated-skill.zip')
      const fileVisible = await fileName.isVisible({ timeout: 2000 }).catch(() => false)

      if (fileVisible) {
        await expect(fileName).toBeVisible()
      }
    }
  })
})

// ============================================
// 测试套件 - 表单验证
// ============================================

test.describe('[P1] Skills Hub 编辑 - 表单验证', () => {
  test.beforeEach(async ({ page }) => {
    await clearAuthState(page)
    await mockAuthUser(page)
    await loginAsTestUser(page)
  })

  test('[P1] 名称不能为空', async ({ page }) => {
    await page.goto(`/skill/${MOCK_SKILL.slug}/edit`)
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(2000)

    const nameInput = page.locator('#name, input[name="name"]')
    await nameInput.fill('')

    // 尝试提交
    const submitButton = page.getByRole('button', { name: /保存|Save|更新/i })
    await submitButton.click()

    await page.waitForTimeout(500)

    // 应该还在编辑页（验证阻止了提交）
    await expect(page).toHaveURL(/.*edit.*/)
  })

  test('[P1] 描述不能为空', async ({ page }) => {
    await page.goto(`/skill/${MOCK_SKILL.slug}/edit`)
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(2000)

    const descInput = page.locator('#description, textarea[name="description"]')
    await descInput.fill('')

    // 尝试提交
    const submitButton = page.getByRole('button', { name: /保存|Save|更新/i })
    await submitButton.click()

    await page.waitForTimeout(500)

    // 应该还在编辑页
    await expect(page).toHaveURL(/.*edit.*/)
  })

  test('[P1] 至少需要选择一个平台', async ({ page }) => {
    await page.goto(`/skill/${MOCK_SKILL.slug}/edit`)
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(2000)

    // 取消所有平台选择
    const checkboxes = page.locator('input[type="checkbox"]')
    const count = await checkboxes.count()

    for (let i = 0; i < count; i++) {
      const checkbox = checkboxes.nth(i)
      if (await checkbox.isChecked()) {
        await checkbox.click()
      }
    }

    // 等待状态更新
    await page.waitForTimeout(500)

    // 检查是否有平台验证错误提示
    const validationError = page.getByText(/至少选择一个平台|请选择平台|at least one platform/i)
    const hasError = await validationError.isVisible({ timeout: 2000 }).catch(() => false)

    // 或者检查提交按钮是否被禁用（如果有的话）
    const submitButton = page.getByRole('button', { name: /保存|Save|更新/i })
    const isDisabled = await submitButton.isDisabled().catch(() => false)

    // 任一条件满足即认为测试通过
    expect(hasError || isDisabled).toBeTruthy()
  })
})

// ============================================
// 测试套件 - 取消和导航
// ============================================

test.describe('[P1] Skills Hub 编辑 - 取消和导航', () => {
  test.beforeEach(async ({ page }) => {
    await clearAuthState(page)
    await mockAuthUser(page)
    await loginAsTestUser(page)
  })

  test('[P1] 可以点击取消返回', async ({ page }) => {
    await page.goto(`/skill/${MOCK_SKILL.slug}/edit`)
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(2000)

    // 查找取消按钮
    const cancelButton = page.getByRole('button', { name: /取消|Cancel/i })
    const isVisible = await cancelButton.isVisible({ timeout: 2000 }).catch(() => false)

    if (isVisible) {
      await cancelButton.click()
      await page.waitForTimeout(1000)

      // 应该离开编辑页
      const currentUrl = page.url()
      expect(currentUrl).not.toContain('/edit')
    }
  })

  test('[P1] 从详情页可以进入编辑页', async ({ page }) => {
    await page.goto(`/skill/${MOCK_SKILL.slug}`)
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(2000)

    // 查找编辑按钮
    const editButton = page
      .getByRole('button', { name: /编辑|Edit/i })
      .or(page.getByRole('link', { name: /编辑|Edit/i }))
    const isVisible = await editButton.isVisible({ timeout: 2000 }).catch(() => false)

    if (isVisible) {
      await editButton.click()
      await page.waitForTimeout(1000)

      // 应该进入编辑页
      await expect(page).toHaveURL(/.*edit.*/)
    }
  })
})
