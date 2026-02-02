/**
 * Supabase REST API Mock Handlers
 * 用于拦截 /supabase-proxy/rest/v1/* 和 https://*.supabase.co/rest/v1/* 请求
 */
import { http, HttpResponse, delay } from 'msw';
import { getRandomDelay } from '../data/mockConfig';

// URL 模式 - 同时支持开发代理和生产环境
const REST_URL_PATTERNS = {
  photos: [
    'http://localhost:5173/supabase-proxy/rest/v1/photos',
    'https://*.supabase.co/rest/v1/photos',
  ],
  albums: [
    'http://localhost:5173/supabase-proxy/rest/v1/albums',
    'https://*.supabase.co/rest/v1/albums',
  ],
  persons: [
    'http://localhost:5173/supabase-proxy/rest/v1/persons',
    'https://*.supabase.co/rest/v1/persons',
  ],
  profiles: [
    'http://localhost:5173/supabase-proxy/rest/v1/profiles',
    'https://*.supabase.co/rest/v1/profiles',
  ],
  organizations: [
    'http://localhost:5173/supabase-proxy/rest/v1/organizations',
    'https://*.supabase.co/rest/v1/organizations',
  ],
  ai_fusion_tasks: [
    'http://localhost:5173/supabase-proxy/rest/v1/ai_fusion_tasks',
    'https://*.supabase.co/rest/v1/ai_fusion_tasks',
  ],
};

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
];

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
];

const MOCK_PERSONS: Record<string, unknown>[] = [];

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
];

const MOCK_ORGANIZATIONS: Record<string, unknown>[] = [];

const MOCK_AI_FUSION_TASKS: Record<string, unknown>[] = [];

// 数据存储
const dataStore: Record<string, Record<string, unknown>[]> = {
  photos: [...MOCK_PHOTOS],
  albums: [...MOCK_ALBUMS],
  persons: [...MOCK_PERSONS],
  profiles: [...MOCK_PROFILES],
  organizations: [...MOCK_ORGANIZATIONS],
  ai_fusion_tasks: [...MOCK_AI_FUSION_TASKS],
};

// 通用 GET 处理器 - 支持 select, order, eq 等查询参数
const handleGet = (tableName: string) => async ({ request }: { request: Request }) => {
  await delay(getRandomDelay(100, 300));
  
  const url = new URL(request.url);
  const data = dataStore[tableName] || [];
  
  console.log(`[MSW REST] GET /${tableName}`, {
    select: url.searchParams.get('select'),
    order: url.searchParams.get('order'),
  });
  
  // 简单模拟排序
  const result = [...data];
  const order = url.searchParams.get('order');
  if (order) {
    const [field, direction] = order.split('.');
    result.sort((a, b) => {
      const aVal = a[field] as string | number | null;
      const bVal = b[field] as string | number | null;
      if (aVal === null) return direction === 'desc' ? 1 : -1;
      if (bVal === null) return direction === 'desc' ? -1 : 1;
      if (direction === 'desc') {
        return aVal < bVal ? 1 : -1;
      }
      return aVal > bVal ? 1 : -1;
    });
  }
  
  // 处理 count 请求
  const prefer = request.headers.get('Prefer');
  if (prefer?.includes('count=exact')) {
    return HttpResponse.json(result, {
      headers: {
        'Content-Range': `0-${result.length - 1}/${result.length}`,
      },
    });
  }
  
  return HttpResponse.json(result);
};

// 通用 POST 处理器 - 插入数据
const handlePost = (tableName: string) => async ({ request }: { request: Request }) => {
  await delay(getRandomDelay(100, 300));
  
  const body = await request.json() as Record<string, unknown>;
  const newRecord = {
    id: `mock-${tableName}-${Date.now()}`,
    ...body,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  
  dataStore[tableName] = dataStore[tableName] || [];
  dataStore[tableName].push(newRecord);
  
  console.log(`[MSW REST] POST /${tableName}`, newRecord);
  
  // 检查是否需要返回数据
  const prefer = request.headers.get('Prefer');
  if (prefer?.includes('return=representation')) {
    return HttpResponse.json([newRecord], { status: 201 });
  }
  
  return HttpResponse.json(null, { status: 201 });
};

// 通用 PATCH 处理器 - 更新数据
const handlePatch = (tableName: string) => async ({ request }: { request: Request }) => {
  await delay(getRandomDelay(100, 300));
  
  const url = new URL(request.url);
  const body = await request.json() as Record<string, unknown>;
  
  // 解析 eq 过滤条件
  const eqParams: Record<string, string> = {};
  url.searchParams.forEach((value, key) => {
    if (key.startsWith('id')) {
      eqParams['id'] = value.replace('eq.', '');
    }
  });
  
  const data = dataStore[tableName] || [];
  const index = data.findIndex(item => item.id === eqParams['id']);
  
  if (index !== -1) {
    data[index] = {
      ...data[index],
      ...body,
      updated_at: new Date().toISOString(),
    };
    console.log(`[MSW REST] PATCH /${tableName}`, data[index]);
  }
  
  return HttpResponse.json(null, { status: 204 });
};

// 通用 DELETE 处理器
const handleDelete = (tableName: string) => async ({ request }: { request: Request }) => {
  await delay(getRandomDelay(100, 300));
  
  const url = new URL(request.url);
  
  // 解析 eq 过滤条件
  let idToDelete: string | null = null;
  url.searchParams.forEach((value, key) => {
    if (key === 'id') {
      idToDelete = value.replace('eq.', '');
    }
  });
  
  if (idToDelete) {
    const data = dataStore[tableName] || [];
    const index = data.findIndex(item => item.id === idToDelete);
    if (index !== -1) {
      data.splice(index, 1);
      console.log(`[MSW REST] DELETE /${tableName}/${idToDelete}`);
    }
  }
  
  return HttpResponse.json(null, { status: 204 });
};

// 生成所有 handlers
export const supabaseRestHandlers = [
  // Photos
  ...REST_URL_PATTERNS.photos.flatMap(pattern => [
    http.get(pattern, handleGet('photos')),
    http.post(pattern, handlePost('photos')),
    http.patch(pattern, handlePatch('photos')),
    http.delete(pattern, handleDelete('photos')),
  ]),
  
  // Albums
  ...REST_URL_PATTERNS.albums.flatMap(pattern => [
    http.get(pattern, handleGet('albums')),
    http.post(pattern, handlePost('albums')),
    http.patch(pattern, handlePatch('albums')),
    http.delete(pattern, handleDelete('albums')),
  ]),
  
  // Persons
  ...REST_URL_PATTERNS.persons.flatMap(pattern => [
    http.get(pattern, handleGet('persons')),
    http.post(pattern, handlePost('persons')),
    http.patch(pattern, handlePatch('persons')),
    http.delete(pattern, handleDelete('persons')),
  ]),
  
  // Profiles
  ...REST_URL_PATTERNS.profiles.flatMap(pattern => [
    http.get(pattern, handleGet('profiles')),
    http.post(pattern, handlePost('profiles')),
    http.patch(pattern, handlePatch('profiles')),
    http.delete(pattern, handleDelete('profiles')),
  ]),
  
  // Organizations
  ...REST_URL_PATTERNS.organizations.flatMap(pattern => [
    http.get(pattern, handleGet('organizations')),
    http.post(pattern, handlePost('organizations')),
    http.patch(pattern, handlePatch('organizations')),
    http.delete(pattern, handleDelete('organizations')),
  ]),
  
  // AI Fusion Tasks
  ...REST_URL_PATTERNS.ai_fusion_tasks.flatMap(pattern => [
    http.get(pattern, handleGet('ai_fusion_tasks')),
    http.post(pattern, handlePost('ai_fusion_tasks')),
    http.patch(pattern, handlePatch('ai_fusion_tasks')),
    http.delete(pattern, handleDelete('ai_fusion_tasks')),
  ]),
];
