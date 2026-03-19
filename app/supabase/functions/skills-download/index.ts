/**
 * skills-download Edge Function
 * 处理 Skill 下载，生成签名 URL
 */

import { createClient } from 'npm:@supabase/supabase-js@2'

interface DownloadRequest {
  skill_slug: string
  version?: string
  install_type: 'web' | 'cli'
  client_info?: {
    platform?: string
    version?: string
    os?: string
  }
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

    // Parse request body
    const body: DownloadRequest = await req.json()

    // Get skill by slug
    const { data: skill, error: skillError } = await supabaseClient
      .from('skills')
      .select('id, visibility, author_id')
      .eq('slug', body.skill_slug)
      .single()

    if (skillError || !skill) {
      return new Response(JSON.stringify({ error: 'Skill not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Check visibility
    if (skill.visibility === 'private') {
      // Get current user
      const {
        data: { user },
      } = await supabaseClient.auth.getUser()
      if (!user || user.id !== skill.author_id) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
    }

    // Get version
    let versionQuery = supabaseClient.from('skill_versions').select('*').eq('skill_id', skill.id)

    if (body.version) {
      versionQuery = versionQuery.eq('version', body.version)
    } else {
      versionQuery = versionQuery.order('created_at', { ascending: false }).limit(1)
    }

    const { data: version, error: versionError } = await versionQuery.single()

    if (versionError || !version) {
      return new Response(JSON.stringify({ error: 'Version not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Generate signed download URL (5 minutes expiry)
    const { data: signedUrlData, error: urlError } = await supabaseClient.storage
      .from('skills')
      .createSignedUrl(version.storage_path, 300)

    if (urlError) {
      return new Response(JSON.stringify({ error: urlError.message }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Get current user for install record
    const {
      data: { user },
    } = await supabaseClient.auth.getUser()

    // Record install
    await supabaseClient.from('skill_installs').insert({
      skill_id: skill.id,
      skill_version_id: version.id,
      user_id: user?.id || null,
      install_type: body.install_type,
      client_info: body.client_info || {},
    })

    return new Response(
      JSON.stringify({
        success: true,
        download_url: signedUrlData.signedUrl,
        version: version.version,
        file_size: version.file_size,
        file_hash: version.file_hash,
      }),
      { headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    )
  } catch (error) {
    console.error('Error:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
