#!/usr/bin/env node

/**
 * 检查 MCP 配置与 .env.local 是否指向同一 Supabase 实例
 * 防止 migration 打到错误的数据库
 */

const fs = require('fs')
const path = require('path')

function parseProjectFromUrl(url) {
  const match = url.match(/spb-([a-z0-9]+)/)
  return match ? match[1] : null
}

function parseProjectFromArgs(args) {
  const projectArg = args.find(arg => arg.startsWith('--project-id='))
  if (projectArg) {
    // 处理两种格式: --project-id=spb-xxx 或 --project-id=xxx
    let id = projectArg.split('=')[1]
    if (id.startsWith('spb-')) {
      id = id.substring(4) // 去掉 spb- 前缀
    }
    return id
  }
  return null
}

function parseRegionFromArgs(args) {
  const regionArg = args.find(arg => arg.startsWith('--region-id='))
  if (regionArg) {
    return regionArg.split('=')[1]
  }
  return null
}

// --- 主逻辑 ---
console.log('🔍 检查 MCP 与 .env.local 配置一致性...\n')

try {
  // 1. 读取 .env.local
  const envPath = path.join(__dirname, '../app/.env.local')
  const envContent = fs.readFileSync(envPath, 'utf8')
  
  const envUrlMatch = envContent.match(/VITE_SUPABASE_URL=(.+)$/m)
  if (!envUrlMatch) {
    console.error('❌ 未在 .env.local 中找到 VITE_SUPABASE_URL')
    process.exit(1)
  }
  
  const envUrl = envUrlMatch[1].trim()
  const envProjectId = parseProjectFromUrl(envUrl)
  const envRegion = envUrl.includes('cn-beijing') ? 'cn-beijing' : 'cn-hangzhou'
  
  if (!envProjectId) {
    console.error('❌ 无法从 VITE_SUPABASE_URL 解析 project-id')
    process.exit(1)
  }

  // 2. 读取 .mcp.json
  const mcpPath = path.join(__dirname, '../.mcp.json')
  const mcpContent = JSON.parse(fs.readFileSync(mcpPath, 'utf8'))
  
  const supabaseConfig = mcpContent.mcpServers?.supabase
  if (!supabaseConfig) {
    console.error('❌ .mcp.json 中未找到 supabase 配置')
    process.exit(1)
  }
  
  const mcpProjectId = parseProjectFromArgs(supabaseConfig.args)
  const mcpRegion = parseRegionFromArgs(supabaseConfig.args)
  
  if (!mcpProjectId) {
    console.error('❌ 无法从 .mcp.json 解析 project-id')
    process.exit(1)
  }

  // 3. 对比结果
  console.log('📊 配置对比:')
  console.log(`   .env.local URL     : ${envUrl}`)
  console.log(`   .env.local project : spb-${envProjectId}`)
  console.log(`   .env.local region  : ${envRegion}`)
  console.log('')
  console.log(`   .mcp.json project  : spb-${mcpProjectId}`)
  console.log(`   .mcp.json region   : ${mcpRegion}`)
  console.log('')

  if (mcpProjectId === envProjectId && mcpRegion === envRegion) {
    console.log('✅ 配置一致，可以安全执行 migration')
    process.exit(0)
  } else {
    console.error('❌ 配置不一致！')
    console.error('')
    console.error('MCP 配置与 .env.local 指向不同实例：')
    console.error(`  MCP  : spb-${mcpProjectId} (${mcpRegion})`)
    console.error(`  ENV  : spb-${envProjectId} (${envRegion})`)
    console.error('')
    console.error('请运行以下命令同步配置：')
    console.error('  npm run mcp:sync')
    console.error('')
    console.error('或手动编辑 .mcp.json 确保 project-id 和 region-id 正确')
    process.exit(1)
  }

} catch (err) {
  console.error('❌ 检查失败:', err.message)
  process.exit(1)
}