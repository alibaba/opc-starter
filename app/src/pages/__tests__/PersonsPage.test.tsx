/**
 * @vitest-environment jsdom
 */
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import PersonsPage from '../PersonsPage'
import { renderWithRouter } from '@/test/testUtils'

// Mock Auth Store
let mockUser: { id: string } | null = { id: 'test-user-id' }

vi.mock('@/stores/useAuthStore', () => ({
  useAuthStore: () => ({
    user: mockUser,
  }),
}))

// Mock useOrganization hook
const mockLoadTree = vi.fn()
const mockSelectOrganization = vi.fn()
const mockCreateOrganization = vi.fn()
const mockDeleteOrganization = vi.fn()
const mockGetUserOrgInfo = vi.fn()
const mockAddMember = vi.fn()
const mockRemoveMember = vi.fn()
const mockChangeRole = vi.fn()
const mockSearchUsers = vi.fn()

let mockTree: { id: string; display_name: string }[] = []
let mockSelectedOrg: { id: string; display_name: string } | null = null
let mockMembers: { id: string; full_name: string }[] = []
let mockUserOrgInfo: { role: string } | null = { role: 'member' }
let mockIsLoading = false
let mockError: string | null = null

vi.mock('@/hooks/useOrganization', () => ({
  useOrganization: () => ({
    tree: mockTree,
    selectedOrg: mockSelectedOrg,
    members: mockMembers,
    userOrgInfo: mockUserOrgInfo,
    isLoading: mockIsLoading,
    error: mockError,
    loadTree: mockLoadTree,
    selectOrganization: mockSelectOrganization,
    createOrganization: mockCreateOrganization,
    deleteOrganization: mockDeleteOrganization,
    getUserOrgInfo: mockGetUserOrgInfo,
    addMember: mockAddMember,
    removeMember: mockRemoveMember,
    changeRole: mockChangeRole,
    searchUsers: mockSearchUsers,
  }),
}))

// Mock components
vi.mock('@/components/organization/OrgTree', () => ({
  OrgTree: ({ tree, onSelect }: { tree: unknown[]; onSelect: (node: unknown) => void }) => (
    <div data-testid="org-tree">
      {tree.map((node: unknown, index: number) => (
        <button 
          key={index} 
          data-testid={`org-node-${(node as { id: string }).id}`}
          onClick={() => onSelect(node)}
        >
          {(node as { display_name: string }).display_name}
        </button>
      ))}
    </div>
  ),
}))

vi.mock('@/components/organization/TeamMembersList', () => ({
  TeamMembersList: ({ organizationName }: { organizationName: string }) => (
    <div data-testid="team-members-list">{organizationName}</div>
  ),
}))

vi.mock('@/components/organization/CreateOrgDialog', () => ({
  CreateOrgDialog: ({ open }: { open: boolean }) => (
    open ? <div data-testid="create-org-dialog">CreateOrgDialog</div> : null
  ),
}))

vi.mock('@/components/organization/AddMemberDialog', () => ({
  AddMemberDialog: ({ open }: { open: boolean }) => (
    open ? <div data-testid="add-member-dialog">AddMemberDialog</div> : null
  ),
}))

vi.mock('@/components/organization/ChangeRoleDialog', () => ({
  ChangeRoleDialog: ({ open }: { open: boolean }) => (
    open ? <div data-testid="change-role-dialog">ChangeRoleDialog</div> : null
  ),
}))

describe('PersonsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUser = { id: 'test-user-id' }
    mockTree = []
    mockSelectedOrg = null
    mockMembers = []
    mockUserOrgInfo = { role: 'member' }
    mockIsLoading = false
    mockError = null
  })

  it('未登录时应该显示登录提示', async () => {
    mockUser = null

    renderWithRouter(<PersonsPage />)
    
    expect(screen.getByText('请先登录')).toBeInTheDocument()
  })

  it('应该渲染页面标题', async () => {
    renderWithRouter(<PersonsPage />)
    
    expect(screen.getByText('组织架构与人员管理')).toBeInTheDocument()
    expect(screen.getByText(/管理团队组织结构和成员信息/)).toBeInTheDocument()
  })

  it('应该显示组织树区域', async () => {
    renderWithRouter(<PersonsPage />)
    
    expect(screen.getByText('组织树')).toBeInTheDocument()
    expect(screen.getByTestId('org-tree')).toBeInTheDocument()
  })

  it('加载时应该显示加载状态', async () => {
    mockIsLoading = true
    mockTree = []

    renderWithRouter(<PersonsPage />)
    
    expect(screen.getByText('加载中...')).toBeInTheDocument()
  })

  it('有错误时应该显示错误信息', async () => {
    mockError = '加载组织信息失败'

    renderWithRouter(<PersonsPage />)
    
    expect(screen.getByText('加载组织信息失败')).toBeInTheDocument()
  })

  it('有组织树时应该显示组织节点', async () => {
    mockTree = [
      { id: 'org1', display_name: '研发部' },
      { id: 'org2', display_name: '产品部' },
    ]

    renderWithRouter(<PersonsPage />)
    
    await waitFor(() => {
      expect(screen.getByTestId('org-node-org1')).toBeInTheDocument()
      expect(screen.getByTestId('org-node-org2')).toBeInTheDocument()
    })
  })

  it('未选择组织时应该显示提示', async () => {
    mockSelectedOrg = null

    renderWithRouter(<PersonsPage />)
    
    expect(screen.getByText('请从左侧选择一个组织查看成员')).toBeInTheDocument()
  })

  it('选择组织后应该显示成员列表', async () => {
    mockSelectedOrg = { id: 'org1', display_name: '研发部' }

    renderWithRouter(<PersonsPage />)
    
    expect(screen.getByTestId('team-members-list')).toBeInTheDocument()
    expect(screen.getByText('研发部')).toBeInTheDocument()
  })

  it('管理员应该看到"创建组织"按钮', async () => {
    mockUserOrgInfo = { role: 'admin' }

    renderWithRouter(<PersonsPage />)
    
    expect(screen.getByRole('button', { name: /创建.*组织/ })).toBeInTheDocument()
  })

  it('非管理员不应该看到管理按钮', async () => {
    mockUserOrgInfo = { role: 'member' }

    renderWithRouter(<PersonsPage />)
    
    expect(screen.queryByRole('button', { name: /创建.*组织/ })).not.toBeInTheDocument()
  })

  it('管理员选择组织后应该看到编辑和删除按钮', async () => {
    mockUserOrgInfo = { role: 'admin' }
    mockSelectedOrg = { id: 'org1', display_name: '研发部' }

    renderWithRouter(<PersonsPage />)
    
    expect(screen.getByRole('button', { name: /编辑组织/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /删除组织/ })).toBeInTheDocument()
  })

  it('初始化时应该调用 loadTree 和 getUserOrgInfo', async () => {
    renderWithRouter(<PersonsPage />)
    
    await waitFor(() => {
      expect(mockLoadTree).toHaveBeenCalled()
      expect(mockGetUserOrgInfo).toHaveBeenCalledWith('test-user-id')
    })
  })
})

