#!/usr/bin/env node

/**
 * 同步 .mcp.json 配置到 .env.local 中的 Supabase 实例
 * 读取 .env.local 的 VITE_SUPABASE_URL，自动更新 .mcp.json
 */

const fs = require('fs')
const path = require('path')
const readline = require('readline')

const forceMode = process.argv.includes('--yes') || process.argv.includes('-y')

function parseProjectFromUrl(url) {
  const match = url.match(/spb-([a-z0-9]+)/)
  return match ? match[1] : null
}

function parseRegionFromUrl(url) {
  if (url.includes('cn-hangzhou')) return 'cn-hangzhou'
  if (url.includes('cn-beijing')) return 'cn-beijing'
  return 'cn-hangzhou' // 默认杭州
}

function parseProjectFromArgs(args) {
  const projectArg = args.find(arg => arg.startsWith('--project-id='))
  if (projectArg) {
    let id = projectArg.split('=')[1]
    if (id.startsWith('spb-')) id = id.substring(4)
    return id
  }
  return null
}

function parseRegionFromArgs(args) {
  const regionArg = args.find(arg => arg.startsWith('--region-id='))
  if (regionArg) return regionArg.split('=')[1]
  return null
}

function ask(question) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout })
  return new Promise(resolve => {
    rl.question(question, answer => {
      rl.close()
      resolve(answer.trim().toLowerCase())
    })
  })
}

// --- 主逻辑 ---
async function main() {
  console.log('🔄 同步 MCP 配置到 .env.local 实例...\n')

  // 1. 读取 .env.local
  const envPath = path.join(__dirname, '../app/.env.local')
  const envContent = fs.readFileSync(envPath, 'utf8')

  const envUrlMatch = envContent.match(/VITE_SUPABASE_URL=(.+)$/m)
  if (!envUrlMatch) {
    console.error('❌ 未在 .env.local 中找到 VITE_SUPABASE_URL')
    process.exit(1)
  }

  const envUrl = envUrlMatch[1].trim()
  const projectId = parseProjectFromUrl(envUrl)
  const regionId = parseRegionFromUrl(envUrl)

  if (!projectId) {
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

  const oldProjectId = parseProjectFromArgs(supabaseConfig.args)
  const oldRegion = parseRegionFromArgs(supabaseConfig.args)

  // 3. 展示变更计划
  console.log('📋 变更计划:\n')
  console.log(`   .mcp.json 当前配置:`)
  console.log(`     project-id : spb-${oldProjectId}`)
  console.log(`     region-id  : ${oldRegion}`)
  console.log('')
  console.log(`   将同步为 (.env.local):`)
  console.log(`     project-id : spb-${projectId}`)
  console.log(`     region-id  : ${regionId}`)
  console.log(`     URL        : ${envUrl}`)
  console.log('')

  // 4. 用户确认
  if (!forceMode) {
    const answer = await ask('确认更新 .mcp.json？(y/N) ')
    if (answer !== 'y' && answer !== 'yes') {
      console.log('⏹️  已取消')
      process.exit(0)
    }
  }

  // 5. 替换 project-id 和 region-id 参数
  const newArgs = supabaseConfig.args.map(arg => {
    if (arg.startsWith('--project-id=')) return `--project-id=spb-${projectId}`
    if (arg.startsWith('--region-id=')) return `--region-id=${regionId}`
    return arg
  })

  mcpContent.mcpServers.supabase.args = newArgs
  fs.writeFileSync(mcpPath, JSON.stringify(mcpContent, null, 2) + '\n')

  console.log('')
  console.log('✅ .mcp.json 已更新')
  console.log('')
  console.log('💡 建议运行 npm run db:check-sync 验证一致性')
}

main().catch(err => {
  console.error('❌ 同步失败:', err.message)
  process.exit(1)
})