/**
 * skills-publish Edge Function
 * 处理 Skill 发布和版本上传
 */

import { createClient } from 'npm:@supabase/supabase-js@2'

interface PublishRequest {
  action: 'create' | 'update' | 'publish_version'
  skill_id?: string
  name?: string
  description?: string
  tags?: string[]
  platforms?: string[]
  visibility?: 'draft' | 'public' | 'private'
  version?: string
  changelog?: string
  file_size?: number
  readme?: string
}

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// 输入校验函数
function validateName(name: string | undefined): { valid: boolean; error?: string } {
  if (!name || typeof name !== 'string') {
    return { valid: false, error: '名称不能为空' }
  }
  const trimmed = name.trim()
  if (trimmed.length < 3) {
    return { valid: false, error: '名称至少需要 3 个字符' }
  }
  if (trimmed.length > 50) {
    return { valid: false, error: '名称不能超过 50 个字符' }
  }
  // 检查危险字符
  if (/<[^>]*>/.test(trimmed)) {
    return { valid: false, error: '名称不能包含 HTML 标签' }
  }
  return { valid: true }
}

function validateDescription(description: string | undefined): { valid: boolean; error?: string } {
  if (!description || typeof description !== 'string') {
    return { valid: false, error: '描述不能为空' }
  }
  const trimmed = description.trim()
  if (trimmed.length < 10) {
    return { valid: false, error: '描述至少需要 10 个字符' }
  }
  if (trimmed.length > 500) {
    return { valid: false, error: '描述不能超过 500 个字符' }
  }
  return { valid: true }
}

function validateTags(tags: string[] | undefined): { valid: boolean; error?: string } {
  if (!tags) return { valid: true }
  if (!Array.isArray(tags)) {
    return { valid: false, error: '标签格式错误' }
  }
  if (tags.length > 10) {
    return { valid: false, error: '最多 10 个标签' }
  }
  for (const tag of tags) {
    if (typeof tag !== 'string' || tag.length > 30) {
      return { valid: false, error: '标签长度不能超过 30 个字符' }
    }
    // 只允许字母、数字、连字符、中文
    if (!/^[a-zA-Z0-9\u4e00-\u9fa5-]+$/.test(tag)) {
      return { valid: false, error: `标签 "${tag}" 包含非法字符` }
    }
  }
  return { valid: true }
}

function validateVersion(version: string | undefined): { valid: boolean; error?: string } {
  if (!version || typeof version !== 'string') {
    return { valid: false, error: '版本号不能为空' }
  }
  if (!/^\d+\.\d+\.\d+$/.test(version)) {
    return { valid: false, error: '版本号格式错误，请使用 x.y.z 格式' }
  }
  return { valid: true }
}

function sanitizeString(str: string): string {
  // 移除潜在的 HTML 标签
  return str.replace(/<[^>]*>/g, '').trim()
}

function generateSlug(name: string): string {
  const base = name
    .toLowerCase()
    .replace(/[\u4e00-\u9fa5]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
  const suffix = Math.random().toString(36).substring(2, 7)
  return base ? `${base}-${suffix}` : `skill-${suffix}`
}

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Create Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    )

    // Get user
    const {
      data: { user },
      error: userError,
    } = await supabaseClient.auth.getUser()

    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Parse request body
    const body: PublishRequest = await req.json()

    switch (body.action) {
      case 'create':
        return handleCreate(supabaseClient, user.id, body)
      case 'update':
        return handleUpdate(supabaseClient, user.id, body)
      case 'publish_version':
        return handlePublishVersion(supabaseClient, user.id, body)
      default:
        return new Response(JSON.stringify({ error: 'Invalid action' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
    }
  } catch (error) {
    console.error('Error:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})

async function handleCreate(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  body: PublishRequest
) {
  // 输入校验
  const nameValidation = validateName(body.name)
  if (!nameValidation.valid) {
    return new Response(JSON.stringify({ error: nameValidation.error }), {
      status: 400,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    })
  }

  const descValidation = validateDescription(body.description)
  if (!descValidation.valid) {
    return new Response(JSON.stringify({ error: descValidation.error }), {
      status: 400,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    })
  }

  const tagsValidation = validateTags(body.tags)
  if (!tagsValidation.valid) {
    return new Response(JSON.stringify({ error: tagsValidation.error }), {
      status: 400,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    })
  }

  // 清理输入
  const sanitizedName = sanitizeString(body.name!)
  const sanitizedDescription = sanitizeString(body.description!)
  const sanitizedTags = body.tags?.map((t) => sanitizeString(t)) || []
  const sanitizedReadme = body.readme ? sanitizeString(body.readme) : null

  const { data, error } = await supabase
    .from('skills')
    .insert({
      author_id: userId,
      name: sanitizedName,
      slug: generateSlug(sanitizedName),
      description: sanitizedDescription,
      tags: sanitizedTags,
      platforms: body.platforms || [],
      visibility: body.visibility || 'draft',
      readme: sanitizedReadme,
    })
    .select()
    .single()

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    })
  }

  return new Response(JSON.stringify({ success: true, skill: data }), {
    headers: { 'Content-Type': 'application/json', ...corsHeaders },
  })
}

async function handleUpdate(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  body: PublishRequest
) {
  // Verify ownership
  const { data: skill } = await supabase
    .from('skills')
    .select('author_id')
    .eq('id', body.skill_id)
    .single()

  if (!skill || skill.author_id !== userId) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    })
  }

  // 输入校验
  if (body.name !== undefined) {
    const nameValidation = validateName(body.name)
    if (!nameValidation.valid) {
      return new Response(JSON.stringify({ error: nameValidation.error }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      })
    }
  }

  if (body.description !== undefined) {
    const descValidation = validateDescription(body.description)
    if (!descValidation.valid) {
      return new Response(JSON.stringify({ error: descValidation.error }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      })
    }
  }

  const tagsValidation = validateTags(body.tags)
  if (!tagsValidation.valid) {
    return new Response(JSON.stringify({ error: tagsValidation.error }), {
      status: 400,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    })
  }

  // 构建更新对象（只更新提供的字段）
  const updates: Record<string, unknown> = {}
  if (body.name !== undefined) updates.name = sanitizeString(body.name)
  if (body.description !== undefined) updates.description = sanitizeString(body.description)
  if (body.tags !== undefined) updates.tags = body.tags.map((t) => sanitizeString(t))
  if (body.platforms !== undefined) updates.platforms = body.platforms
  if (body.visibility !== undefined) updates.visibility = body.visibility
  if (body.readme !== undefined) updates.readme = sanitizeString(body.readme)

  const { data, error } = await supabase
    .from('skills')
    .update(updates)
    .eq('id', body.skill_id)
    .select()
    .single()

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    })
  }

  return new Response(JSON.stringify({ success: true, skill: data }), {
    headers: { 'Content-Type': 'application/json', ...corsHeaders },
  })
}

async function handlePublishVersion(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  body: PublishRequest
) {
  // 输入校验
  const versionValidation = validateVersion(body.version)
  if (!versionValidation.valid) {
    return new Response(JSON.stringify({ error: versionValidation.error }), {
      status: 400,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    })
  }

  // Verify ownership
  const { data: skill } = await supabase
    .from('skills')
    .select('author_id, slug')
    .eq('id', body.skill_id)
    .single()

  if (!skill || skill.author_id !== userId) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    })
  }

  // Generate storage path
  const storagePath = `${userId}/${skill.slug}/${body.version}/package.zip`

  // Create version record
  const { data: versionData, error: versionError } = await supabase
    .from('skill_versions')
    .insert({
      skill_id: body.skill_id,
      version: body.version,
      storage_path: storagePath,
      file_size: body.file_size,
      changelog: body.changelog ? sanitizeString(body.changelog) : null,
    })
    .select()
    .single()

  if (versionError) {
    return new Response(JSON.stringify({ error: versionError.message }), {
      status: 400,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    })
  }

  // Generate signed upload URL
  const { data: uploadData, error: uploadError } = await supabase.storage
    .from('skills')
    .createSignedUploadUrl(storagePath)

  if (uploadError) {
    return new Response(JSON.stringify({ error: uploadError.message }), {
      status: 400,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    })
  }

  // Update skill's latest_version
  await supabase.from('skills').update({ latest_version: body.version }).eq('id', body.skill_id)

  return new Response(
    JSON.stringify({
      success: true,
      version: versionData,
      upload_url: uploadData.signedUrl,
      storage_path: storagePath,
    }),
    { headers: { 'Content-Type': 'application/json', ...corsHeaders } }
  )
}
