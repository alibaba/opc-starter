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
    
    // 可能有多个匹配元素（移动端和桌面端）
    const titles = screen.getAllByText('照片时光机')
    expect(titles.length).toBeGreaterThan(0)
    
    const subtitles = screen.getAllByText('团队成长记录')
    expect(subtitles.length).toBeGreaterThan(0)
  })

  it('应该显示基础导航菜单项', () => {
    renderWithRouter(<Sidebar />)
    
    expect(screen.getByText('首页')).toBeInTheDocument()
    expect(screen.getByText('上传')).toBeInTheDocument()
    expect(screen.getByText('时间轴')).toBeInTheDocument()
    expect(screen.getByText('相册')).toBeInTheDocument()
    expect(screen.getByText('人员')).toBeInTheDocument()
    expect(screen.getByText('个人中心')).toBeInTheDocument()
  })

  it('应该正确高亮当前路由', () => {
    mockPathname = '/upload'
    
    renderWithRouter(<Sidebar />)
    
    const uploadLink = screen.getByText('上传').closest('a')
    expect(uploadLink).toHaveClass('bg-primary', 'text-primary-foreground')
    
    const homeLink = screen.getByText('首页').closest('a')
    expect(homeLink).not.toHaveClass('bg-primary')
  })

  it('首页路由应该正确高亮', () => {
    mockPathname = '/'
    
    renderWithRouter(<Sidebar />)
    
    const homeLink = screen.getByText('首页').closest('a')
    expect(homeLink).toHaveClass('bg-primary', 'text-primary-foreground')
  })

  it('移动端关闭按钮应该调用 onClose', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    
    renderWithRouter(<Sidebar isOpen={true} onClose={onClose} />)
    
    // 找到移动端关闭按钮 (X 图标)
    const closeButtons = screen.getAllByRole('button')
    const mobileCloseButton = closeButtons.find(btn => 
      btn.querySelector('.lucide-x')
    )
    
    if (mobileCloseButton) {
      await user.click(mobileCloseButton)
      expect(onClose).toHaveBeenCalled()
    }
  })

  it('点击导航项应该调用 onClose（移动端）', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    
    renderWithRouter(<Sidebar isOpen={true} onClose={onClose} />)
    
    const uploadLink = screen.getByText('上传')
    await user.click(uploadLink)
    
    expect(onClose).toHaveBeenCalled()
  })

  it('桌面端折叠按钮应该调用 onToggleCollapse', async () => {
    const user = userEvent.setup()
    const onToggleCollapse = vi.fn()
    
    renderWithRouter(<Sidebar onToggleCollapse={onToggleCollapse} />)
    
    // 找到折叠按钮（显示"收起"文字的按钮）
    const collapseButton = screen.getByRole('button', { name: /收起/ })
    await user.click(collapseButton)
    
    expect(onToggleCollapse).toHaveBeenCalled()
  })

  it('折叠状态下应该显示展开图标', () => {
    renderWithRouter(<Sidebar isCollapsed={true} />)
    
    // 折叠状态下应该有 ChevronRight 图标
    const chevronRight = document.querySelector('.lucide-chevron-right')
    expect(chevronRight).toBeInTheDocument()
  })

  it('展开状态下应该显示收起按钮', () => {
    renderWithRouter(<Sidebar isCollapsed={false} />)
    
    // 展开状态下应该显示"收起"文字
    expect(screen.getByText('收起')).toBeInTheDocument()
  })

  it('应该显示版权信息', () => {
    renderWithRouter(<Sidebar />)
    
    expect(screen.getByText(/© 2025 Photo Wall/)).toBeInTheDocument()
  })

  it('导航链接应该有正确的路径', () => {
    renderWithRouter(<Sidebar />)
    
    const homeLink = screen.getByText('首页').closest('a')
    expect(homeLink).toHaveAttribute('href', '/')
    
    const uploadLink = screen.getByText('上传').closest('a')
    expect(uploadLink).toHaveAttribute('href', '/upload')
    
    const timelineLink = screen.getByText('时间轴').closest('a')
    expect(timelineLink).toHaveAttribute('href', '/timeline')
    
    const albumsLink = screen.getByText('相册').closest('a')
    expect(albumsLink).toHaveAttribute('href', '/albums')
    
    const personsLink = screen.getByText('人员').closest('a')
    expect(personsLink).toHaveAttribute('href', '/persons')
    
    const profileLink = screen.getByText('个人中心').closest('a')
    expect(profileLink).toHaveAttribute('href', '/profile')
  })

  it('每个导航项应该有对应的图标', () => {
    renderWithRouter(<Sidebar />)
    
    // Lucide 图标使用 'lucide lucide-xxx' 的 class 格式
    // 检查 SVG 图标是否存在
    const navItems = document.querySelectorAll('nav a')
    expect(navItems.length).toBeGreaterThan(0)
    
    // 每个导航项应该有一个 SVG 图标
    navItems.forEach(item => {
      const svg = item.querySelector('svg')
      expect(svg).toBeInTheDocument()
    })
  })
})

