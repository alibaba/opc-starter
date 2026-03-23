/**
 * Supabase REST API Mock Handlers
 * 用于拦截 /supabase-proxy/rest/v1/* 和 https://*.supabase.co/rest/v1/* 请求
 */
import { http, HttpResponse, delay } from 'msw'
import { getRandomDelay } from '../data/mockConfig'

// URL 模式 - 同时支持开发代理和生产环境
// 使用正则表达式匹配任意端口
const REST_URL_PATTERNS = {
  photos: [
    /http:\/\/localhost:\d+\/supabase-proxy\/rest\/v1\/photos/,
    'https://*.supabase.co/rest/v1/photos',
  ],
  albums: [
    /http:\/\/localhost:\d+\/supabase-proxy\/rest\/v1\/albums/,
    'https://*.supabase.co/rest/v1/albums',
  ],
  persons: [
    /http:\/\/localhost:\d+\/supabase-proxy\/rest\/v1\/persons/,
    'https://*.supabase.co/rest/v1/persons',
  ],
  profiles: [
    /http:\/\/localhost:\d+\/supabase-proxy\/rest\/v1\/profiles/,
    'https://*.supabase.co/rest/v1/profiles',
  ],
  organizations: [
    /http:\/\/localhost:\d+\/supabase-proxy\/rest\/v1\/organizations/,
    'https://*.supabase.co/rest/v1/organizations',
  ],
  ai_fusion_tasks: [
    /http:\/\/localhost:\d+\/supabase-proxy\/rest\/v1\/ai_fusion_tasks/,
    'https://*.supabase.co/rest/v1/ai_fusion_tasks',
  ],
  skills: [
    /http:\/\/localhost:\d+\/supabase-proxy\/rest\/v1\/skills/,
    'https://*.supabase.co/rest/v1/skills',
  ],
  skill_versions: [
    /http:\/\/localhost:\d+\/supabase-proxy\/rest\/v1\/skill_versions/,
    'https://*.supabase.co/rest/v1/skill_versions',
  ],
  skill_likes: [
    /http:\/\/localhost:\d+\/supabase-proxy\/rest\/v1\/skill_likes/,
    'https://*.supabase.co/rest/v1/skill_likes',
  ],
  skill_favorites: [
    /http:\/\/localhost:\d+\/supabase-proxy\/rest\/v1\/skill_favorites/,
    'https://*.supabase.co/rest/v1/skill_favorites',
  ],
  skill_installs: [
    /http:\/\/localhost:\d+\/supabase-proxy\/rest\/v1\/skill_installs/,
    'https://*.supabase.co/rest/v1/skill_installs',
  ],
}

// Mock 数据
const MOCK_PHOTOS: Record<string, unknown>[] = [
  {
    id: 'mock-photo-1',
    user_id: 'test-user-id-12345',
    oss_url: 'https://placeholder.com/photo1.jpg',
    oss_key: 'photos/photo1.jpg',
    taken_at: '2024-01-15T10:30:00.000Z',
    created_at: '2024-01-15T10:30:00.000Z',
    updated_at: '2024-01-15T10:30:00.000Z',
    title: '测试照片 1',
    description: '这是一张测试照片',
    tags: ['测试', '示例'],
    participants: [],
    metadata: { width: 1920, height: 1080 },
  },
  {
    id: 'mock-photo-2',
    user_id: 'test-user-id-12345',
    oss_url: 'https://placeholder.com/photo2.jpg',
    oss_key: 'photos/photo2.jpg',
    taken_at: '2024-01-16T14:20:00.000Z',
    created_at: '2024-01-16T14:20:00.000Z',
    updated_at: '2024-01-16T14:20:00.000Z',
    title: '测试照片 2',
    description: '另一张测试照片',
    tags: ['测试'],
    participants: [],
    metadata: { width: 1280, height: 720 },
  },
]

const MOCK_ALBUMS: Record<string, unknown>[] = [
  {
    id: 'mock-album-1',
    user_id: 'test-user-id-12345',
    title: '默认相册',
    description: '系统默认相册',
    cover_photo_id: 'mock-photo-1',
    photo_ids: ['mock-photo-1', 'mock-photo-2'],
    created_at: '2024-01-01T00:00:00.000Z',
    updated_at: '2024-01-16T14:20:00.000Z',
  },
]

const MOCK_PERSONS: Record<string, unknown>[] = []

const MOCK_PROFILES: Record<string, unknown>[] = [
  {
    id: 'test-user-id-12345',
    email: 'test@example.com',
    display_name: '测试用户',
    avatar_url: null,
    role: 'user',
    organization_id: null,
    is_active: true,
    created_at: '2024-01-01T00:00:00.000Z',
    updated_at: '2024-01-01T00:00:00.000Z',
  },
]

const MOCK_ORGANIZATIONS: Record<string, unknown>[] = []

const MOCK_AI_FUSION_TASKS: Record<string, unknown>[] = []

// Skills Hub mock 数据
const MOCK_SKILLS: Record<string, unknown>[] = [
  {
    id: 'mock-skill-1',
    author_id: 'test-user-id-12345',
    name: 'React Best Practices',
    slug: 'react-best-practices',
    description: '一个包含 React 开发最佳实践的 Skill，适用于 Qoder 和 Cursor。',
    readme: '## React Best Practices\n\n本 Skill 包含常见的 React 开发规范和最佳实践。',
    visibility: 'public',
    tags: ['react', 'typescript', 'best-practices'],
    platforms: ['qoder', 'cursor'],
    latest_version: '1.0.0',
    downloads_count: 42,
    likes_count: 12,
    favorites_count: 8,
    created_at: '2026-03-01T00:00:00.000Z',
    updated_at: '2026-03-15T00:00:00.000Z',
    published_at: '2026-03-01T00:00:00.000Z',
    author: {
      id: 'test-user-id-12345',
      full_name: '测试用户',
      avatar_url: null,
    },
  },
  {
    id: 'mock-skill-2',
    author_id: 'test-user-id-12345',
    name: 'TypeScript Strict Mode',
    slug: 'typescript-strict-mode',
    description: '严格 TypeScript 配置和类型安全规范，适合大型项目。',
    readme: '## TypeScript Strict Mode\n\n本 Skill 启用所有 TypeScript 严格检查。',
    visibility: 'public',
    tags: ['typescript', 'strict', 'types'],
    platforms: ['qoder', 'cursor', 'windsurf'],
    latest_version: '2.1.0',
    downloads_count: 88,
    likes_count: 31,
    favorites_count: 15,
    created_at: '2026-02-15T00:00:00.000Z',
    updated_at: '2026-03-10T00:00:00.000Z',
    published_at: '2026-02-15T00:00:00.000Z',
    author: {
      id: 'test-user-id-12345',
      full_name: '测试用户',
      avatar_url: null,
    },
  },
]

const MOCK_SKILL_VERSIONS: Record<string, unknown>[] = [
  {
    id: 'mock-version-1',
    skill_id: 'mock-skill-1',
    version: '1.0.0',
    storage_path: 'test-user-id-12345/react-best-practices/1.0.0/package.zip',
    file_size: 12345,
    file_hash: 'sha256:abc123',
    readme: null,
    changelog: '初始版本发布',
    metadata: {},
    created_at: '2026-03-01T00:00:00.000Z',
  },
  {
    id: 'mock-version-2',
    skill_id: 'mock-skill-2',
    version: '2.1.0',
    storage_path: 'test-user-id-12345/typescript-strict-mode/2.1.0/package.zip',
    file_size: 8192,
    file_hash: 'sha256:def456',
    readme: null,
    changelog: '新增更多严格类型检查规则',
    metadata: {},
    created_at: '2026-03-10T00:00:00.000Z',
  },
]

const MOCK_SKILL_LIKES: Record<string, unknown>[] = []
const MOCK_SKILL_FAVORITES: Record<string, unknown>[] = []
const MOCK_SKILL_INSTALLS: Record<string, unknown>[] = []

// 数据存储
const dataStore: Record<string, Record<string, unknown>[]> = {
  photos: [...MOCK_PHOTOS],
  albums: [...MOCK_ALBUMS],
  persons: [...MOCK_PERSONS],
  profiles: [...MOCK_PROFILES],
  organizations: [...MOCK_ORGANIZATIONS],
  ai_fusion_tasks: [...MOCK_AI_FUSION_TASKS],
  skills: [...MOCK_SKILLS],
  skill_versions: [...MOCK_SKILL_VERSIONS],
  skill_likes: [...MOCK_SKILL_LIKES],
  skill_favorites: [...MOCK_SKILL_FAVORITES],
  skill_installs: [...MOCK_SKILL_INSTALLS],
}

// 通用 GET 处理器 - 支持 select, order, eq, single 等查询参数
const handleGet =
  (tableName: string) =>
  async ({ request }: { request: Request }) => {
    await delay(getRandomDelay(100, 300))

    const url = new URL(request.url)
    const data = dataStore[tableName] || []

    console.log(`[MSW REST] GET /${tableName}`, {
      select: url.searchParams.get('select'),
      order: url.searchParams.get('order'),
    })

    // 处理 eq 过滤条件
    let result = [...data]
    url.searchParams.forEach((value, key) => {
      if (value.startsWith('eq.')) {
        const filterValue = value.replace('eq.', '')
        result = result.filter((item) => item[key] === filterValue)
      }
    })

    // 简单模拟排序
    const order = url.searchParams.get('order')
    if (order) {
      const [field, direction] = order.split('.')
      result.sort((a, b) => {
        const aVal = a[field] as string | number | null
        const bVal = b[field] as string | number | null
        if (aVal === null) return direction === 'desc' ? 1 : -1
        if (bVal === null) return direction === 'desc' ? -1 : 1
        if (direction === 'desc') {
          return aVal < bVal ? 1 : -1
        }
        return aVal > bVal ? 1 : -1
      })
    }

    // 处理 count 请求
    const prefer = request.headers.get('Prefer')
    if (prefer?.includes('count=exact')) {
      return HttpResponse.json(result, {
        headers: {
          'Content-Range': `0-${result.length - 1}/${result.length}`,
        },
      })
    }

    // 处理 .single() 请求 - 返回单个对象或错误
    const accept = request.headers.get('Accept') || ''
    if (
      prefer?.includes('return=representation') ||
      accept.includes('application/vnd.pgrst.object+json')
    ) {
      if (result.length === 0) {
        // 返回 PGRST116 错误（未找到）
        return HttpResponse.json(
          {
            code: 'PGRST116',
            details: 'No rows found',
            hint: null,
            message: 'JSON object requested, multiple (or no) rows returned',
          },
          { status: 406 }
        )
      }
      return HttpResponse.json(result[0])
    }

    return HttpResponse.json(result)
  }

// 通用 POST 处理器 - 插入数据
const handlePost =
  (tableName: string) =>
  async ({ request }: { request: Request }) => {
    await delay(getRandomDelay(100, 300))

    const body = (await request.json()) as Record<string, unknown>
    const newRecord = {
      id: `mock-${tableName}-${Date.now()}`,
      ...body,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    dataStore[tableName] = dataStore[tableName] || []
    dataStore[tableName].push(newRecord)

    console.log(`[MSW REST] POST /${tableName}`, newRecord)

    // 检查是否需要返回数据
    const prefer = request.headers.get('Prefer')
    if (prefer?.includes('return=representation')) {
      return HttpResponse.json([newRecord], { status: 201 })
    }

    return HttpResponse.json(null, { status: 201 })
  }

// 通用 PATCH 处理器 - 更新数据
const handlePatch =
  (tableName: string) =>
  async ({ request }: { request: Request }) => {
    await delay(getRandomDelay(100, 300))

    const url = new URL(request.url)
    const body = (await request.json()) as Record<string, unknown>

    // 解析 eq 过滤条件
    const eqParams: Record<string, string> = {}
    url.searchParams.forEach((value, key) => {
      if (key.startsWith('id')) {
        eqParams['id'] = value.replace('eq.', '')
      }
    })

    const data = dataStore[tableName] || []
    const index = data.findIndex((item) => item.id === eqParams['id'])

    if (index !== -1) {
      data[index] = {
        ...data[index],
        ...body,
        updated_at: new Date().toISOString(),
      }
      console.log(`[MSW REST] PATCH /${tableName}`, data[index])
    }

    return HttpResponse.json(null, { status: 204 })
  }

// 通用 DELETE 处理器
const handleDelete =
  (tableName: string) =>
  async ({ request }: { request: Request }) => {
    await delay(getRandomDelay(100, 300))

    const url = new URL(request.url)

    // 解析 eq 过滤条件
    let idToDelete: string | null = null
    url.searchParams.forEach((value, key) => {
      if (key === 'id') {
        idToDelete = value.replace('eq.', '')
      }
    })

    if (idToDelete) {
      const data = dataStore[tableName] || []
      const index = data.findIndex((item) => item.id === idToDelete)
      if (index !== -1) {
        data.splice(index, 1)
        console.log(`[MSW REST] DELETE /${tableName}/${idToDelete}`)
      }
    }

    return HttpResponse.json(null, { status: 204 })
  }

// 生成所有 handlers
export const supabaseRestHandlers = [
  // Photos
  ...REST_URL_PATTERNS.photos.flatMap((pattern) => [
    http.get(pattern, handleGet('photos')),
    http.post(pattern, handlePost('photos')),
    http.patch(pattern, handlePatch('photos')),
    http.delete(pattern, handleDelete('photos')),
  ]),

  // Albums
  ...REST_URL_PATTERNS.albums.flatMap((pattern) => [
    http.get(pattern, handleGet('albums')),
    http.post(pattern, handlePost('albums')),
    http.patch(pattern, handlePatch('albums')),
    http.delete(pattern, handleDelete('albums')),
  ]),

  // Persons
  ...REST_URL_PATTERNS.persons.flatMap((pattern) => [
    http.get(pattern, handleGet('persons')),
    http.post(pattern, handlePost('persons')),
    http.patch(pattern, handlePatch('persons')),
    http.delete(pattern, handleDelete('persons')),
  ]),

  // Profiles
  ...REST_URL_PATTERNS.profiles.flatMap((pattern) => [
    http.get(pattern, handleGet('profiles')),
    http.post(pattern, handlePost('profiles')),
    http.patch(pattern, handlePatch('profiles')),
    http.delete(pattern, handleDelete('profiles')),
  ]),

  // Organizations
  ...REST_URL_PATTERNS.organizations.flatMap((pattern) => [
    http.get(pattern, handleGet('organizations')),
    http.post(pattern, handlePost('organizations')),
    http.patch(pattern, handlePatch('organizations')),
    http.delete(pattern, handleDelete('organizations')),
  ]),

  // AI Fusion Tasks
  ...REST_URL_PATTERNS.ai_fusion_tasks.flatMap((pattern) => [
    http.get(pattern, handleGet('ai_fusion_tasks')),
    http.post(pattern, handlePost('ai_fusion_tasks')),
    http.patch(pattern, handlePatch('ai_fusion_tasks')),
    http.delete(pattern, handleDelete('ai_fusion_tasks')),
  ]),

  // Skills
  ...REST_URL_PATTERNS.skills.flatMap((pattern) => [
    http.get(pattern, handleGet('skills')),
    http.post(pattern, handlePost('skills')),
    http.patch(pattern, handlePatch('skills')),
    http.delete(pattern, handleDelete('skills')),
  ]),

  // Skill Versions
  ...REST_URL_PATTERNS.skill_versions.flatMap((pattern) => [
    http.get(pattern, handleGet('skill_versions')),
    http.post(pattern, handlePost('skill_versions')),
    http.delete(pattern, handleDelete('skill_versions')),
  ]),

  // Skill Likes
  ...REST_URL_PATTERNS.skill_likes.flatMap((pattern) => [
    http.get(pattern, handleGet('skill_likes')),
    http.post(pattern, handlePost('skill_likes')),
    http.delete(pattern, handleDelete('skill_likes')),
  ]),

  // Skill Favorites
  ...REST_URL_PATTERNS.skill_favorites.flatMap((pattern) => [
    http.get(pattern, handleGet('skill_favorites')),
    http.post(pattern, handlePost('skill_favorites')),
    http.delete(pattern, handleDelete('skill_favorites')),
  ]),

  // Skill Installs
  ...REST_URL_PATTERNS.skill_installs.flatMap((pattern) => [
    http.get(pattern, handleGet('skill_installs')),
    http.post(pattern, handlePost('skill_installs')),
  ]),
]
