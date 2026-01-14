/**
 * Supabase 认证 API Mock Handlers
 * 用于 E2E 测试环境，模拟 Supabase 认证服务
 */
import { http, HttpResponse, delay } from 'msw';
import { getRandomDelay } from '../data/mockConfig';
import usersFixture from '../../../cypress/fixtures/users.json';

// 从 fixtures 获取测试用户凭证
const TEST_USER_EMAIL = usersFixture.testUser.email;
const TEST_USER_PWD = usersFixture.testUser.password;
const TEST_USER_DISPLAY_NAME = usersFixture.testUser.displayName;

// Mock 用户数据
const MOCK_USER = {
  id: 'test-user-id-12345',
  email: TEST_USER_EMAIL,
  aud: 'authenticated',
  role: 'authenticated',
  created_at: '2024-01-01T00:00:00.000Z',
  updated_at: '2024-01-01T00:00:00.000Z',
  user_metadata: {
    display_name: TEST_USER_DISPLAY_NAME,
  },
  app_metadata: {},
};

// Mock Access Token
const MOCK_ACCESS_TOKEN = 'mock-access-token-' + Date.now();
const MOCK_REFRESH_TOKEN = 'mock-refresh-token-' + Date.now();

// Mock Session
const MOCK_SESSION = {
  access_token: MOCK_ACCESS_TOKEN,
  refresh_token: MOCK_REFRESH_TOKEN,
  expires_in: 3600,
  expires_at: Date.now() / 1000 + 3600,
  token_type: 'bearer',
  user: MOCK_USER,
};

// 匹配开发环境代理和生产环境的 URL
const AUTH_URL_PATTERNS = {
  token: [
    'http://localhost:5173/supabase-proxy/auth/v1/token',
    'https://*.supabase.co/auth/v1/token',
  ],
  user: [
    'http://localhost:5173/supabase-proxy/auth/v1/user',
    'https://*.supabase.co/auth/v1/user',
  ],
  logout: [
    'http://localhost:5173/supabase-proxy/auth/v1/logout',
    'https://*.supabase.co/auth/v1/logout',
  ],
  signup: [
    'http://localhost:5173/supabase-proxy/auth/v1/signup',
    'https://*.supabase.co/auth/v1/signup',
  ],
};

// 创建处理函数
const handleTokenRequest = async (request: Request) => {
  await delay(getRandomDelay(300, 800));

  const url = new URL(request.url);
  const grantType = url.searchParams.get('grant_type');

  // 处理 refresh_token
  if (grantType === 'refresh_token') {
    const body = await request.json() as { refresh_token: string };

    if (body.refresh_token && body.refresh_token.startsWith('mock-refresh-token-')) {
      console.log('[MSW Auth] ✅ Token 刷新成功');
      
      const newSession = {
        ...MOCK_SESSION,
        access_token: 'mock-access-token-' + Date.now(),
        refresh_token: 'mock-refresh-token-' + Date.now(),
      };

      return HttpResponse.json(newSession, { status: 200 });
    }

    console.log('[MSW Auth] ❌ Refresh token 无效');
    return HttpResponse.json(
      { error: 'invalid_grant', error_description: 'Invalid refresh token' },
      { status: 400 }
    );
  }

  // 处理密码登录
  if (grantType !== 'password') {
    return HttpResponse.json(
      { error: 'unsupported_grant_type', error_description: 'Grant type not supported' },
      { status: 400 }
    );
  }

  const body = await request.json() as { email: string; password: string };

  if (body.email === TEST_USER_EMAIL && body.password === TEST_USER_PWD) {
    console.log('[MSW Auth] ✅ 登录成功:', body.email);
    return HttpResponse.json(MOCK_SESSION, { status: 200 });
  }

  console.log('[MSW Auth] ❌ 登录失败:', body.email);
  return HttpResponse.json(
    {
      error: 'invalid_grant',
      error_description: 'Invalid login credentials',
    },
    { status: 400 }
  );
};

const handleGetUser = async (request: Request) => {
  await delay(getRandomDelay(100, 300));

  const authHeader = request.headers.get('Authorization');

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return HttpResponse.json(
      { error: 'unauthorized', error_description: 'Missing or invalid authorization header' },
      { status: 401 }
    );
  }

  const token = authHeader.replace('Bearer ', '');

  if (token.startsWith('mock-access-token-')) {
    console.log('[MSW Auth] ✅ 获取用户信息成功');
    return HttpResponse.json(MOCK_USER, { status: 200 });
  }

  console.log('[MSW Auth] ❌ Token 无效');
  return HttpResponse.json(
    { error: 'invalid_token', error_description: 'Invalid access token' },
    { status: 401 }
  );
};

const handleLogout = async () => {
  await delay(getRandomDelay(100, 300));
  console.log('[MSW Auth] ✅ 登出成功');
  return HttpResponse.json({}, { status: 204 });
};

const handleSignup = async (request: Request) => {
  await delay(getRandomDelay(500, 1000));

  const body = await request.json() as { email: string; password: string; data?: Record<string, unknown> };

  const newUser = {
    ...MOCK_USER,
    id: 'new-user-' + Date.now(),
    email: body.email,
    user_metadata: body.data || {},
  };

  const newSession = {
    ...MOCK_SESSION,
    user: newUser,
  };

  console.log('[MSW Auth] ✅ 注册成功:', body.email);
  return HttpResponse.json(newSession, { status: 200 });
};

/**
 * 认证相关的 MSW Handlers
 * 同时支持开发环境代理 (localhost:5173/supabase-proxy) 和生产环境 (*.supabase.co)
 */
export const authHandlers = [
  // Token handlers (login & refresh)
  ...AUTH_URL_PATTERNS.token.map(pattern => 
    http.post(pattern, async ({ request }) => handleTokenRequest(request))
  ),

  // Get user handlers
  ...AUTH_URL_PATTERNS.user.map(pattern =>
    http.get(pattern, async ({ request }) => handleGetUser(request))
  ),

  // Logout handlers
  ...AUTH_URL_PATTERNS.logout.map(pattern =>
    http.post(pattern, async () => handleLogout())
  ),

  // Signup handlers
  ...AUTH_URL_PATTERNS.signup.map(pattern =>
    http.post(pattern, async ({ request }) => handleSignup(request))
  ),
];
