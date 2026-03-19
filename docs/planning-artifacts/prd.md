---
stepsCompleted: ['step-01-init', 'step-02-discovery', 'step-02b-vision', 'step-02c-executive-summary', 'step-03-success', 'step-04-journeys', 'step-05-domain-skipped', 'step-06-innovation-skipped', 'step-07-project-type', 'step-08-scoping', 'step-09-functional', 'step-10-nonfunctional', 'step-11-polish']
inputDocuments: ['docs/Architecture.md', 'docs/README.md']
workflowType: 'prd'
documentCounts:
  briefs: 0
  research: 0
  brainstorming: 0
  projectDocs: 2
classification:
  projectType: 'SaaS B2B + Web App'
  domain: 'Developer Tools (AI Skills Platform)'
  complexity: 'Medium'
  projectContext: 'brownfield'
---

# Product Requirements Document - opc-starter

**Author:** opc-starter
**Date:** 2026-03-19

## Executive Summary

**Skills Hub** 是 AI Agent Skills 的统一市场，为开发者与 AI 用户提供 Skills 的发布、发现、分享和安装的一站式体验。

### 问题定义

AI Coding 工具（Cursor、Qoder、Windsurf、Claude Code）正在快速普及，但 Skills 生态仍停留在"手工作坊"阶段：
- **发现难**：Skills 散落在 GitHub、Twitter、博客，无集中搜索和分类
- **信任缺失**：无下载量、评分、评论等质量信号
- **分发碎片化**：各工具格式不统一（`.cursor/rules`、`.qoder/skills`、`CLAUDE.md`）
- **安装体验差**：手动 clone、复制文件夹，无版本管理
- **作者无激励**：无曝光渠道、无社区反馈循环

### 产品愿景

让 Skill 的发现像搜索 npm 包一样简单，安装像一键点击一样顺畅，分享像发布一条推文一样自然。

### 目标用户

| 用户类型 | 需求 |
|----------|------|
| **Skill 作者** | 曝光渠道、社区反馈、版本管理 |
| **开发者用户** | 搜索发现、质量评估、一键安装 |
| **普通 AI 用户** | 低门槛发现、信任信号引导选择 |

### 核心流程

```
作者发布 Skill → 平台审核/索引 → 用户搜索/浏览 → 社交互动（评论/点赞/收藏）→ 选择版本 → 安装（本地/云端）
```

## What Makes This Special

| 差异点 | 说明 |
|--------|------|
| **统一入口** | 第一个跨工具（Cursor/Qoder/Claude Code 等）的 Skills 市场 |
| **社交驱动** | 评论、点赞、收藏形成质量信号和社区反馈循环 |
| **版本管理** | 语义化版本 + 选择性安装，告别手动复制 |
| **双端安装** | 本地 CLI 安装 + 云端平台安装 |

**核心洞察**：AI Coding 正在快速普及，但 Skills 生态缺乏基础设施。就像 npm 对 Node.js 生态的意义、VS Code Marketplace 对插件生态的意义 — Skills Hub 要成为 AI Agent Skills 的基础设施。

**时机**：AI Coding 工具用户量爆发增长 + Skills 概念已被广泛采纳 + 先发优势窗口期（目前无成熟竞品）。

## Project Classification

| 分类项 | 值 |
|--------|-----|
| **Project Type** | SaaS B2B + Web App |
| **Domain** | Developer Tools (AI Skills Platform) |
| **Complexity** | Medium |
| **Project Context** | Brownfield（基于 OPC-Starter 扩展） |
| **商业模式** | 免费起步 |

## Success Criteria

### User Success

**作者侧（Skill Publisher）**
| 成功时刻 | 衡量标准 |
|----------|----------|
| 首次发布成功 | 发布流程 < 5 分钟完成，无报错 |
| 获得第一个反馈 | 发布后 7 天内收到首个点赞/评论/下载 |
| 持续迭代动力 | 版本更新率 > 30%（有迭代的 Skill 占比） |

**消费者侧（Skill Consumer）**
| 成功时刻 | 衡量标准 |
|----------|----------|
| 快速发现 | 搜索 → 找到目标 Skill < 2 分钟 |
| 一键安装 | 安装成功率 > 98%，耗时 < 10 秒 |
| 安装即用 | 安装后无需额外配置即可使用 |

### Business Success

| 时间节点 | 指标 |
|----------|------|
| **MVP 上线（T+0）** | 平台可用，核心流程跑通 |
| **3 个月** | 100+ Skills 发布，1,000+ 安装量，500+ 注册用户 |
| **6 个月** | 500+ Skills，10,000+ 安装量，2,000+ 注册用户，DAU 200+ |
| **12 个月** | 2,000+ Skills，100,000+ 安装量，10,000+ 注册用户，DAU 1,000+ |

**关键增长指标：**
- Skills 周增长率 > 5%
- 安装量周增长率 > 10%
- 30 日留存率 > 20%

### Technical Success

| 指标 | 目标 |
|------|------|
| 搜索响应时间 | P95 < 200ms |
| 安装成功率 | > 98% |
| 平台可用性 | > 99.5% |
| 页面加载时间 | P95 < 1.5s |
| Skill 包大小限制 | 单个 < 10MB |

### Measurable Outcomes

| 指标 | 定义 |
|------|------|
| **Skill 数量** | 已发布且可搜索的 Skill 总数 |
| **安装量** | 成功安装次数（去重按用户+版本） |
| **活跃作者** | 30 天内有发布或更新的作者数 |
| **社交互动** | 点赞 + 评论 + 收藏 总数 |
| **搜索成功率** | 搜索后有点击结果的会话占比 |

## Product Scope

### MVP - Minimum Viable Product

**核心功能（必须有，否则无法验证价值）：**

| 模块 | 功能 |
|------|------|
| **Skill 发布** | 上传 Skill 包（ZIP/TAR）、元数据填写、版本管理 |
| **Skill 发现** | 搜索、分类浏览、排序（最新/热门/下载量） |
| **Skill 详情页** | README 渲染、版本列表、安装命令展示 |
| **用户系统** | 注册/登录（复用 OPC-Starter Auth）、个人主页 |
| **社交基础** | 点赞、收藏 |
| **安装能力** | CLI 工具安装到本地 `.qoder/skills/` |

**MVP 不包含：**
- 云端安装（后续支持）
- 付费/订阅
- 评论系统（MVP 仅点赞/收藏）
- Skill 审核流程

### Growth Features (Post-MVP)

| 功能 | 价值 |
|------|------|
| 评论系统 | 增强社交反馈循环 |
| 云端安装 | 一键同步到 Qoder Cloud / Cursor Cloud |
| Skill 统计面板 | 作者数据看板（下载趋势、用户分布） |
| 推荐算法 | 个性化 Skill 推荐 |
| CLI 增强 | 批量安装、依赖管理、自动更新 |
| Skill 质量评分 | 基于下载量、评分、更新频率的自动评分 |

### Vision (Future)

| 功能 | 愿景 |
|------|------|
| 付费 Skill 市场 | 作者可设置付费，平台抽成 |
| 企业版 | 私有 Skill Registry、团队协作 |
| Skill 运行时 | 云端直接运行/测试 Skill |
| 跨平台同步 | 一处安装，多端同步 |
| AI 自动推荐 | 根据用户代码库自动推荐 Skill |

## User Journeys

### Journey 1: Skill 作者 — 小明的发布之旅

**角色背景**：小明是一名资深前端工程师，他在使用 Cursor 时积累了一套高效的 React 组件生成 Skill，想分享给社区。

**Opening Scene（开场）**
小明刚完成一个 Skill，在 Twitter 上发了一条推文分享 GitHub 链接。一周过去，只有 3 个 star，他不知道有没有人真正在用，也不知道如何让更多人发现他的 Skill。他感到沮丧。

**Rising Action（发展）**
小明听说了 Skills Hub，决定试试。他注册账号，上传 Skill 包（一个包含 `SKILL.md` 和相关文件的 ZIP），填写元数据：名称、描述、标签、兼容平台。系统自动解析版本号 `1.0.0`。

**Climax（高潮）**
发布成功！第二天，小明收到通知：他的 Skill 被浏览了 50 次，下载了 12 次，还收到了 3 个点赞。有人留言问："这个支持 TypeScript 吗？" 小明兴奋地回复并计划下一个版本。

**Resolution（结局）**
小明找到了分享的渠道，有了社区反馈，他的 Skill 持续迭代。3 个月后，下载量突破 500，他成为了平台上的活跃作者。

---

### Journey 2: 开发者用户 — 小红的发现之旅

**角色背景**：小红是一名全栈开发者，刚切换到 Qoder，想找一个能自动生成 API 文档的 Skill。

**Opening Scene（开场）**
小红在 GitHub 上搜索 "qoder skill api docs"，结果分散在各个仓库，有些已过时，有些没有文档。她花了 2 小时，还是没找到合适的。

**Rising Action（发展）**
小红打开 Skills Hub，输入关键词 "API 文档"。搜索结果按下载量排序，第一个 Skill 有 200+ 下载、4.5 星评分、50 个点赞。她点进去，看到清晰的 README、版本列表（最新 `2.1.0`）、兼容平台标注。

**Climax（高潮）**
小红复制安装命令 `skill-hub install api-docs-generator@2.1.0`，在终端执行。10 秒后，Skill 已安装到她的 `.qoder/skills/` 目录。她打开 Qoder，直接开始使用。

**Resolution（结局）**
小红在 5 分钟内完成了从搜索到安装的全流程。她给这个 Skill 点了赞，收藏以备后用。

---

### Journey 3: 普通 AI 用户 — 小白的探索之旅

**角色背景**：小白是一名产品经理，会用 AI 工具但不写代码。她想让 Claude 帮她写 PRD，但不知道怎么让 Claude 更懂她的业务。

**Opening Scene（开场）**
小白听说 "Skills" 可以增强 AI 能力，但不知道从何入手。她在网上搜索，看到的都是技术文档，看不懂。

**Rising Action（发展）**
小白打开 Skills Hub，看到首页推荐："热门 Skills"、"新手推荐"。她点击 "产品经理" 分类，看到一个叫 "PRD 助手" 的 Skill，描述是 "帮你写更专业的 PRD"。下载量 1000+，评分 4.8。

**Climax（高潮）**
小白点进去，看到简洁的介绍视频和图文教程。她点击 "一键安装到云端"，绑定她的 Claude 账号。安装完成后，她打开 Claude，发现多了一个 "PRD 助手" 的选项。

**Resolution（结局）**
小白没有写一行代码，就获得了增强的 AI 能力。她开始用 Claude 写 PRD，效率提升了 3 倍。

---

### Journey 4: 平台管理员 — 运营视角

**角色背景**：小李是 Skills Hub 的运营管理员，负责平台健康和内容质量。

**Opening Scene（开场）**
小李每天早上打开管理后台，查看数据看板：昨日新增 Skill 5 个，下载量 200，新注册用户 30。她看到一个待审核的 Skill 报告。

**Rising Action（发展）**
小李点开报告：一个 Skill 被用户投诉 "安装后无法使用"。她查看 Skill 详情，发现 `SKILL.md` 缺少必要的配置说明。她标记为 "需要改进"，并给作者发送通知。

**Climax（高潮）**
作者收到通知后更新了文档。小李重新审核，确认问题已解决，批准 Skill 重新上架。

**Resolution（结局）**
平台质量得到保障，用户信任度提升。小李继续监控数据，确保平台健康发展。

---

### Journey Requirements Summary

| 旅程 | 揭示的能力需求 |
|------|----------------|
| **作者发布** | 上传流程、元数据表单、版本管理、通知系统、数据统计 |
| **开发者发现** | 搜索引擎、分类浏览、排序算法、详情页、CLI 安装 |
| **普通用户探索** | 首页推荐、分类导航、一键云端安装、新手引导 |
| **管理员运营** | 管理后台、数据看板、审核流程、举报处理、通知推送 |

## SaaS B2B + Web App Specific Requirements

### Project-Type Overview

Skills Hub 是一个多租户 SaaS 平台，基于 **Supabase BaaS** 架构构建，充分利用其 Auth、PostgreSQL、Storage、Edge Functions、Realtime 能力。

### Technical Architecture Considerations

#### 架构总览

```
┌─────────────────────────────────────────────────────────────────┐
│                    前端 (React 19 + Vite)                        │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐  │
│  │ Pages       │  │ Zustand     │  │ DataService             │  │
│  │ (路由页面)   │  │ (状态管理)  │  │ (统一数据访问)           │  │
│  └─────────────┘  └─────────────┘  └─────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              ↓ ↑
┌─────────────────────────────────────────────────────────────────┐
│                    Supabase BaaS 平台                            │
│  ┌───────────┐ ┌───────────┐ ┌───────────┐ ┌─────────────────┐  │
│  │ Auth      │ │ PostgreSQL│ │ Storage   │ │ Edge Functions  │  │
│  │ (认证)    │ │ (数据库)  │ │ (文件存储)│ │ (服务端逻辑)    │  │
│  └───────────┘ └───────────┘ └───────────┘ └─────────────────┘  │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │ Realtime (实时订阅)                                        │  │
│  └───────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              ↓ ↑
┌─────────────────────────────────────────────────────────────────┐
│                    外部集成                                       │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐  │
│  │ CLI Tool    │  │ Cloud Sync  │  │ Third-party Platforms   │  │
│  │ (安装工具)  │  │ (云端同步)  │  │ (Qoder/Cursor Cloud)    │  │
│  └─────────────┘  └─────────────┘  └─────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

#### Supabase 能力映射

| Skills Hub 功能 | Supabase 能力 | 说明 |
|-----------------|---------------|------|
| 用户注册/登录 | **Auth** | 复用 OPC-Starter 现有认证系统 |
| 用户资料 | **profiles 表** | 复用现有 profiles 表结构 |
| Skill 元数据 | **PostgreSQL** | 新增 skills 相关表 |
| Skill 文件存储 | **Storage** | 新增 skills bucket |
| 搜索功能 | **PostgreSQL Full-Text** | 使用 `tsvector` 全文搜索 |
| 社交互动 | **PostgreSQL + Realtime** | 点赞/收藏计数实时更新 |
| 服务端逻辑 | **Edge Functions** | 发布流程、统计聚合、CLI API |
| 权限控制 | **RLS (Row Level Security)** | 数据行级权限隔离 |

#### 多租户模型

| 租户维度 | Supabase 实现 |
|----------|---------------|
| **用户空间** | RLS 策略 + `auth.uid()` 隔离 |
| **Skill 可见性** | `visibility` 字段 + RLS 策略控制查询 |
| **数据隔离** | 逻辑隔离，物理共享存储 |

#### 权限模型 (RLS)

| 角色 | RLS 实现 |
|------|---------|
| **游客** | 可查询 `visibility = 'public'` 的 Skill |
| **注册用户** | 游客权限 + 可操作自己的数据（`auth.uid() = author_id`） |
| **作者** | 注册用户权限 + 可发布/更新自己的 Skill |
| **管理员** | 使用 `service_role` 绕过 RLS 或自定义角色策略 |

```sql
-- RLS 策略示例
CREATE POLICY "Public skills are viewable by everyone"
  ON skills FOR SELECT
  USING (visibility = 'public');

CREATE POLICY "Users can manage their own skills"
  ON skills FOR ALL
  USING (auth.uid() = author_id);
```

### Implementation Considerations

#### 数据库 Schema 扩展

```sql
-- Skills 表
CREATE TABLE skills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id UUID REFERENCES profiles(id) NOT NULL,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,  -- URL 友好名称
  description TEXT,
  readme TEXT,
  visibility TEXT DEFAULT 'draft' CHECK (visibility IN ('draft', 'public', 'private')),
  tags TEXT[],
  platforms TEXT[],  -- ['qoder', 'cursor', 'claude']
  latest_version TEXT,
  downloads_count INT DEFAULT 0,
  likes_count INT DEFAULT 0,
  favorites_count INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  -- 全文搜索索引
  search_vector tsvector GENERATED ALWAYS AS (
    setweight(to_tsvector('english', coalesce(name, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(description, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(array_to_string(tags, ' '), '')), 'C')
  ) STORED
);

-- Skill 版本表
CREATE TABLE skill_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  skill_id UUID REFERENCES skills(id) ON DELETE CASCADE NOT NULL,
  version TEXT NOT NULL,
  storage_path TEXT NOT NULL,  -- Storage bucket 路径
  file_size INT,
  readme TEXT,
  changelog TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(skill_id, version)
);

-- 点赞表
CREATE TABLE skill_likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  skill_id UUID REFERENCES skills(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES profiles(id) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(skill_id, user_id)
);

-- 收藏表
CREATE TABLE skill_favorites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  skill_id UUID REFERENCES skills(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES profiles(id) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(skill_id, user_id)
);

-- 安装记录表（用于统计）
CREATE TABLE skill_installs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  skill_id UUID REFERENCES skills(id) ON DELETE CASCADE NOT NULL,
  skill_version_id UUID REFERENCES skill_versions(id),
  user_id UUID REFERENCES profiles(id),
  install_type TEXT CHECK (install_type IN ('web', 'cli')),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 索引
CREATE INDEX idx_skills_search ON skills USING GIN(search_vector);
CREATE INDEX idx_skills_author ON skills(author_id);
CREATE INDEX idx_skills_visibility ON skills(visibility);
CREATE INDEX idx_skills_tags ON skills USING GIN(tags);
```

#### Storage Bucket 配置

```sql
-- 创建 skills bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('skills', 'skills', false);

-- Storage RLS 策略
CREATE POLICY "Authors can upload their own skill files"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'skills' AND
    auth.uid()::text = (storage.foldername(split_part(name, '/', 1)))
  );

CREATE POLICY "Public skills are downloadable"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'skills' AND
    EXISTS (
      SELECT 1 FROM skills 
      WHERE skills.author_id::text = split_part(name, '/', 1)
      AND skills.visibility = 'public'
    )
  );
```

#### Edge Functions

| Function | 职责 |
|----------|------|
| `skills-publish` | Skill 发布流程：验证、存储、索引 |
| `skills-stats` | 统计聚合：下载量、点赞数更新 |
| `skills-search` | 高级搜索 API（可选，直接用 PostgREST 也可） |
| `skills-download` | 下载签名 URL 生成 + 安装记录 |

#### 前端服务层扩展

```
src/services/
├── skill/
│   ├── skillService.ts      # Skill CRUD 操作
│   ├── skillSearchService.ts # 搜索服务
│   └── skillStorageService.ts # 文件上传/下载
├── stores/
│   └── skillStore.ts        # Skill 状态管理
└── types/
    └── skill.ts             # TypeScript 类型定义
```

#### CLI 工具架构

```bash
# 安装命令
skill-hub install <skill-name>[@version]

# CLI 调用流程
1. 调用 Supabase Edge Function 获取下载签名 URL
2. 下载 Skill 包
3. 解压到本地 `.qoder/skills/<skill-name>/`
4. 记录安装信息到本地 manifest
```

#### 关键 API 设计（PostgREST）

| 端点 | 方法 | 说明 |
|------|------|------|
| `GET /rest/v1/skills` | GET | 搜索/浏览（支持 `select`, `filter`, `order`） |
| `GET /rest/v1/skills?id=eq.xxx` | GET | Skill 详情 |
| `POST /rest/v1/skills` | POST | 创建 Skill |
| `PATCH /rest/v1/skills?id=eq.xxx` | PATCH | 更新 Skill |
| `POST /rest/v1/skill_versions` | POST | 发布新版本 |
| `POST /rest/v1/skill_likes` | POST | 点赞 |
| `DELETE /rest/v1/skill_likes?skill_id=eq.xxx` | DELETE | 取消点赞 |
| `GET /storage/v1/object/skills/...` | GET | 下载 Skill 包 |

## Project Scoping & Phased Development

### MVP Strategy & Philosophy

**MVP 类型：** 问题解决型 MVP

**核心假设：** 用户需要一个集中的地方来发现和分享 AI Agent Skills

**验证目标：**
- 用户愿意上传和分享 Skill
- 用户能通过搜索找到需要的 Skill
- 安装体验足够顺畅

**资源需求：**
- 1 全栈开发者（前端 + Supabase）
- 预计 4-6 周完成 MVP

### MVP Feature Set (Phase 1)

**支持的核心用户旅程：**
| 旅程 | MVP 支持程度 |
|------|-------------|
| 作者发布 | ✅ 完整支持 |
| 开发者发现 | ✅ 完整支持 |
| 普通用户探索 | ⚠️ 部分支持（无云端安装） |
| 管理员运营 | ❌ MVP 不支持 |

**Must-Have 能力：**

| 模块 | 功能 | 优先级 |
|------|------|--------|
| **用户系统** | 注册/登录（复用 OPC-Starter） | P0 |
| **Skill 发布** | 上传 ZIP、元数据填写、版本管理 | P0 |
| **Skill 发现** | 搜索、列表浏览、排序 | P0 |
| **Skill 详情** | README 渲染、版本列表、下载 | P0 |
| **社交基础** | 点赞、收藏 | P1 |
| **下载能力** | Web 端下载 Skill 包 | P0 |
| **CLI 工具** | `skill-hub install` 命令 | P1 |

**MVP 明确不包含：**
- 云端安装（后续支持）
- 评论系统
- 付费/订阅
- 管理后台
- Skill 审核流程
- 推荐算法

### Post-MVP Features

**Phase 2 (Growth - 3-6 个月)：**

| 功能 | 价值 | 优先级 |
|------|------|--------|
| 评论系统 | 增强社交反馈循环 | P1 |
| CLI 增强 | 批量安装、依赖管理 | P1 |
| 云端安装 | 一键同步到 Qoder Cloud | P2 |
| 作者数据看板 | 下载趋势、用户分布 | P2 |
| 管理后台 | 审核、用户管理 | P2 |
| Skill 质量评分 | 自动评分系统 | P3 |

**Phase 3 (Expansion - 6-12 个月)：**

| 功能 | 愿景 |
|------|------|
| 付费 Skill 市场 | 作者可设置付费，平台抽成 |
| 企业版 | 私有 Skill Registry、团队协作 |
| 推荐算法 | 个性化 Skill 推荐 |
| 跨平台同步 | 一处安装，多端同步 |

### Risk Mitigation Strategy

**技术风险：**

| 风险 | 缓解措施 |
|------|----------|
| 搜索性能不足 | PostgreSQL Full-Text 足够支撑 MVP，后续可迁移到 Meilisearch |
| 文件存储成本 | 限制单文件 10MB，监控存储用量 |
| CLI 兼容性 | 先支持 macOS/Linux，Windows 后续支持 |

**市场风险：**

| 风险 | 验证方式 |
|------|----------|
| 用户不愿意上传 | 冷启动：手动导入优质 Skill 种子内容 |
| 用户找不到需要的 Skill | 监控搜索成功率，优化分类和标签 |
| 竞品出现 | 先发优势，快速迭代，建立社区壁垒 |

**资源风险：**

| 风险 | 应对方案 |
|------|----------|
| 开发资源不足 | 砍掉 P1 功能（点赞/收藏/CLI），聚焦核心发布+下载流程 |
| 时间压力 | 分阶段上线，先 Web 端下载，后 CLI |

## Functional Requirements

### 用户管理

- FR1: 游客可以浏览公开的 Skill 列表和详情
- FR2: 游客可以搜索公开的 Skill
- FR3: 用户可以注册账号（复用 OPC-Starter Auth）
- FR4: 用户可以登录/登出账号
- FR5: 用户可以查看和编辑个人资料
- FR6: 用户可以查看自己发布的 Skill 列表
- FR7: 用户可以查看自己收藏的 Skill 列表

### Skill 发布与管理

- FR8: 用户可以创建新的 Skill（填写名称、描述、标签、兼容平台）
- FR9: 用户可以上传 Skill 包文件（ZIP 格式）
- FR10: 用户可以设置 Skill 的可见性（draft/public/private）
- FR11: 用户可以为 Skill 发布新版本
- FR12: 用户可以编辑已发布 Skill 的元数据
- FR13: 用户可以删除自己发布的 Skill
- FR14: 用户可以查看自己 Skill 的下载量、点赞数统计
- FR15: 系统自动为 Skill 生成 URL 友好的 slug

### Skill 发现与搜索

- FR16: 用户可以按关键词搜索 Skill（名称、描述、标签）
- FR17: 用户可以按分类浏览 Skill
- FR18: 用户可以按排序方式浏览 Skill（最新/热门/下载量）
- FR19: 用户可以查看首页推荐 Skill（热门、新手推荐）
- FR20: 游客可以搜索和浏览公开 Skill（无需登录）

### Skill 详情与展示

- FR21: 用户可以查看 Skill 详情页（名称、描述、README、版本列表）
- FR22: 用户可以查看 Skill 的所有历史版本
- FR23: 用户可以查看 Skill 的作者信息
- FR24: 用户可以查看 Skill 的兼容平台标注
- FR25: 系统渲染 Skill 的 README 内容（Markdown 格式）

### 社交互动

- FR26: 用户可以点赞 Skill
- FR27: 用户可以取消点赞 Skill
- FR28: 用户可以收藏 Skill
- FR29: 用户可以取消收藏 Skill
- FR30: 用户可以查看 Skill 的点赞数和收藏数

### 安装与下载

- FR31: 用户可以从 Web 端下载 Skill 包文件
- FR32: 用户可以选择下载特定版本的 Skill
- FR33: 用户可以通过 CLI 工具安装 Skill（`skill-hub install`）
- FR34: 用户可以通过 CLI 工具安装指定版本的 Skill
- FR35: 系统记录每次下载/安装行为（用于统计）

## Non-Functional Requirements

### 性能

| NFR | 指标 |
|-----|------|
| NFR1: 搜索响应时间 | P95 < 200ms（关键词搜索） |
| NFR2: Skill 列表加载 | P95 < 500ms（20 条/页） |
| NFR3: Skill 详情页加载 | P95 < 800ms（含 README 渲染） |
| NFR4: 文件上传 | 支持 10MB 文件，上传进度可见 |
| NFR5: 文件下载 | 下载速度 > 1MB/s（服务端带宽） |
| NFR6: 页面首次加载 | P95 < 1.5s（首屏渲染） |

### 安全

| NFR | 要求 |
|-----|------|
| NFR7: 数据传输加密 | 全站 HTTPS，TLS 1.2+ |
| NFR8: 数据存储加密 | Storage 文件加密存储 |
| NFR9: 认证安全 | 使用 Supabase Auth，支持 JWT Token |
| NFR10: 权限隔离 | RLS 策略确保用户只能访问授权数据 |
| NFR11: 文件安全 | 上传文件类型校验（仅允许 ZIP/TAR/GZ） |
| NFR12: API 安全 | PostgREST RLS 保护，敏感操作需 Edge Function |

### 可扩展性

| NFR | 要求 |
|-----|------|
| NFR13: 用户规模 | 支持 10,000+ 注册用户 |
| NFR14: Skill 数量 | 支持 5,000+ Skills |
| NFR15: 存储容量 | 支持 50GB+ 文件存储 |
| NFR16: 并发访问 | 支持 100 并发用户 |
| NFR17: 数据库扩展 | Supabase 自动扩容，无需手动干预 |

### 可访问性

| NFR | 要求 |
|-----|------|
| NFR18: 响应式设计 | 支持桌面端（1280px+）、平板端（768px+） |
| NFR19: 键盘导航 | 核心功能支持键盘操作 |
| NFR20: 语义化 HTML | 使用语义化标签，支持屏幕阅读器 |

### 集成

| NFR | 要求 |
|-----|------|
| NFR21: CLI 兼容性 | 支持 macOS、Linux（x64/ARM） |
| NFR22: CLI 安装时间 | 单个 Skill 安装 < 10 秒 |
| NFR23: API 可用性 | PostgREST API 99.5% 可用性 |
| NFR24: 离线支持 | CLI 支持离线查看已安装 Skill 列表 |
