/**
 * @vitest-environment jsdom
 */
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import ProfilePage from '../ProfilePage'
import { renderWithRouter } from '@/test/testUtils'

// Mock stores
const mockLoadProfile = vi.fn()
let mockProfile: { fullName: string; email: string } | null = null
let mockIsLoading = false
let mockError: string | null = null

vi.mock('@/stores/useProfileStore', () => ({
  useProfileStore: () => ({
    profile: mockProfile,
    isLoading: mockIsLoading,
    loadProfile: mockLoadProfile,
    error: mockError,
  }),
}))

// Mock Auth Store
let mockUser: { id: string } | null = { id: 'test-user-id' }

vi.mock('@/stores/useAuthStore', () => ({
  useAuthStore: () => ({
    user: mockUser,
  }),
}))

// Mock useOrganization hook
const mockLoadTree = vi.fn()
const mockGetUserOrgInfo = vi.fn()
const mockUpdateUserOrganization = vi.fn()

let mockTree: { id: string; display_name: string }[] = []
let mockUserOrgInfo: { 
  role: string; 
  organization: { display_name: string } | null;
  ancestors: { display_name: string }[];
} | null = null
let mockOrgLoading = false

vi.mock('@/hooks/useOrganization', () => ({
  useOrganization: () => ({
    tree: mockTree,
    userOrgInfo: mockUserOrgInfo,
    isLoading: mockOrgLoading,
    loadTree: mockLoadTree,
    getUserOrgInfo: mockGetUserOrgInfo,
    updateUserOrganization: mockUpdateUserOrganization,
  }),
}))

// Mock components
vi.mock('@/components/business/AvatarUploader', () => ({
  AvatarUploader: () => <div data-testid="avatar-uploader">AvatarUploader</div>,
}))

vi.mock('@/components/business/ProfileForm', () => ({
  ProfileForm: () => <div data-testid="profile-form">ProfileForm</div>,
}))

vi.mock('@/components/organization/OrganizationBreadcrumb', () => ({
  OrganizationBreadcrumb: ({ currentOrg }: { currentOrg: { display_name: string } | null }) => (
    <div data-testid="org-breadcrumb">
      {currentOrg?.display_name || '未分配团队'}
    </div>
  ),
}))

vi.mock('@/components/organization/AssignTeamDialog', () => ({
  AssignTeamDialog: ({ open }: { open: boolean }) => (
    open ? <div data-testid="assign-team-dialog">AssignTeamDialog</div> : null
  ),
}))

describe('ProfilePage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockProfile = { fullName: '张三', email: 'test@example.com' }
    mockIsLoading = false
    mockError = null
    mockUser = { id: 'test-user-id' }
    mockTree = []
    mockUserOrgInfo = { role: 'member', organization: null, ancestors: [] }
    mockOrgLoading = false
  })

  it('加载中时应该显示加载状态', async () => {
    mockIsLoading = true
    mockProfile = null

    renderWithRouter(<ProfilePage />)
    
    expect(screen.getByText('加载个人信息中...')).toBeInTheDocument()
  })

  it('加载失败时应该显示错误状态', async () => {
    mockError = '网络连接失败'
    mockProfile = null

    renderWithRouter(<ProfilePage />)
    
    expect(screen.getByText('网络连接失败')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '重试' })).toBeInTheDocument()
  })

  it('应该渲染页面标题', async () => {
    renderWithRouter(<ProfilePage />)
    
    expect(screen.getByText('个人中心')).toBeInTheDocument()
    expect(screen.getByText(/管理您的个人信息和头像/)).toBeInTheDocument()
  })

  it('应该显示组织信息区域', async () => {
    renderWithRouter(<ProfilePage />)
    
    expect(screen.getByText('组织信息')).toBeInTheDocument()
  })

  it('应该显示头像上传组件', async () => {
    renderWithRouter(<ProfilePage />)
    
    expect(screen.getByTestId('avatar-uploader')).toBeInTheDocument()
    expect(screen.getByText('头像')).toBeInTheDocument()
  })

  it('应该显示个人信息表单', async () => {
    renderWithRouter(<ProfilePage />)
    
    expect(screen.getByTestId('profile-form')).toBeInTheDocument()
  })

  it('应该显示组织面包屑', async () => {
    mockUserOrgInfo = {
      role: 'member',
      organization: { display_name: '研发部' },
      ancestors: [],
    }

    renderWithRouter(<ProfilePage />)
    
    expect(screen.getByTestId('org-breadcrumb')).toBeInTheDocument()
    expect(screen.getByText('研发部')).toBeInTheDocument()
  })

  it('组织加载中时应该显示加载状态', async () => {
    mockOrgLoading = true

    renderWithRouter(<ProfilePage />)
    
    expect(screen.getByText('加载组织信息...')).toBeInTheDocument()
  })

  it('管理员应该看到"修改团队"按钮', async () => {
    mockUserOrgInfo = { role: 'admin', organization: null, ancestors: [] }

    renderWithRouter(<ProfilePage />)
    
    expect(screen.getByRole('button', { name: /修改团队/ })).toBeInTheDocument()
  })

  it('非管理员不应该看到"修改团队"按钮', async () => {
    mockUserOrgInfo = { role: 'member', organization: null, ancestors: [] }

    renderWithRouter(<ProfilePage />)
    
    expect(screen.queryByRole('button', { name: /修改团队/ })).not.toBeInTheDocument()
  })

  it('应该显示头像相关提示信息', async () => {
    renderWithRouter(<ProfilePage />)
    
    expect(screen.getByText(/上传的头像将用于 AI 人脸识别/)).toBeInTheDocument()
  })

  it('初始化时应该调用 loadProfile', async () => {
    renderWithRouter(<ProfilePage />)
    
    await waitFor(() => {
      expect(mockLoadProfile).toHaveBeenCalled()
    })
  })

  it('初始化时应该调用 loadTree 和 getUserOrgInfo', async () => {
    renderWithRouter(<ProfilePage />)
    
    await waitFor(() => {
      expect(mockLoadTree).toHaveBeenCalled()
      expect(mockGetUserOrgInfo).toHaveBeenCalledWith('test-user-id')
    })
  })
})

