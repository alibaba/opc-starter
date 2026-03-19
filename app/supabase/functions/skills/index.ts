// 技能管理 Edge Function
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const supabase = createClient(supabaseUrl, supabaseServiceKey)

interface Skill {
  id?: string
  title: string
  description: string
  category: string
  tags: string[]
  price: number
  version?: string
  status?: 'draft' | 'published' | 'archived'
}

interface Pagination {
  page?: number
  limit?: number
  category?: string
  search?: string
}

serve(async (req) => {
  const { method } = req
  const url = new URL(req.url)
  const pathParts = url.pathname.split('/').filter(Boolean)

  // CORS headers
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Authorization, Content-Type',
  }

  if (method === 'OPTIONS') {
    return new Response(null, { status: 204, headers })
  }

  try {
    // 获取认证用户
    const authHeader = req.headers.get('Authorization')
    const token = authHeader?.replace('Bearer ', '')

    let userId = null
    if (token) {
      const {
        data: { user },
      } = await supabase.auth.getUser(token)
      userId = user?.id
    }

    // 路由处理
    switch (method) {
      case 'GET':
        if (pathParts[1]) {
          // 获取单个技能详情
          return await getSkill(pathParts[1], userId)
        } else {
          // 获取技能列表
          const params: Pagination = {
            page: parseInt(url.searchParams.get('page') || '1'),
            limit: parseInt(url.searchParams.get('limit') || '20'),
            category: url.searchParams.get('category') || undefined,
            search: url.searchParams.get('search') || undefined,
          }
          return await getSkills(params, userId)
        }

      case 'POST': {
        if (!userId) {
          return new Response(JSON.stringify({ error: 'Authentication required' }), {
            status: 401,
            headers,
          })
        }
        const skillData = (await req.json()) as Skill
        return await createSkill(skillData, userId)
      }

      case 'PUT': {
        if (!userId) {
          return new Response(JSON.stringify({ error: 'Authentication required' }), {
            status: 401,
            headers,
          })
        }
        if (!pathParts[1]) {
          return new Response(JSON.stringify({ error: 'Skill ID required' }), {
            status: 400,
            headers,
          })
        }
        const updateData = (await req.json()) as Partial<Skill>
        return await updateSkill(pathParts[1], updateData, userId)
      }

      case 'DELETE':
        if (!userId) {
          return new Response(JSON.stringify({ error: 'Authentication required' }), {
            status: 401,
            headers,
          })
        }
        if (!pathParts[1]) {
          return new Response(JSON.stringify({ error: 'Skill ID required' }), {
            status: 400,
            headers,
          })
        }
        return await deleteSkill(pathParts[1], userId)

      default:
        return new Response(JSON.stringify({ error: 'Method not allowed' }), {
          status: 405,
          headers,
        })
    }
  } catch (error) {
    console.error('Error:', error)
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers,
    })
  }
})

async function getSkills(params: Pagination, userId: string | null) {
  // userId 参数保留用于未来扩展（如个性化推荐）
  void userId
  const { page = 1, limit = 20, category, search } = params
  const offset = (page - 1) * limit

  let query = supabase
    .from('skills')
    .select(
      `
      *,
      creator:creator_id (
        id,
        username,
        avatar_url
      )
    `
    )
    .eq('status', 'published')
    .order('created_at', { ascending: false })

  if (category) {
    query = query.eq('category', category)
  }

  if (search) {
    query = query.or(`title.ilike.%${search}%,description.ilike.%${search}%`)
  }

  const { data, error, count } = await query.range(offset, offset + limit - 1)

  if (error) throw error

  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
  }

  return new Response(
    JSON.stringify({
      success: true,
      data: data,
      pagination: {
        page,
        limit,
        total: count,
        totalPages: Math.ceil((count || 0) / limit),
      },
    }),
    { status: 200, headers }
  )
}

async function getSkill(skillId: string, userId: string | null) {
  const { data, error } = await supabase
    .from('skills')
    .select(
      `
      *,
      creator:creator_id (
        id,
        username,
        avatar_url
      ),
      skill_reviews (
        *,
        user:user_id (
          id,
          username,
          avatar_url
        )
      )
    `
    )
    .eq('id', skillId)
    .eq('status', 'published')
    .single()

  if (error) {
    return new Response(JSON.stringify({ error: 'Skill not found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  // 获取是否已收藏
  let isFavorited = false
  if (userId) {
    const { data: favorite } = await supabase
      .from('user_favorites')
      .select('id')
      .eq('user_id', userId)
      .eq('skill_id', skillId)
      .single()
    isFavorited = !!favorite
  }

  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
  }

  return new Response(
    JSON.stringify({
      success: true,
      data: {
        ...data,
        is_favorited: isFavorited,
      },
    }),
    { status: 200, headers }
  )
}

async function createSkill(skillData: Skill, userId: string) {
  const { data, error } = await supabase
    .from('skills')
    .insert({
      ...skillData,
      creator_id: userId,
      status: 'draft',
    })
    .select()
    .single()

  if (error) throw error

  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
  }

  return new Response(
    JSON.stringify({
      success: true,
      data,
      message: 'Skill created successfully',
    }),
    { status: 201, headers }
  )
}

async function updateSkill(skillId: string, updateData: Partial<Skill>, userId: string) {
  // 验证权限
  const { data: existingSkill } = await supabase
    .from('skills')
    .select('creator_id')
    .eq('id', skillId)
    .single()

  if (!existingSkill || existingSkill.creator_id !== userId) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const { data, error } = await supabase
    .from('skills')
    .update(updateData)
    .eq('id', skillId)
    .select()
    .single()

  if (error) throw error

  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
  }

  return new Response(
    JSON.stringify({
      success: true,
      data,
      message: 'Skill updated successfully',
    }),
    { status: 200, headers }
  )
}

async function deleteSkill(skillId: string, userId: string) {
  // 验证权限
  const { data: existingSkill } = await supabase
    .from('skills')
    .select('creator_id')
    .eq('id', skillId)
    .single()

  if (!existingSkill || existingSkill.creator_id !== userId) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const { error } = await supabase.from('skills').delete().eq('id', skillId)

  if (error) throw error

  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
  }

  return new Response(
    JSON.stringify({
      success: true,
      message: 'Skill deleted successfully',
    }),
    { status: 200, headers }
  )
}
