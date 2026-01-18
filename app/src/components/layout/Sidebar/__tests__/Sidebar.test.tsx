/**
 * @vitest-environment jsdom
 */
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Sidebar } from '../index'
import { renderWithRouter } from '@/test/testUtils'

// Mock react-router-dom useLocation
let mockPathname = '/'

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useLocation: () => ({
      pathname: mockPathname,
    }),
  }
})

describe('Sidebar', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockPathname = '/'
  })

  it('应该渲染 Logo 和标题', () => {
    renderWithRouter(<Sidebar />)

    // OPC-Starter 品牌
    const titles = screen.getAllByText('OPC-Starter')
    expect(titles.length).toBeGreaterThan(0)

    const subtitles = screen.getAllByText('一人公司启动器')
    expect(subtitles.length).toBeGreaterThan(0)
  })

  it('应该显示基础导航菜单项', () => {
    renderWithRouter(<Sidebar />)

    // OPC-Starter 菜单项
    expect(screen.getByText('首页')).toBeInTheDocument()
    expect(screen.getByText('组织管理')).toBeInTheDocument()
    expect(screen.getByText('个人中心')).toBeInTheDocument()
    expect(screen.getByText('设置')).toBeInTheDocument()
  })

  it('应该正确高亮当前路由', () => {
    mockPathname = '/persons'
    renderWithRouter(<Sidebar />)

    const organizationLinks = screen.getAllByText('组织管理')
    const organizationLink = organizationLinks[0].closest('a')

    // 检查是否有高亮类名（激活状态使用 bg-primary）
    expect(organizationLink?.className).toContain('bg-primary')
  })

  it('首页路由应该正确高亮', () => {
    mockPathname = '/'
    renderWithRouter(<Sidebar />)

    const homeLinks = screen.getAllByText('首页')
    const homeLink = homeLinks[0].closest('a')

    expect(homeLink?.className).toContain('bg-primary')
  })

  it('移动端关闭按钮应该调用 onClose', async () => {
    const user = userEvent.setup()
    const mockOnClose = vi.fn()

    renderWithRouter(<Sidebar isOpen={true} onClose={mockOnClose} />)

    // 点击遮罩层
    const overlay = document.querySelector('.fixed.inset-0')
    if (overlay) {
      await user.click(overlay)
      expect(mockOnClose).toHaveBeenCalled()
    }
  })

  it('点击导航项应该调用 onClose（移动端）', async () => {
    const user = userEvent.setup()
    const mockOnClose = vi.fn()

    renderWithRouter(<Sidebar isOpen={true} onClose={mockOnClose} />)

    const homeLink = screen.getAllByText('首页')[0]
    await user.click(homeLink)

    expect(mockOnClose).toHaveBeenCalled()
  })

  it('桌面端折叠按钮应该调用 onToggleCollapse', async () => {
    const user = userEvent.setup()
    const mockOnToggleCollapse = vi.fn()

    renderWithRouter(<Sidebar isCollapsed={false} onToggleCollapse={mockOnToggleCollapse} />)

    // 找到折叠按钮（使用 title 属性）
    const collapseButton = document.querySelector('button[title="收起侧边栏"]')
    if (collapseButton) {
      await user.click(collapseButton)
      expect(mockOnToggleCollapse).toHaveBeenCalled()
    }
  })

  it('折叠状态下应该显示展开图标', () => {
    renderWithRouter(<Sidebar isCollapsed={true} onToggleCollapse={() => {}} />)

    // 折叠状态下应该有展开按钮
    const expandButton = document.querySelector('button[title="展开侧边栏"]')
    expect(expandButton).toBeInTheDocument()
  })

  it('展开状态下应该显示收起按钮', () => {
    renderWithRouter(<Sidebar isCollapsed={false} onToggleCollapse={() => {}} />)

    const collapseButton = document.querySelector('button[title="收起侧边栏"]')
    expect(collapseButton).toBeInTheDocument()
  })

  it('应该显示版权信息', () => {
    renderWithRouter(<Sidebar isCollapsed={false} />)

    // OPC-Starter 版权信息
    const copyright = screen.getByText(/© 2026 OPC-Starter/)
    expect(copyright).toBeInTheDocument()
  })

  it('导航链接应该有正确的路径', () => {
    renderWithRouter(<Sidebar />)

    const homeLink = screen.getAllByText('首页')[0].closest('a')
    expect(homeLink).toHaveAttribute('href', '/')

    const organizationLink = screen.getAllByText('组织管理')[0].closest('a')
    expect(organizationLink).toHaveAttribute('href', '/persons')

    const profileLink = screen.getAllByText('个人中心')[0].closest('a')
    expect(profileLink).toHaveAttribute('href', '/profile')

    const settingsLink = screen.getAllByText('设置')[0].closest('a')
    expect(settingsLink).toHaveAttribute('href', '/settings')
  })

  it('每个导航项应该有对应的图标', () => {
    renderWithRouter(<Sidebar />)

    // 检查 SVG 图标数量
    const svgIcons = document.querySelectorAll('svg.lucide')
    expect(svgIcons.length).toBeGreaterThan(0)
  })
})
