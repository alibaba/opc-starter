# 阿里云部署指南

> OPC-Starter 一人公司启动器 | 阿里云全托管部署方案
> 
> 适用版本: v1.0+ | 最后更新: 2026-01

---

## 📋 目录

- [架构概览](#架构概览)
- [先决条件](#先决条件)
- [快速部署 (3 步完成)](#快速部署-3-步完成)
- [详细部署步骤](#详细部署步骤)
  - [Step 1: Supabase 数据库](#step-1-supabase-数据库)
  - [Step 2: 百炼 AI API](#step-2-百炼-ai-api)
  - [Step 3: ESA Pages 前端](#step-3-esa-pages-前端)
- [环境变量配置清单](#环境变量配置清单)
- [自定义域名配置](#自定义域名配置)
- [安全最佳实践](#安全最佳实践)
- [故障排除](#故障排除)
- [常见问题](#常见问题)

---

## 架构概览

```
┌─────────────────────────────────────────────────────────────────┐
│                        用户浏览器                                │
└─────────────────────────────────────┬───────────────────────────┘
                                      │ HTTPS
                                      ▼
┌─────────────────────────────────────────────────────────────────┐
│                    阿里云 ESA Pages                              │
│                    (静态资源托管)                                │
│                    - React SPA                                   │
│                    - 全球 CDN 加速                               │
└─────────────────────────────────────┬───────────────────────────┘
                                      │
                    ┌─────────────────┴─────────────────┐
                    │                                   │
                    ▼                                   ▼
┌───────────────────────────────┐   ┌───────────────────────────────┐
│      Supabase (ADB-PG)        │   │      阿里云百炼 AI            │
│      - PostgreSQL 数据库       │   │      - Qwen-Plus 模型          │
│      - 用户认证 Auth           │   │      - OpenAI SDK 兼容        │
│      - 文件存储 Storage        │   │      - Agent 智能助手         │
│      - Edge Functions          │   │                               │
│      - Realtime 实时同步       │   │                               │
└───────────────────────────────┘   └───────────────────────────────┘
```

**技术栈版本:**
| 组件 | 版本 | 说明 |
|------|------|------|
| React | 19.1 | 前端框架 |
| TypeScript | 5.9 | 类型安全 |
| Vite | 7.1 | 构建工具 |
| Tailwind CSS | 4.1 | 样式框架 |
| Supabase | 2.80 | BaaS 后端 |
| Qwen-Plus | via 百炼 | AI 模型（通义千问） |

---

## 先决条件

### 必需账号

| 服务 | 用途 | 注册链接 |
|------|------|----------|
| 阿里云账号 | ESA Pages + 百炼 AI | [注册](https://account.aliyun.com/register/register.htm) |
| Supabase 账号 | 数据库 + 认证 + 存储 | [注册](https://supabase.com/) |

### 本地环境

```bash
# 检查 Node.js 版本 (需要 >= 20.x)
node -v

# 检查 npm 版本 (需要 >= 10.x)  
npm -v

# 检查 Git
git --version
```

### 预估费用

| 服务 | 免费额度 | 超出费用 |
|------|----------|----------|
| Supabase | 500MB 数据库, 1GB 存储 | $25/月起 |
| ESA Pages | 100GB 流量/月 | ¥0.24/GB |
| 百炼 AI | 新用户赠送额度 | 按 Token 计费 |

---

## 快速部署 (3 步完成)

> ⏱️ 预计时间: 15-30 分钟

### Step 1: 配置 Supabase

```bash
# 1. 访问 Supabase Dashboard 创建项目
#    https://supabase.com/dashboard

# 2. 在 SQL Editor 执行数据库初始化脚本
#    脚本位置: app/supabase/setup.sql

# 3. 记录以下信息 (Settings → API):
#    - Project URL: https://xxx.supabase.co
#    - anon public key: eyJxxx...
```

### Step 2: 配置百炼 AI

```bash
# 1. 访问百炼控制台创建 API Key
#    https://bailian.console.aliyun.com/cn-beijing/?tab=model#/api-key

# 2. 在 Supabase Dashboard 配置 Edge Function Secret:
#    Edge Functions → Secrets → Add new secret
#    Name: ALIYUN_BAILIAN_API_KEY
#    Value: sk-xxx (你的百炼 API Key)
```

### Step 3: 部署前端

```bash
# 1. 克隆项目并进入 app 目录
git clone https://github.com/your-username/opc-starter.git
cd opc-starter/app

# 2. 安装依赖
npm install

# 3. 配置环境变量
cp env.local.example .env.local
# 编辑 .env.local，填入 Supabase URL 和 Key

# 4. 构建项目
npm run build

# 5. 安装 ESA CLI 并登录
npm i esa-cli@latest -g
esa-cli login

# 6. 部署到 ESA Pages
esa-cli deploy
```

**🎉 部署完成！** 访问 ESA 控制台查看你的站点 URL。

---

## 详细部署步骤

### Step 1: Supabase 数据库

#### 1.1 创建 Supabase 项目

1. 登录 [Supabase Dashboard](https://supabase.com/dashboard)
2. 点击 **New Project**
3. 填写项目信息:
   - **Name**: `opc-starter-prod` (自定义名称)
   - **Database Password**: 设置强密码并妥善保存
   - **Region**: 选择最近的区域 (如 Southeast Asia - Singapore)
4. 等待项目创建完成 (约 2 分钟)

#### 1.2 初始化数据库 Schema

1. 进入 **SQL Editor**
2. 点击 **New query**
3. 复制粘贴 `app/supabase/setup.sql` 的全部内容
4. 点击 **Run** 执行

> 💡 **提示**: 脚本会创建 `profiles`, `organizations`, `organization_members`, `agent_*` 等表，并配置 RLS 安全策略。

#### 1.3 配置 Storage Bucket

1. 进入 **Storage**
2. 点击 **Create a new bucket**
3. 创建以下 Bucket:

| Bucket 名称 | 公开访问 | 用途 |
|-------------|----------|------|
| `avatars` | ✅ Public | 用户头像 |
| `uploads` | ❌ Private | 用户上传文件 |

#### 1.4 获取项目凭证

进入 **Settings → API**，记录以下信息:

```yaml
# 保存到安全位置
SUPABASE_URL: https://xxxxx.supabase.co
SUPABASE_ANON_KEY: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9... # 仅后端使用
```

#### 1.5 部署 Edge Functions

```bash
# 在 app 目录下
cd app

# 登录 Supabase CLI
npx supabase login

# 链接到你的项目
npx supabase link --project-ref <your-project-ref>

# 部署 AI Assistant Function
npx supabase functions deploy ai-assistant

# 配置 Secrets (下一步获取百炼 API Key 后执行)
npx supabase secrets set ALIYUN_BAILIAN_API_KEY=sk-xxx
```

---

### Step 2: 百炼 AI API

#### 2.1 开通百炼服务

1. 访问 [阿里云百炼控制台](https://bailian.console.aliyun.com/)
2. 如未开通，点击 **开通服务** (按量付费)
3. 完成实名认证 (如需)

#### 2.2 创建 API Key

1. 进入 **API-KEY 管理**: [直达链接](https://bailian.console.aliyun.com/cn-beijing/?tab=model#/api-key)
2. 点击 **创建新的 API-KEY**
3. 设置名称: `opc-starter-prod`
4. 复制生成的 Key (格式: `sk-xxx`)

> ⚠️ **安全提醒**: API Key 只显示一次，请立即保存到安全位置。

#### 2.3 配置到 Supabase Edge Functions

**方式一: 通过 Dashboard (推荐新手)**

1. Supabase Dashboard → **Edge Functions**
2. 点击 **Secrets** 标签
3. **Add new secret**:
   - Name: `ALIYUN_BAILIAN_API_KEY`
   - Value: `sk-xxx` (你的百炼 API Key)

**方式二: 通过 CLI**

```bash
npx supabase secrets set ALIYUN_BAILIAN_API_KEY=sk-xxx
```

#### 2.4 验证配置

```bash
# 测试 Edge Function
curl -X POST 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/ai-assistant' \
  -H 'Authorization: Bearer YOUR_ANON_KEY' \
  -H 'Content-Type: application/json' \
  -d '{"messages":[{"role":"user","content":"你好"}]}'
```

---

### Step 3: ESA Pages 前端

#### 3.1 安装 ESA CLI

```bash
# 全局安装 ESA CLI
npm install esa-cli@latest -g

# 验证安装
esa-cli --version
```

#### 3.2 配置阿里云访问凭证

```bash
# 登录 (需要阿里云 AccessKey)
esa-cli login
```

**获取 AccessKey:**

1. 访问 [AccessKey 管理](https://ram.console.aliyun.com/manage/ak)
2. 创建 AccessKey (建议使用 RAM 子账号)
3. 记录 AccessKey ID 和 AccessKey Secret

> ⚠️ **安全提醒**: 
> - 不要使用主账号 AccessKey
> - 建议创建专用 RAM 用户并仅授予 ESA 权限
> - 设置 AccessKey 轮转策略

#### 3.3 配置前端环境变量

```bash
cd app

# 复制环境变量模板
cp env.local.example .env.local

# 编辑配置
nano .env.local  # 或使用你喜欢的编辑器
```

**`.env.local` 配置内容:**

```bash
# Supabase 配置 (必需)
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIs...

# 开发调试 (可选)
VITE_ENABLE_MSW=false
VITE_LOG_LEVEL=info
```

#### 3.4 构建项目

```bash
# 安装依赖 (如未安装)
npm install

# 构建生产版本
npm run build

# 本地预览 (可选)
npm run preview
```

#### 3.5 部署到 ESA Pages

**查看部署配置:**

```bash
cat esa.jsonc
```

```json
{
  "name": "opc-starter",
  "assets": {
    "directory": "./dist",
    "notFoundStrategy": "singlePageApplication"
  }
}
```

**执行部署:**

```bash
esa-cli deploy
```

**部署成功输出示例:**

```
✔ Deployment successful!
  Site URL: https://opc-starter.esa.aliyun.com
  Deploy ID: deploy_xxxxx
```

---

## 环境变量配置清单

### 前端环境变量 (`.env.local`)

| 变量名 | 必需 | 说明 | 示例值 |
|--------|------|------|--------|
| `VITE_SUPABASE_URL` | ✅ | Supabase 项目 URL | `https://xxx.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | ✅ | Supabase 匿名 Key | `eyJxxx...` |
| `VITE_ENABLE_MSW` | ❌ | 启用 Mock (仅开发) | `false` |
| `VITE_LOG_LEVEL` | ❌ | 日志级别 | `info` |

### Edge Function Secrets

| Secret 名称 | 必需 | 说明 | 获取方式 |
|-------------|------|------|----------|
| `ALIYUN_BAILIAN_API_KEY` | ✅ | 百炼 AI API Key | [百炼控制台](https://bailian.console.aliyun.com/cn-beijing/?tab=model#/api-key) |
| `SUPABASE_URL` | 🔄 | 自动注入 | - |
| `SUPABASE_ANON_KEY` | 🔄 | 自动注入 | - |
| `SUPABASE_SERVICE_ROLE_KEY` | 🔄 | 自动注入 | - |

> 🔄 = Supabase 自动注入，无需手动配置

---

## 自定义域名配置

### 前提条件

- 已完成域名备案 (中国大陆访问必需)
- 域名 DNS 托管或可修改 DNS 记录

### 配置步骤

1. **获取 ESA Pages 默认域名**
   
   部署成功后会分配一个 `xxx.esa.aliyun.com` 域名

2. **添加自定义域名**
   
   - 访问 [ESA 控制台](https://esa.console.aliyun.com/)
   - 进入你的站点 → **域名管理**
   - 点击 **添加域名**
   - 输入你的域名 (如 `app.yourdomain.com`)

3. **配置 DNS 解析**
   
   添加 CNAME 记录指向 ESA 提供的地址:
   
   | 主机记录 | 记录类型 | 记录值 |
   |----------|----------|--------|
   | `app` | CNAME | `xxx.esa.aliyun.com` |

4. **配置 HTTPS 证书**
   
   ESA 支持自动申请免费证书，或上传自有证书

5. **更新 Supabase 配置**
   
   如果使用自定义域名，记得在 Supabase Dashboard 中:
   - **Authentication → URL Configuration** 更新 Site URL
   - **Authentication → Redirect URLs** 添加新域名

---

## 安全最佳实践

### 1. Supabase MCP 安全

```yaml
# 推荐配置
- 开启 Read-Only 模式 (除非必要)
- 启用 RLS (Row Level Security) - 默认已启用
- 定期审计 RLS 策略
```

### 2. 百炼 API Key 安全

```yaml
# 推荐配置
- 为不同环境创建不同的 API Key
- 设置 API Key 调用限额
- 定期轮转 Key (建议每 90 天)
- 监控异常调用量
```

### 3. 阿里云 AccessKey 安全

```yaml
# 强烈推荐
- ❌ 不要使用主账号 AccessKey
- ✅ 创建 RAM 子账号
- ✅ 仅授予必要权限 (最小权限原则)
- ✅ 设置 AccessKey 轮转策略
- ✅ 启用 MFA 多因素认证
```

**创建专用 RAM 用户:**

```bash
# RAM 策略示例 - 仅 ESA Pages 权限
{
  "Version": "1",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": "esa:*",
      "Resource": "*"
    }
  ]
}
```

### 4. 生产环境检查清单

- [ ] 关闭前端 MSW Mock (`VITE_ENABLE_MSW=false`)
- [ ] 设置适当的日志级别 (`VITE_LOG_LEVEL=info` 或 `warn`)
- [ ] 确认 Supabase RLS 策略正确配置
- [ ] 确认 Edge Function Secrets 已配置
- [ ] 配置 HTTPS (ESA 默认支持)
- [ ] 设置 CORS 策略 (Edge Function 已配置)

---

## 故障排除

### 问题 1: ESA 部署失败

**症状:** `esa-cli deploy` 报错

**排查步骤:**

```bash
# 1. 检查登录状态
esa-cli whoami

# 2. 重新登录
esa-cli login

# 3. 检查构建产物
ls -la dist/

# 4. 验证 esa.jsonc 配置
cat esa.jsonc
```

### 问题 2: AI 助手无响应

**症状:** Agent 对话无回复或报错

**排查步骤:**

```bash
# 1. 检查 Edge Function 日志
npx supabase functions logs ai-assistant

# 2. 验证 Secret 配置
npx supabase secrets list

# 3. 测试百炼 API 连通性
curl -X POST 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions' \
  -H 'Authorization: Bearer sk-xxx' \
  -H 'Content-Type: application/json' \
  -d '{"model":"qwen-plus","messages":[{"role":"user","content":"test"}]}'
```

### 问题 3: 登录/认证失败

**症状:** 无法登录或 Session 丢失

**排查步骤:**

1. 检查 `VITE_SUPABASE_URL` 和 `VITE_SUPABASE_ANON_KEY` 是否正确
2. 确认 Supabase Dashboard → Authentication → URL Configuration 设置正确
3. 检查浏览器控制台是否有 CORS 错误

### 问题 4: 数据库连接错误

**症状:** 页面显示 "Failed to fetch" 或类似错误

**排查步骤:**

1. 确认 Supabase 项目状态为 Active
2. 检查 RLS 策略是否正确配置
3. 验证 Anon Key 是否匹配当前项目

---

## 常见问题

### Q1: Supabase 免费额度够用吗？

**A:** 对于个人项目或小团队，免费额度 (500MB 数据库, 1GB 存储, 50K MAU) 通常足够。建议在 Dashboard 中设置用量告警。

### Q2: 百炼 AI 有哪些模型可用？

**A:** 本项目默认使用 `qwen-plus`。百炼支持的通义千问模型包括:
- Qwen-Plus (推荐，长上下文 1M tokens，性价比高)
- Qwen-Max (最强能力，上下文 256K tokens)
- Qwen-Turbo (快速响应，中等复杂度)

可在 `ai-assistant/index.ts` 中修改模型配置。

### Q3: 如何切换到其他 LLM 提供商？

**A:** Edge Function 使用 OpenAI SDK 兼容模式，可轻松切换:

```typescript
// 切换到 OpenAI
const openai = new OpenAI({
  apiKey: Deno.env.get('OPENAI_API_KEY'),
  // 移除 baseURL 使用默认 OpenAI 地址
})

// 或切换到其他兼容服务
const openai = new OpenAI({
  apiKey: Deno.env.get('OTHER_API_KEY'),
  baseURL: 'https://other-provider.com/v1',
})
```

### Q4: ESA Pages 支持哪些区域？

**A:** ESA Pages 支持全球部署，自动通过阿里云 CDN 加速。中国大陆访问需要域名备案。

### Q5: 如何查看部署日志？

**A:** 
- **ESA Pages**: ESA 控制台 → 站点详情 → 部署记录
- **Edge Functions**: `npx supabase functions logs <function-name>`
- **前端错误**: 浏览器开发者工具 Console

### Q6: 支持私有化部署吗？

**A:** 本项目设计为云托管部署。如需私有化:
- Supabase 可自托管 (Self-hosted Supabase)
- 前端可部署到任意静态托管服务
- AI 服务可替换为私有部署的模型

---

## 获取帮助

- 📖 [项目文档](./docs/)
- 🐛 [提交 Issue](https://github.com/your-username/opc-starter/issues)
- 💬 [讨论区](https://github.com/your-username/opc-starter/discussions)

---

<p align="center">
  <sub>Made with ❤️ for Solo Entrepreneurs</sub>
</p>
