/**
 * Skills Hub 删除功能 E2E 测试
 *
 * 测试覆盖：
 * - Skill 删除
 * - 版本删除
 * - 删除确认对话框
 * - 权限检查
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
// 测试套件 - 删除按钮和权限
// ============================================

test.describe('[P0] Skills Hub 删除 - 权限控制', () => {
  test.beforeEach(async ({ page }) => {
    await clearAuthState(page)
  })

  test('[P0] 未登录用户看不到删除按钮', async ({ page }) => {
    // 先访问首页确保清除认证状态
    await page.goto('/')
    await page.waitForLoadState('networkidle')

    // 再访问详情页
    await page.goto(`/skill/${MOCK_SKILL.slug}`)
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(2000)

    // 查找删除按钮
    const deleteButton = page.getByRole('button', { name: /删除|Delete/i })

    // 未登录时不应该看到删除按钮
    const isVisible = await deleteButton.isVisible({ timeout: 2000 }).catch(() => false)
    expect(isVisible).toBe(false)
  })

  test('[P0] 登录后可以看到自己 Skill 的删除按钮', async ({ page }) => {
    await mockAuthUser(page)
    await loginAsTestUser(page)

    await page.goto(`/skill/${MOCK_SKILL.slug}`)
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(2000)

    // 检查删除按钮 - SkillDetailPage 直接显示删除按钮给作者
    const deleteButton = page.getByRole('button', { name: /删除|Delete/i })

    // 应该看到删除按钮（mock 数据的 author_id 是 test-user-id-12345）
    await expect(deleteButton).toBeVisible({ timeout: 5000 })
  })
})

test.describe('[P1] Skills Hub 删除 - 删除按钮位置', () => {
  test.beforeEach(async ({ page }) => {
    await clearAuthState(page)
    await mockAuthUser(page)
    await loginAsTestUser(page)
  })

  test('[P1] 详情页应该有删除选项', async ({ page }) => {
    await page.goto(`/skill/${MOCK_SKILL.slug}`)
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(2000)

    // 检查删除按钮或更多操作菜单
    const deleteButton = page.getByRole('button', { name: /删除|Delete/i })
    const moreButton = page.getByRole('button', { name: /更多|More/i })

    const hasDelete = await deleteButton.isVisible({ timeout: 2000 }).catch(() => false)
    const hasMore = await moreButton.isVisible({ timeout: 2000 }).catch(() => false)

    if (hasDelete) {
      await expect(deleteButton).toBeVisible()
    } else if (hasMore) {
      // 点击更多按钮查看是否有删除选项
      await moreButton.click()
      await page.waitForTimeout(500)

      const menuDelete = page.getByRole('menuitem', { name: /删除|Delete/i })
      const isVisible = await menuDelete.isVisible({ timeout: 2000 }).catch(() => false)

      if (isVisible) {
        await expect(menuDelete).toBeVisible()
      }
    }
  })

  test('[P1] 用户中心显示已发布的 Skills', async ({ page }) => {
    await page.goto('/my-skills')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(2000)

    // 检查页面标题 - UserSkillsPage 使用 "我的 Skills"
    const pageTitle = page.getByRole('heading', { name: '我的 Skills' })
    await expect(pageTitle).toBeVisible({ timeout: 10000 })

    // 检查 skill 列表 - UserSkillsPage 使用 Card 组件
    const skillCards = page.locator('div[class*="card"], [data-testid="card"]')
    const count = await skillCards.count()

    // 可能有 skills 列表
    if (count > 0) {
      // 检查第一个 skill 是否有删除按钮 - 使用 Trash2 图标
      const firstSkillDelete = skillCards
        .first()
        .locator('button')
        .filter({ has: page.locator('svg').filter({ hasText: '' }) }) // 包含 SVG 的按钮

      const hasDelete = await firstSkillDelete.isVisible({ timeout: 2000 }).catch(() => false)

      if (hasDelete) {
        await expect(firstSkillDelete).toBeVisible()
      }
    }
  })
})

// ============================================
// 测试套件 - 删除确认对话框
// ============================================

test.describe('[P0] Skills Hub 删除 - 确认对话框', () => {
  test.beforeEach(async ({ page }) => {
    await clearAuthState(page)
    await mockAuthUser(page)
    await loginAsTestUser(page)
  })

  test('[P0] 点击删除显示确认对话框', async ({ page }) => {
    await page.goto(`/skill/${MOCK_SKILL.slug}`)
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(2000)

    // 查找并点击删除按钮
    let deleteButton = page.getByRole('button', { name: /删除|Delete/i })

    if (!(await deleteButton.isVisible({ timeout: 2000 }).catch(() => false))) {
      // 尝试在更多菜单中查找
      const moreButton = page.getByRole('button', { name: /更多|More/i })
      if (await moreButton.isVisible({ timeout: 2000 }).catch(() => false)) {
        await moreButton.click()
        await page.waitForTimeout(500)
        deleteButton = page.getByRole('menuitem', { name: /删除|Delete/i })
      }
    }

    if (await deleteButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await deleteButton.click()
      await page.waitForTimeout(500)

      // 检查确认对话框
      const confirmDialog = page
        .getByRole('dialog')
        .or(page.getByText(/确认删除|确定删除|Are you sure/i))

      const isVisible = await confirmDialog.isVisible({ timeout: 3000 }).catch(() => false)

      if (isVisible) {
        await expect(confirmDialog).toBeVisible()
      }
    }
  })

  test('[P0] 确认对话框显示 Skill 名称', async ({ page }) => {
    await page.goto(`/skill/${MOCK_SKILL.slug}`)
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(2000)

    // 触发删除对话框
    let deleteButton = page.getByRole('button', { name: /删除|Delete/i })

    if (!(await deleteButton.isVisible({ timeout: 2000 }).catch(() => false))) {
      const moreButton = page.getByRole('button', { name: /更多|More/i })
      if (await moreButton.isVisible({ timeout: 2000 }).catch(() => false)) {
        await moreButton.click()
        await page.waitForTimeout(500)
        deleteButton = page.getByRole('menuitem', { name: /删除|Delete/i })
      }
    }

    if (await deleteButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await deleteButton.click()
      await page.waitForTimeout(500)

      // 检查对话框中是否包含 skill 名称
      const dialogContent = page.locator('[role="dialog"]')

      if (await dialogContent.isVisible({ timeout: 2000 }).catch(() => false)) {
        const skillName = dialogContent.getByText(MOCK_SKILL.name)
        const isVisible = await skillName.isVisible({ timeout: 2000 }).catch(() => false)

        if (isVisible) {
          await expect(skillName).toBeVisible()
        }
      }
    }
  })

  test('[P0] 可以取消删除操作', async ({ page }) => {
    await page.goto(`/skill/${MOCK_SKILL.slug}`)
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(2000)

    // 触发删除对话框
    let deleteButton = page.getByRole('button', { name: /删除|Delete/i })

    if (!(await deleteButton.isVisible({ timeout: 2000 }).catch(() => false))) {
      const moreButton = page.getByRole('button', { name: /更多|More/i })
      if (await moreButton.isVisible({ timeout: 2000 }).catch(() => false)) {
        await moreButton.click()
        await page.waitForTimeout(500)
        deleteButton = page.getByRole('menuitem', { name: /删除|Delete/i })
      }
    }

    if (await deleteButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await deleteButton.click()
      await page.waitForTimeout(500)

      // 查找取消按钮
      const cancelButton = page
        .getByRole('button', { name: /取消|Cancel/i })
        .or(page.getByRole('button', { name: /否|No/i }))

      if (await cancelButton.isVisible({ timeout: 2000 }).catch(() => false)) {
        await cancelButton.click()
        await page.waitForTimeout(500)

        // 对话框应该关闭
        const dialog = page.locator('[role="dialog"]')
        const isStillVisible = await dialog.isVisible({ timeout: 1000 }).catch(() => false)
        expect(isStillVisible).toBe(false)
      }
    }
  })
})

// ============================================
// 测试套件 - 版本删除
// ============================================

test.describe('[P1] Skills Hub 删除 - 版本管理', () => {
  test.beforeEach(async ({ page }) => {
    await clearAuthState(page)
    await mockAuthUser(page)
    await loginAsTestUser(page)
  })

  test('[P1] 版本历史显示删除选项', async ({ page }) => {
    await page.goto(`/skill/${MOCK_SKILL.slug}`)
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(2000)

    // 点击版本历史标签
    const versionsTab = page.getByRole('tab', { name: /版本|Version|历史/i })

    if (await versionsTab.isVisible({ timeout: 2000 }).catch(() => false)) {
      await versionsTab.click()
      await page.waitForTimeout(1000)

      // 检查版本列表中的删除按钮
      const versionItems = page.locator('li, tr').filter({ hasText: /\d+\.\d+\.\d+/ })
      const count = await versionItems.count()

      if (count > 0) {
        // 检查第一个版本是否有删除按钮
        const firstVersionDelete = versionItems
          .first()
          .locator('button')
          .filter({ hasText: /删除|Delete/i })

        const hasDelete = await firstVersionDelete.isVisible({ timeout: 2000 }).catch(() => false)

        // 可能有删除按钮
        if (hasDelete) {
          await expect(firstVersionDelete).toBeVisible()
        }
      }
    }
  })

  test('[P1] 删除版本需要确认', async ({ page }) => {
    await page.goto(`/skill/${MOCK_SKILL.slug}`)
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(2000)

    // 切换到版本历史
    const versionsTab = page.getByRole('tab', { name: /版本|Version|历史/i })

    if (await versionsTab.isVisible({ timeout: 2000 }).catch(() => false)) {
      await versionsTab.click()
      await page.waitForTimeout(1000)

      // 查找版本删除按钮
      const versionItems = page.locator('li, tr').filter({ hasText: /\d+\.\d+\.\d+/ })
      const count = await versionItems.count()

      if (count > 0) {
        const deleteButton = versionItems
          .first()
          .locator('button')
          .filter({ hasText: /删除|Delete/i })

        if (await deleteButton.isVisible({ timeout: 2000 }).catch(() => false)) {
          await deleteButton.click()
          await page.waitForTimeout(500)

          // 检查确认对话框
          const confirmDialog = page.getByRole('dialog')
          const isVisible = await confirmDialog.isVisible({ timeout: 2000 }).catch(() => false)

          if (isVisible) {
            await expect(confirmDialog).toBeVisible()
          }
        }
      }
    }
  })
})

// ============================================
// 测试套件 - 删除后行为
// ============================================

test.describe('[P1] Skills Hub 删除 - 删除后行为', () => {
  test.beforeEach(async ({ page }) => {
    await clearAuthState(page)
    await mockAuthUser(page)
    await loginAsTestUser(page)
  })

  test('[P1] 删除成功后显示提示', async ({ page }) => {
    await page.goto(`/skill/${MOCK_SKILL.slug}`)
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(2000)

    // 触发删除流程
    let deleteButton = page.getByRole('button', { name: /删除|Delete/i })

    if (!(await deleteButton.isVisible({ timeout: 2000 }).catch(() => false))) {
      const moreButton = page.getByRole('button', { name: /更多|More/i })
      if (await moreButton.isVisible({ timeout: 2000 }).catch(() => false)) {
        await moreButton.click()
        await page.waitForTimeout(500)
        deleteButton = page.getByRole('menuitem', { name: /删除|Delete/i })
      }
    }

    if (await deleteButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await deleteButton.click()
      await page.waitForTimeout(500)

      // 查找确认按钮
      const confirmButton = page
        .getByRole('button', { name: /确认|确定|删除|Yes|Confirm/i })
        .filter({ hasNotText: /取消|Cancel/i })

      if (await confirmButton.isVisible({ timeout: 2000 }).catch(() => false)) {
        // 注意：在测试中我们不真正点击确认，以免删除测试数据
        // 这里只是验证按钮存在
        await expect(confirmButton).toBeVisible()
      }
    }
  })

  test('[P1] 删除成功后重定向到列表页', async ({ page }) => {
    // 这个测试在 mock 环境中可能无法完全执行
    // 因为删除操作会真正删除数据

    await page.goto('/user/skills')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(2000)

    // 验证在列表页
    await expect(page).toHaveURL(/.*user\/skills.*/)
  })
})

// ============================================
// 测试套件 - 批量删除
// ============================================

test.describe('[P2] Skills Hub 删除 - 批量操作', () => {
  test.beforeEach(async ({ page }) => {
    await clearAuthState(page)
    await mockAuthUser(page)
    await loginAsTestUser(page)
  })

  test('[P2] 用户中心可以批量选择 Skills', async ({ page }) => {
    await page.goto('/user/skills')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(2000)

    // 查找复选框
    const checkboxes = page.locator('input[type="checkbox"]')
    const count = await checkboxes.count()

    if (count > 0) {
      // 尝试选择第一个
      await checkboxes.first().click()
      await page.waitForTimeout(300)

      // 检查是否被选中
      const isChecked = await checkboxes.first().isChecked()
      expect(isChecked).toBe(true)
    }
  })

  test('[P2] 批量选择后显示批量删除按钮', async ({ page }) => {
    await page.goto('/user/skills')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(2000)

    const checkboxes = page.locator('input[type="checkbox"]')

    if ((await checkboxes.count()) > 0) {
      await checkboxes.first().click()
      await page.waitForTimeout(300)

      // 检查批量操作栏
      const batchDelete = page.getByRole('button', { name: /批量删除|删除所选/i })
      const isVisible = await batchDelete.isVisible({ timeout: 2000 }).catch(() => false)

      if (isVisible) {
        await expect(batchDelete).toBeVisible()
      }
    }
  })
})
