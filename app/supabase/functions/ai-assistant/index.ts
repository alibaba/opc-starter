/**
 * AI Assistant Edge Function - 入口文件
 *
 * OPC-Starter 通用 AI 助手，提供智能问答和页面导航能力
 * 使用 OpenAI SDK 兼容模式调用通义千问 Qwen (百炼 API)
 *
 * @version 2.1.0 - 模块化拆分版本
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import type { AIAssistantRequest } from './types.ts'
import {
  corsHeaders,
  sseHeaders,
  createSSEWriter,
  convertToOpenAIMessages,
  buildSystemPrompt,
} from './sse.ts'
import { runAgentLoop } from './agentLoop.ts'

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: '仅支持 POST 请求' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  try {
    const apiKey = Deno.env.get('ALIYUN_BAILIAN_API_KEY')
    if (!apiKey) {
      throw new Error('未配置 ALIYUN_BAILIAN_API_KEY')
    }

    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: '缺少 Authorization 头' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    )

    const {
      data: { user },
    } = await supabaseClient.auth.getUser()
    if (!user) {
      return new Response(JSON.stringify({ error: '用户未授权' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    console.log('👤 用户认证成功:', user.id)

    const body: AIAssistantRequest = await req.json()
    const { messages, context, threadId } = body

    if (!messages || messages.length === 0) {
      return new Response(JSON.stringify({ error: 'messages 不能为空' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    console.log('📥 收到请求:', {
      messageCount: messages.length,
      hasContext: !!context,
      threadId,
    })

    const { readable, writable } = new TransformStream<Uint8Array>()
    const sse = createSSEWriter(writable)

    ;(async () => {
      try {
        const systemPrompt = buildSystemPrompt(context)
        const openaiMessages = convertToOpenAIMessages(messages, systemPrompt)
        await runAgentLoop(openaiMessages, sse, { agentContext: context })
      } catch (error) {
        console.error('❌ 处理错误:', error)
        sse.write('error', {
          message: error instanceof Error ? error.message : '处理失败',
        })
      } finally {
        sse.close()
      }
    })()

    return new Response(readable, { headers: sseHeaders })
  } catch (error) {
    console.error('❌ 请求处理失败:', error)
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : '未知错误',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }
})

console.log('🚀 AI Assistant Function 已启动')
