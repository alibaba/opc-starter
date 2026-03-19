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
}

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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
  const { data, error } = await supabase
    .from('skills')
    .insert({
      author_id: userId,
      name: body.name,
      description: body.description,
      tags: body.tags || [],
      platforms: body.platforms || [],
      visibility: body.visibility || 'draft',
    })
    .select()
    .single()

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
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
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const { data, error } = await supabase
    .from('skills')
    .update({
      name: body.name,
      description: body.description,
      tags: body.tags,
      platforms: body.platforms,
      visibility: body.visibility,
    })
    .eq('id', body.skill_id)
    .select()
    .single()

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
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
  // Verify ownership
  const { data: skill } = await supabase
    .from('skills')
    .select('author_id, slug')
    .eq('id', body.skill_id)
    .single()

  if (!skill || skill.author_id !== userId) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
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
      changelog: body.changelog,
    })
    .select()
    .single()

  if (versionError) {
    return new Response(JSON.stringify({ error: versionError.message }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  // Generate signed upload URL
  const { data: uploadData, error: uploadError } = await supabase.storage
    .from('skills')
    .createSignedUploadUrl(storagePath)

  if (uploadError) {
    return new Response(JSON.stringify({ error: uploadError.message }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
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
