# Skills Hub - 技术架构设计文档

> 版本: v1.0.0 | 创建日期: 2026-03-19

---

## 1. 系统架构概览

### 1.1 项目定位

Skills Hub 是 AI Agent Skills 的统一市场平台，基于 OPC-Starter 现有架构扩展，为开发者与 AI 用户提供 Skills 的发布、发现、分享和安装的一站式体验。

### 1.2 架构原则

| 原则 | 说明 |
|------|------|
| **复用优先** | 最大化复用 OPC-Starter 现有基础设施（Auth、DataService、Migration 体系） |
| **渐进增强** | MVP 聚焦核心功能，后续迭代逐步增强 |
| **安全第一** | RLS 策略保护数据，最小权限原则 |
| **性能优先** | 搜索响应 < 200ms，安装成功率 > 98% |
| **可扩展性** | 支持未来云端安装、付费市场、企业版扩展 |

### 1.3 整体架构图

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                            前端层 (React 19)                                      │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐  │
│  │ Pages       │  │ Zustand     │  │ DataService │  │ Components             │  │
│  │ (路由页面)   │  │ (状态管理)  │  │ (统一数据)   │  │ (UI/业务组件)           │  │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────────────────┘  │
│                              │                                                   │
│  ┌─────────────────────────────────────────────────────────────────────────────┐ │
│  │ Skills Hub 模块                                                              │ │
│  │  • skillService.ts - Skill CRUD                                             │ │
│  │  • skillSearchService.ts - 搜索服务                                          │ │
│  │  • skillStorageService.ts - 文件上传/下载                                    │ │
│  │  • useSkillStore.ts - Skill 状态管理                                         │ │
│  └─────────────────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────────┘
                                       │
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                         Supabase BaaS 平台                                        │
│  ┌───────────┐ ┌───────────────────┐ ┌───────────┐ ┌─────────────────────────┐  │
│  │ Auth      │ │ PostgreSQL        │ │ Storage   │ │ Edge Functions          │  │
│  │ (认证)    │ │ • profiles        │ │ (文件存储)│ │ • skills-publish        │  │
│  │           │ │ • organizations   │ │ • skills  │ │ • skills-download       │  │
│  │ 复用现有   │ │ • skills ⭐       │ │   bucket  │ │ • skills-stats          │  │
│  │           │ │ • skill_versions⭐│ │           │ │                         │  │
│  │           │ │ • skill_likes ⭐   │ │           │ │                         │  │
│  │           │ │ • skill_favorites⭐│ │           │ │                         │  │
│  │           │ │ • skill_installs⭐ │ │           │ │                         │  │
│  └───────────┘ └───────────────────┘ └───────────┘ └─────────────────────────┘  │
│  ┌───────────────────────────────────────────────────────────────────────────┐  │
│  │ Realtime (实时订阅)                                                        │  │
│  │  • 点赞数/收藏数实时更新                                                    │  │
│  │  • 新版本发布通知                                                          │  │
│  └───────────────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────────┘
                                       │
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                            外部集成层                                             │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────────────────────┐  │
│  │ CLI Tool    │  │ Web 下载    │  │ 未来：Cloud Sync                         │  │
│  │ (安装工具)  │  │ (浏览器)    │  │ (Qoder Cloud / Cursor Cloud)            │  │
│  └─────────────┘  └─────────────┘  └─────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────────┘

⭐ = Skills Hub 新增表
```

### 1.4 技术栈总览

| 层级 | 技术 | 版本 | 说明 |
|------|------|------|------|
| **前端框架** | React | 19.1 | 最新稳定版 |
| **类型系统** | TypeScript | 5.9 | 严格模式 |
| **构建工具** | Vite | 7.1 | 快速 HMR |
| **样式方案** | Tailwind CSS | 4.1 | v4 语法 |
| **组件库** | shadcn/ui | latest | 可定制组件 |
| **状态管理** | Zustand | 5.0 | 轻量级 Store |
| **后端服务** | Supabase | 2.80 | Auth + DB + Storage + Edge Functions |
| **数据库** | PostgreSQL | 14+ | Supabase 托管 |
| **全文搜索** | PostgreSQL tsvector | - | 内置全文搜索 |
| **文件存储** | Supabase Storage | - | S3 兼容存储 |

---

## 2. 数据模型设计

### 2.1 实体关系图

```
┌─────────────────┐       ┌─────────────────┐
│    profiles     │       │     skills      │
│─────────────────│       │─────────────────│
│ id (PK)         │◄──────│ author_id (FK)  │
│ email           │       │ id (PK)         │
│ full_name       │       │ name            │
│ avatar_url      │       │ slug            │
│ ...             │       │ description     │
└─────────────────┘       │ readme          │
                          │ visibility      │
                          │ tags[]          │
                          │ platforms[]     │
                          │ downloads_count │
                          │ likes_count     │
                          │ favorites_count │
                          └────────┬────────┘
                                   │
          ┌────────────────────────┼────────────────────────┐
          │                        │                        │
          ▼                        ▼                        ▼
┌─────────────────┐       ┌─────────────────┐       ┌─────────────────┐
│  skill_versions │       │   skill_likes   │       │skill_favorites  │
│─────────────────│       │─────────────────│       │─────────────────│
│ id (PK)         │       │ id (PK)         │       │ id (PK)         │
│ skill_id (FK)   │       │ skill_id (FK)   │       │ skill_id (FK)   │
│ version         │       │ user_id (FK)    │       │ user_id (FK)    │
│ storage_path    │       │ created_at      │       │ created_at      │
│ file_size       │       └─────────────────┘       └─────────────────┘
│ readme          │
│ changelog       │       ┌─────────────────┐
│ created_at      │       │ skill_installs  │
└─────────────────┘       │─────────────────│
                          │ id (PK)         │
                          │ skill_id (FK)   │
                          │ skill_version_id│
                          │ user_id (FK)    │
                          │ install_type    │
                          │ created_at      │
                          └─────────────────┘
```

### 2.2 核心表定义

#### 2.2.1 skills 表

```sql
-- Skills 主表
CREATE TABLE IF NOT EXISTS public.skills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,

  -- 基本信息
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,              -- URL 友好名称，自动生成
  description TEXT,
  readme TEXT,                            -- Markdown 格式

  -- 可见性控制
  visibility TEXT NOT NULL DEFAULT 'draft'
    CHECK (visibility IN ('draft', 'public', 'private')),

  -- 分类与标签
  tags TEXT[] DEFAULT '{}',               -- ['react', 'typescript', 'testing']
  platforms TEXT[] DEFAULT '{}',          -- ['qoder', 'cursor', 'claude', 'cline']

  -- 版本信息
  latest_version TEXT,                    -- 最新版本号，如 '1.0.0'

  -- 统计计数（冗余存储，提升查询性能）
  downloads_count INT DEFAULT 0 NOT NULL,
  likes_count INT DEFAULT 0 NOT NULL,
  favorites_count INT DEFAULT 0 NOT NULL,

  -- 时间戳
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  published_at TIMESTAMPTZ,               -- 首次发布时间

  -- 全文搜索向量（自动生成）
  search_vector tsvector
    GENERATED ALWAYS AS (
      setweight(to_tsvector('english', coalesce(name, '')), 'A') ||
      setweight(to_tsvector('english', coalesce(description, '')), 'B') ||
      setweight(to_tsvector('english', coalesce(array_to_string(tags, ' '), '')), 'C')
    ) STORED
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_skills_author ON public.skills(author_id);
CREATE INDEX IF NOT EXISTS idx_skills_visibility ON public.skills(visibility);
CREATE INDEX IF NOT EXISTS idx_skills_slug ON public.skills(slug);
CREATE INDEX IF NOT EXISTS idx_skills_tags ON public.skills USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_skills_platforms ON public.skills USING GIN(platforms);
CREATE INDEX IF NOT EXISTS idx_skills_search ON public.skills USING GIN(search_vector);
CREATE INDEX IF NOT EXISTS idx_skills_downloads ON public.skills(downloads_count DESC);
CREATE INDEX IF NOT EXISTS idx_skills_created ON public.skills(created_at DESC);

-- 触发器：自动更新 updated_at
DROP TRIGGER IF EXISTS skills_updated_at ON public.skills;
CREATE TRIGGER skills_updated_at
  BEFORE UPDATE ON public.skills
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

#### 2.2.2 skill_versions 表

```sql
-- Skill 版本表
CREATE TABLE IF NOT EXISTS public.skill_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  skill_id UUID NOT NULL REFERENCES public.skills(id) ON DELETE CASCADE,

  -- 版本信息
  version TEXT NOT NULL,                  -- 语义化版本，如 '1.0.0'
  storage_path TEXT NOT NULL,             -- Storage bucket 路径
  file_size INT,                          -- 文件大小（字节）
  file_hash TEXT,                         -- SHA256 哈希（用于校验）

  -- 版本文档
  readme TEXT,                            -- 该版本的 README（可能不同）
  changelog TEXT,                         -- 版本变更日志

  -- 元数据
  metadata JSONB DEFAULT '{}'::jsonb,     -- 扩展元数据

  -- 时间戳
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,

  -- 约束：同一 Skill 版本号唯一
  CONSTRAINT unique_skill_version UNIQUE (skill_id, version)
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_skill_versions_skill ON public.skill_versions(skill_id);
CREATE INDEX IF NOT EXISTS idx_skill_versions_created ON public.skill_versions(created_at DESC);
```

#### 2.2.3 skill_likes 表

```sql
-- 点赞表
CREATE TABLE IF NOT EXISTS public.skill_likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  skill_id UUID NOT NULL REFERENCES public.skills(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,

  -- 约束：每个用户对每个 Skill 只能点赞一次
  CONSTRAINT unique_skill_like UNIQUE (skill_id, user_id)
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_skill_likes_skill ON public.skill_likes(skill_id);
CREATE INDEX IF NOT EXISTS idx_skill_likes_user ON public.skill_likes(user_id);
```

#### 2.2.4 skill_favorites 表

```sql
-- 收藏表
CREATE TABLE IF NOT EXISTS public.skill_favorites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  skill_id UUID NOT NULL REFERENCES public.skills(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,

  -- 约束：每个用户对每个 Skill 只能收藏一次
  CONSTRAINT unique_skill_favorite UNIQUE (skill_id, user_id)
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_skill_favorites_skill ON public.skill_favorites(skill_id);
CREATE INDEX IF NOT EXISTS idx_skill_favorites_user ON public.skill_favorites(user_id);
```

#### 2.2.5 skill_installs 表

```sql
-- 安装记录表（用于统计）
CREATE TABLE IF NOT EXISTS public.skill_installs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  skill_id UUID NOT NULL REFERENCES public.skills(id) ON DELETE CASCADE,
  skill_version_id UUID REFERENCES public.skill_versions(id) ON DELETE SET NULL,
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,  -- 可为空（匿名下载）

  -- 安装来源
  install_type TEXT NOT NULL
    CHECK (install_type IN ('web', 'cli')),

  -- 客户端信息
  client_info JSONB DEFAULT '{}'::jsonb,  -- { platform, version, os }

  -- 时间戳
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_skill_installs_skill ON public.skill_installs(skill_id);
CREATE INDEX IF NOT EXISTS idx_skill_installs_user ON public.skill_installs(user_id);
CREATE INDEX IF NOT EXISTS idx_skill_installs_created ON public.skill_installs(created_at DESC);
```

### 2.3 数据库触发器与函数

#### 2.3.1 计数更新触发器

```sql
-- 点赞计数更新函数
CREATE OR REPLACE FUNCTION update_skill_likes_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.skills
    SET likes_count = likes_count + 1
    WHERE id = NEW.skill_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.skills
    SET likes_count = GREATEST(likes_count - 1, 0)
    WHERE id = OLD.skill_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- 点赞计数触发器
DROP TRIGGER IF EXISTS trigger_update_likes_count ON public.skill_likes;
CREATE TRIGGER trigger_update_likes_count
  AFTER INSERT OR DELETE ON public.skill_likes
  FOR EACH ROW EXECUTE FUNCTION update_skill_likes_count();

-- 收藏计数更新函数
CREATE OR REPLACE FUNCTION update_skill_favorites_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.skills
    SET favorites_count = favorites_count + 1
    WHERE id = NEW.skill_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.skills
    SET favorites_count = GREATEST(favorites_count - 1, 0)
    WHERE id = OLD.skill_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- 收藏计数触发器
DROP TRIGGER IF EXISTS trigger_update_favorites_count ON public.skill_favorites;
CREATE TRIGGER trigger_update_favorites_count
  AFTER INSERT OR DELETE ON public.skill_favorites
  FOR EACH ROW EXECUTE FUNCTION update_skill_favorites_count();

-- 下载计数更新函数
CREATE OR REPLACE FUNCTION update_skill_downloads_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.skills
  SET downloads_count = downloads_count + 1
  WHERE id = NEW.skill_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 下载计数触发器
DROP TRIGGER IF EXISTS trigger_update_downloads_count ON public.skill_installs;
CREATE TRIGGER trigger_update_downloads_count
  AFTER INSERT ON public.skill_installs
  FOR EACH ROW EXECUTE FUNCTION update_skill_downloads_count();
```

#### 2.3.2 Slug 自动生成函数

```sql
-- Slug 自动生成函数
CREATE OR REPLACE FUNCTION generate_skill_slug(skill_name TEXT)
RETURNS TEXT AS $$
DECLARE
  base_slug TEXT;
  final_slug TEXT;
  counter INT := 0;
BEGIN
  -- 基础 slug：小写、替换空格为连字符、移除特殊字符
  base_slug := lower(regexp_replace(skill_name, '[^a-zA-Z0-9]+', '-', 'g'));
  base_slug := regexp_replace(base_slug, '^-|-$', '', 'g');
  base_slug := substring(base_slug, 1, 50);  -- 限制长度

  -- 检查唯一性
  final_slug := base_slug;

  WHILE EXISTS (SELECT 1 FROM public.skills WHERE slug = final_slug) LOOP
    counter := counter + 1;
    final_slug := base_slug || '-' || counter;
  END LOOP;

  RETURN final_slug;
END;
$$ LANGUAGE plpgsql;
```

---

## 3. 认证与授权设计

### 3.1 认证架构

**复用 OPC-Starter 现有认证系统：**

```
┌─────────────────────────────────────────────────────────────────┐
│                    认证流程（复用现有）                           │
├─────────────────────────────────────────────────────────────────┤
│  1. 用户注册 → Supabase Auth                                    │
│  2. 自动创建 profile → handle_new_user() 触发器                 │
│  3. JWT Token 管理 → AuthContext                                │
│  4. 会话持久化 → Supabase Auth Session                          │
└─────────────────────────────────────────────────────────────────┘
```

### 3.2 角色与权限模型

| 角色 | 说明 | 权限范围 |
|------|------|----------|
| **游客 (Anonymous)** | 未登录用户 | 搜索、浏览公开 Skill、下载公开 Skill |
| **注册用户 (User)** | 已登录用户 | 游客权限 + 发布 Skill、点赞、收藏、管理自己的 Skill |
| **管理员 (Admin)** | 系统管理员 | 所有权限 + 管理所有 Skill、用户管理 |

### 3.3 RLS 策略设计

#### 3.3.1 skills 表 RLS

```sql
-- 启用 RLS
ALTER TABLE public.skills ENABLE ROW LEVEL SECURITY;

-- 游客可查看公开 Skill
DROP POLICY IF EXISTS skills_select_public ON public.skills;
CREATE POLICY skills_select_public ON public.skills
  FOR SELECT
  USING (visibility = 'public');

-- 登录用户可查看自己的 Skill（包括草稿和私有）
DROP POLICY IF EXISTS skills_select_own ON public.skills;
CREATE POLICY skills_select_own ON public.skills
  FOR SELECT
  USING (auth.uid() = author_id);

-- 登录用户可创建 Skill
DROP POLICY IF EXISTS skills_insert ON public.skills;
CREATE POLICY skills_insert ON public.skills
  FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL AND auth.uid() = author_id);

-- 作者可更新自己的 Skill
DROP POLICY IF EXISTS skills_update ON public.skills;
CREATE POLICY skills_update ON public.skills
  FOR UPDATE
  USING (auth.uid() = author_id)
  WITH CHECK (auth.uid() = author_id);

-- 作者可删除自己的 Skill
DROP POLICY IF EXISTS skills_delete ON public.skills;
CREATE POLICY skills_delete ON public.skills
  FOR DELETE
  USING (auth.uid() = author_id);
```

#### 3.3.2 skill_versions 表 RLS

```sql
-- 启用 RLS
ALTER TABLE public.skill_versions ENABLE ROW LEVEL SECURITY;

-- 可查看版本的 Skill 权限（跟随 skills 表）
DROP POLICY IF EXISTS skill_versions_select ON public.skill_versions;
CREATE POLICY skill_versions_select ON public.skill_versions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.skills
      WHERE skills.id = skill_versions.skill_id
        AND (skills.visibility = 'public' OR skills.author_id = auth.uid())
    )
  );

-- 作者可创建版本
DROP POLICY IF EXISTS skill_versions_insert ON public.skill_versions;
CREATE POLICY skill_versions_insert ON public.skill_versions
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.skills
      WHERE skills.id = skill_versions.skill_id AND skills.author_id = auth.uid()
    )
  );

-- 作者可删除版本
DROP POLICY IF EXISTS skill_versions_delete ON public.skill_versions;
CREATE POLICY skill_versions_delete ON public.skill_versions
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.skills
      WHERE skills.id = skill_versions.skill_id AND skills.author_id = auth.uid()
    )
  );
```

#### 3.3.3 skill_likes 表 RLS

```sql
-- 启用 RLS
ALTER TABLE public.skill_likes ENABLE ROW LEVEL SECURITY;

-- 所有人可查看点赞记录
DROP POLICY IF EXISTS skill_likes_select ON public.skill_likes;
CREATE POLICY skill_likes_select ON public.skill_likes
  FOR SELECT
  USING (true);

-- 登录用户可点赞
DROP POLICY IF EXISTS skill_likes_insert ON public.skill_likes;
CREATE POLICY skill_likes_insert ON public.skill_likes
  FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL AND auth.uid() = user_id);

-- 用户可取消自己的点赞
DROP POLICY IF EXISTS skill_likes_delete ON public.skill_likes;
CREATE POLICY skill_likes_delete ON public.skill_likes
  FOR DELETE
  USING (auth.uid() = user_id);
```

#### 3.3.4 skill_favorites 表 RLS

```sql
-- 启用 RLS
ALTER TABLE public.skill_favorites ENABLE ROW LEVEL SECURITY;

-- 用户可查看自己的收藏
DROP POLICY IF EXISTS skill_favorites_select ON public.skill_favorites;
CREATE POLICY skill_favorites_select ON public.skill_favorites
  FOR SELECT
  USING (auth.uid() = user_id);

-- 登录用户可收藏
DROP POLICY IF EXISTS skill_favorites_insert ON public.skill_favorites;
CREATE POLICY skill_favorites_insert ON public.skill_favorites
  FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL AND auth.uid() = user_id);

-- 用户可取消自己的收藏
DROP POLICY IF EXISTS skill_favorites_delete ON public.skill_favorites;
CREATE POLICY skill_favorites_delete ON public.skill_favorites
  FOR DELETE
  USING (auth.uid() = user_id);
```

#### 3.3.5 skill_installs 表 RLS

```sql
-- 启用 RLS
ALTER TABLE public.skill_installs ENABLE ROW LEVEL SECURITY;

-- 用户可查看自己的安装记录
DROP POLICY IF EXISTS skill_installs_select ON public.skill_installs;
CREATE POLICY skill_installs_select ON public.skill_installs
  FOR SELECT
  USING (auth.uid() = user_id OR user_id IS NULL);

-- 所有人可创建安装记录（包括匿名）
DROP POLICY IF EXISTS skill_installs_insert ON public.skill_installs;
CREATE POLICY skill_installs_insert ON public.skill_installs
  FOR INSERT
  WITH CHECK (true);
```

### 3.4 权限检查流程

```
┌─────────────────────────────────────────────────────────────────┐
│                    权限检查流程                                  │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  请求 → Supabase Auth 验证 JWT                                  │
│           │                                                     │
│           ▼                                                     │
│  PostgREST/Edge Function → RLS 策略检查                         │
│           │                                                     │
│           ├── 游客 → visibility = 'public'                      │
│           │                                                     │
│           ├── 登录用户 → visibility = 'public'                  │
│           │                  OR author_id = auth.uid()          │
│           │                                                     │
│           └── 管理员 → 绕过 RLS (service_role)                  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 4. 存储设计

### 4.1 Storage Bucket 配置

```sql
-- 创建 skills bucket（私有）
INSERT INTO storage.buckets (id, name, public)
VALUES ('skills', 'skills', false)
ON CONFLICT (id) DO NOTHING;
```

### 4.2 文件路径规范

```
skills/
├── {author_id}/                    -- 作者目录
│   ├── {skill_slug}/               -- Skill 目录
│   │   ├── {version}/              -- 版本目录
│   │   │   ├── package.zip         -- Skill 包文件
│   │   │   └── package.hash        -- SHA256 哈希
│   │   └── ...
│   └── ...
└── ...
```

**示例：**
```
skills/
├── 550e8400-e29b-41d4-a716-446655440000/
│   ├── react-component-generator/
│   │   ├── 1.0.0/
│   │   │   └── package.zip
│   │   ├── 1.1.0/
│   │   │   └── package.zip
│   │   └── 2.0.0/
│   │       └── package.zip
│   └── api-docs-generator/
│       └── 1.0.0/
│           └── package.zip
```

### 4.3 Storage RLS 策略

```sql
-- 作者可上传自己的 Skill 文件
DROP POLICY IF EXISTS skills_upload ON storage.objects;
CREATE POLICY skills_upload ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'skills' AND
    auth.uid()::text = split_part(name, '/', 1)
  );

-- 作者可删除自己的 Skill 文件
DROP POLICY IF EXISTS skills_delete ON storage.objects;
CREATE POLICY skills_delete ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'skills' AND
    auth.uid()::text = split_part(name, '/', 1)
  );

-- 公开 Skill 的文件可下载（通过 Edge Function 签名 URL）
-- 不直接暴露 Storage，而是通过 Edge Function 控制访问
```

### 4.4 文件上传流程

```
┌─────────────────────────────────────────────────────────────────┐
│                    文件上传流程                                  │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  1. 前端调用 skills-publish Edge Function                       │
│     │                                                           │
│     ▼                                                           │
│  2. Edge Function 验证用户权限和文件格式                         │
│     │                                                           │
│     ▼                                                           │
│  3. Edge Function 生成预签名上传 URL                            │
│     │                                                           │
│     ▼                                                           │
│  4. 前端直接上传到 Storage                                      │
│     │                                                           │
│     ▼                                                           │
│  5. 上传完成后，Edge Function 创建版本记录                      │
│     │                                                           │
│     ▼                                                           │
│  6. 更新 skills 表的 latest_version                             │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 4.5 文件下载流程

```
┌─────────────────────────────────────────────────────────────────┐
│                    文件下载流程                                  │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Web 下载：                                                     │
│  1. 前端调用 skills-download Edge Function                      │
│     │                                                           │
│     ▼                                                           │
│  2. Edge Function 检查 Skill 可见性                             │
│     │                                                           │
│     ▼                                                           │
│  3. Edge Function 生成签名下载 URL（有效期 5 分钟）             │
│     │                                                           │
│     ▼                                                           │
│  4. 记录安装日志到 skill_installs                               │
│     │                                                           │
│     ▼                                                           │
│  5. 返回签名 URL，前端触发下载                                  │
│                                                                 │
│  CLI 安装：                                                     │
│  1. CLI 调用 skills-download Edge Function                      │
│     │                                                           │
│     ▼                                                           │
│  2. Edge Function 返回签名 URL                                  │
│     │                                                           │
│     ▼                                                           │
│  3. CLI 下载并解压到 .qoder/skills/{skill-slug}/                │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 5. API 设计

### 5.1 PostgREST API

Skills Hub 优先使用 PostgREST 直接访问数据库，利用 RLS 策略保护数据安全。

#### 5.1.1 Skill 搜索与浏览

```http
# 搜索 Skill（全文搜索）
GET /rest/v1/skills?select=id,name,slug,description,downloads_count,likes_count,tags,platforms,author:profiles(id,full_name,avatar_url)&or=(name.ilike.%25{keyword}%25,description.ilike.%25{keyword}%25,tags.cs.{{{keyword}}})&visibility=eq.public&order=downloads_count.desc&limit=20

# 按标签筛选
GET /rest/v1/skills?select=...&tags=cs.{react,typescript}&visibility=eq.public

# 按平台筛选
GET /rest/v1/skills?select=...&platforms=cs.{cursor}&visibility=eq.public

# 获取热门 Skill
GET /rest/v1/skills?select=...&visibility=eq.public&order=downloads_count.desc&limit=10

# 获取最新 Skill
GET /rest/v1/skills?select=...&visibility=eq.public&order=created_at.desc&limit=10
```

#### 5.1.2 Skill 详情

```http
# 获取 Skill 详情
GET /rest/v1/skills?select=*,author:profiles(id,full_name,avatar_url),versions:skill_versions(id,version,created_at,file_size)&slug=eq.{slug}&visibility=eq.public

# 获取 Skill 版本列表
GET /rest/v1/skill_versions?select=*&skill_id=eq.{skill_id}&order=created_at.desc
```

#### 5.1.3 用户操作

```http
# 点赞 Skill
POST /rest/v1/skill_likes
Content-Type: application/json
{
  "skill_id": "{skill_id}",
  "user_id": "{user_id}"
}

# 取消点赞
DELETE /rest/v1/skill_likes?skill_id=eq.{skill_id}&user_id=eq.{user_id}

# 收藏 Skill
POST /rest/v1/skill_favorites
Content-Type: application/json
{
  "skill_id": "{skill_id}",
  "user_id": "{user_id}"
}

# 取消收藏
DELETE /rest/v1/skill_favorites?skill_id=eq.{skill_id}&user_id=eq.{user_id}

# 获取用户收藏列表
GET /rest/v1/skill_favorites?select=*,skill:skills(id,name,slug,description,downloads_count,likes_count)&user_id=eq.{user_id}
```

#### 5.1.4 作者操作

```http
# 创建 Skill
POST /rest/v1/skills
Content-Type: application/json
{
  "name": "React Component Generator",
  "description": "Generate React components with TypeScript",
  "tags": ["react", "typescript"],
  "platforms": ["qoder", "cursor"],
  "visibility": "public",
  "author_id": "{user_id}"
}

# 更新 Skill
PATCH /rest/v1/skills?id=eq.{skill_id}
Content-Type: application/json
{
  "description": "Updated description",
  "tags": ["react", "typescript", "testing"]
}

# 删除 Skill
DELETE /rest/v1/skills?id=eq.{skill_id}

# 获取用户发布的 Skill
GET /rest/v1/skills?select=*&author_id=eq.{user_id}
```

### 5.2 Edge Functions

对于需要服务端逻辑的操作，使用 Supabase Edge Functions。

#### 5.2.1 skills-publish

**职责：** Skill 发布流程管理

```typescript
// POST /functions/v1/skills-publish
// Request
{
  "action": "create" | "update" | "publish_version",
  "skill_id": "uuid?",          // update/publish_version 时需要
  "name": "string?",            // create 时需要
  "description": "string?",
  "tags": ["string"],
  "platforms": ["string"],
  "visibility": "draft" | "public" | "private",
  "version": "string",          // publish_version 时需要
  "file_size": number           // publish_version 时需要
}

// Response
{
  "success": true,
  "skill": { ... },
  "upload_url": "signed-url-for-upload",  // publish_version 时返回
  "storage_path": "path/to/store"
}
```

**流程：**
1. 验证用户认证
2. 创建/更新 Skill 元数据
3. 生成 Storage 上传签名 URL
4. 返回签名 URL 供前端上传

#### 5.2.2 skills-download

**职责：** 下载签名 URL 生成 + 安装记录

```typescript
// POST /functions/v1/skills-download
// Request
{
  "skill_slug": "string",
  "version": "string?",  // 可选，默认最新版本
  "install_type": "web" | "cli",
  "client_info": {
    "platform": "string",
    "version": "string",
    "os": "string"
  }
}

// Response
{
  "success": true,
  "download_url": "signed-url-for-download",
  "version": "1.0.0",
  "file_size": 102400,
  "file_hash": "sha256..."
}
```

**流程：**
1. 验证 Skill 可见性
2. 获取版本信息
3. 生成签名下载 URL（有效期 5 分钟）
4. 记录安装日志
5. 返回签名 URL

#### 5.2.3 skills-search

**职责：** 高级搜索 API（可选，PostgREST 足够时可不实现）

```typescript
// POST /functions/v1/skills-search
// Request
{
  "query": "string",
  "filters": {
    "tags": ["string"],
    "platforms": ["string"],
    "author_id": "uuid?"
  },
  "sort": "downloads" | "likes" | "created_at" | "relevance",
  "page": 1,
  "per_page": 20
}

// Response
{
  "results": [...],
  "total": 100,
  "page": 1,
  "per_page": 20
}
```

### 5.3 CLI API

CLI 工具通过 Edge Functions 与平台交互。

```bash
# 安装 Skill
skill-hub install <skill-slug>[@version]

# 内部调用
POST /functions/v1/skills-download
{
  "skill_slug": "react-component-generator",
  "version": "1.0.0",
  "install_type": "cli",
  "client_info": {
    "platform": "qoder",
    "version": "0.8.0",
    "os": "macos"
  }
}
```

---

## 6. 前端架构

### 6.1 目录结构

```
app/src/
├── pages/
│   ├── skills/                    # Skills Hub 页面
│   │   ├── HomePage.tsx           # 首页（搜索 + 推荐）
│   │   ├── SearchPage.tsx         # 搜索结果页
│   │   ├── SkillDetailPage.tsx    # Skill 详情页
│   │   ├── PublishPage.tsx        # 发布页
│   │   ├── UserSkillsPage.tsx     # 用户发布的 Skill
│   │   └── UserFavoritesPage.tsx  # 用户收藏
│   └── ...
│
├── components/
│   ├── skills/                    # Skills Hub 组件
│   │   ├── SkillCard.tsx          # Skill 卡片
│   │   ├── SearchBar.tsx          # 搜索栏
│   │   ├── InstallCommand.tsx     # CLI 命令复制
│   │   ├── VersionSelector.tsx    # 版本选择器
│   │   ├── AuthorCard.tsx         # 作者卡片
│   │   ├── StatsBadge.tsx         # 统计徽章
│   │   ├── SkillPublishForm.tsx   # 发布表单
│   │   ├── FileUploader.tsx       # 文件上传
│   │   └── EmptyState.tsx         # 空状态
│   └── ...
│
├── services/
│   ├── skill/                     # Skill 服务层
│   │   ├── skillService.ts        # Skill CRUD
│   │   ├── skillSearchService.ts  # 搜索服务
│   │   └── skillStorageService.ts # 文件上传/下载
│   └── ...
│
├── stores/
│   ├── useSkillStore.ts           # Skill 状态管理
│   ├── useSearchStore.ts          # 搜索状态管理
│   └── ...
│
├── hooks/
│   ├── useSkill.ts                # Skill 操作 Hook
│   ├── useSkillSearch.ts          # 搜索 Hook
│   ├── useSkillLike.ts            # 点赞 Hook
│   ├── useSkillFavorite.ts        # 收藏 Hook
│   └── ...
│
├── types/
│   ├── skill.ts                   # Skill 类型定义
│   └── ...
│
└── config/
    └── routes.tsx                 # 路由配置（添加 Skills Hub 路由）
```

### 6.2 核心类型定义

```typescript
// types/skill.ts

/** Skill 可见性 */
export type SkillVisibility = 'draft' | 'public' | 'private';

/** 支持的平台 */
export type SkillPlatform = 'qoder' | 'cursor' | 'claude' | 'cline' | 'windsurf';

/** Skill 主表 */
export interface Skill {
  id: string;
  author_id: string;
  name: string;
  slug: string;
  description: string | null;
  readme: string | null;
  visibility: SkillVisibility;
  tags: string[];
  platforms: SkillPlatform[];
  latest_version: string | null;
  downloads_count: number;
  likes_count: number;
  favorites_count: number;
  created_at: string;
  updated_at: string;
  published_at: string | null;

  // 关联数据
  author?: SkillAuthor;
  versions?: SkillVersion[];
  is_liked?: boolean;
  is_favorited?: boolean;
}

/** Skill 作者信息 */
export interface SkillAuthor {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
}

/** Skill 版本 */
export interface SkillVersion {
  id: string;
  skill_id: string;
  version: string;
  storage_path: string;
  file_size: number | null;
  file_hash: string | null;
  readme: string | null;
  changelog: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

/** 搜索参数 */
export interface SkillSearchParams {
  query?: string;
  tags?: string[];
  platforms?: SkillPlatform[];
  author_id?: string;
  sort?: 'downloads' | 'likes' | 'created_at' | 'relevance';
  page?: number;
  per_page?: number;
}

/** 搜索结果 */
export interface SkillSearchResult {
  results: Skill[];
  total: number;
  page: number;
  per_page: number;
}
```

### 6.3 服务层设计

```typescript
// services/skill/skillService.ts

import { supabase } from '@/lib/supabase/client';
import type { Skill, SkillVersion, SkillSearchParams, SkillSearchResult } from '@/types/skill';

/**
 * SkillService - Skill CRUD 操作
 */
export const skillService = {
  /**
   * 获取 Skill 详情
   */
  async getBySlug(slug: string): Promise<Skill | null> {
    const { data, error } = await supabase
      .from('skills')
      .select(`
        *,
        author:profiles(id, full_name, avatar_url),
        versions:skill_versions(id, version, created_at, file_size)
      `)
      .eq('slug', slug)
      .eq('visibility', 'public')
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * 搜索 Skill
   */
  async search(params: SkillSearchParams): Promise<SkillSearchResult> {
    // 实现搜索逻辑
  },

  /**
   * 创建 Skill
   */
  async create(skill: Partial<Skill>): Promise<Skill> {
    const { data, error } = await supabase
      .from('skills')
      .insert(skill)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * 更新 Skill
   */
  async update(id: string, updates: Partial<Skill>): Promise<Skill> {
    const { data, error } = await supabase
      .from('skills')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * 删除 Skill
   */
  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('skills')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },

  /**
   * 点赞 Skill
   */
  async like(skillId: string, userId: string): Promise<void> {
    const { error } = await supabase
      .from('skill_likes')
      .insert({ skill_id: skillId, user_id: userId });

    if (error) throw error;
  },

  /**
   * 取消点赞
   */
  async unlike(skillId: string, userId: string): Promise<void> {
    const { error } = await supabase
      .from('skill_likes')
      .delete()
      .eq('skill_id', skillId)
      .eq('user_id', userId);

    if (error) throw error;
  },

  /**
   * 收藏 Skill
   */
  async favorite(skillId: string, userId: string): Promise<void> {
    const { error } = await supabase
      .from('skill_favorites')
      .insert({ skill_id: skillId, user_id: userId });

    if (error) throw error;
  },

  /**
   * 取消收藏
   */
  async unfavorite(skillId: string, userId: string): Promise<void> {
    const { error } = await supabase
      .from('skill_favorites')
      .delete()
      .eq('skill_id', skillId)
      .eq('user_id', userId);

    if (error) throw error;
  },
};
```

### 6.4 状态管理设计

```typescript
// stores/useSkillStore.ts

import { create } from 'zustand';
import type { Skill, SkillSearchParams } from '@/types/skill';

interface SkillState {
  // 搜索状态
  searchParams: SkillSearchParams;
  searchResults: Skill[];
  isSearching: boolean;

  // 当前 Skill
  currentSkill: Skill | null;
  isLoading: boolean;

  // 用户 Skill
  userSkills: Skill[];
  userFavorites: Skill[];

  // Actions
  setSearchParams: (params: Partial<SkillSearchParams>) => void;
  search: () => Promise<void>;
  loadSkill: (slug: string) => Promise<void>;
  loadUserSkills: (userId: string) => Promise<void>;
  loadUserFavorites: (userId: string) => Promise<void>;
  like: (skillId: string, userId: string) => Promise<void>;
  unlike: (skillId: string, userId: string) => Promise<void>;
  favorite: (skillId: string, userId: string) => Promise<void>;
  unfavorite: (skillId: string, userId: string) => Promise<void>;
}

export const useSkillStore = create<SkillState>((set, get) => ({
  // 初始状态
  searchParams: { sort: 'downloads', per_page: 20 },
  searchResults: [],
  isSearching: false,
  currentSkill: null,
  isLoading: false,
  userSkills: [],
  userFavorites: [],

  // Actions 实现
  setSearchParams: (params) => {
    set((state) => ({
      searchParams: { ...state.searchParams, ...params },
    }));
  },

  search: async () => {
    const { searchParams } = get();
    set({ isSearching: true });
    try {
      const result = await skillService.search(searchParams);
      set({ searchResults: result.results });
    } finally {
      set({ isSearching: false });
    }
  },

  // ... 其他 actions
}));
```

### 6.5 路由配置

```typescript
// config/routes.tsx

import { HomePage, SearchPage, SkillDetailPage, PublishPage, UserSkillsPage, UserFavoritesPage } from '@/pages/skills';

export const routes = [
  // ... 现有路由

  // Skills Hub 路由
  {
    path: '/',
    element: <HomePage />,
    // 首页不需要认证
  },
  {
    path: '/search',
    element: <SearchPage />,
    // 搜索不需要认证
  },
  {
    path: '/skill/:slug',
    element: <SkillDetailPage />,
    // 详情页不需要认证
  },
  {
    path: '/publish',
    element: <PublishPage />,
    // 发布需要认证
    loader: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw redirect('/login');
      return null;
    },
  },
  {
    path: '/my-skills',
    element: <UserSkillsPage />,
    // 需要认证
  },
  {
    path: '/favorites',
    element: <UserFavoritesPage />,
    // 需要认证
  },
];
```

---

## 7. 部署架构

### 7.1 部署拓扑

```
┌─────────────────────────────────────────────────────────────────┐
│                        用户访问层                                │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐  │
│  │ Web 浏览器  │  │ CLI 工具    │  │ 未来：Cloud Platform    │  │
│  └─────────────┘  └─────────────┘  └─────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
         │                   │                    │
         ▼                   ▼                    ▼
┌─────────────────────────────────────────────────────────────────┐
│                      ESA Pages (CDN)                             │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ 静态资源 (React SPA)                                         ││
│  │  • HTML/CSS/JS                                               ││
│  │  • 图片/字体                                                  ││
│  │  • 全球 CDN 分发                                              ││
│  └─────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Supabase Cloud                              │
│  ┌───────────┐ ┌───────────┐ ┌───────────┐ ┌─────────────────┐  │
│  │ API       │ │ Auth      │ │ Database  │ │ Storage         │  │
│  │ Gateway   │ │ Service   │ │ (Postgres)│ │ (S3 Compatible) │  │
│  └───────────┘ └───────────┘ └───────────┘ └─────────────────┘  │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │ Edge Functions (Deno)                                     │  │
│  │  • skills-publish                                          │  │
│  │  • skills-download                                         │  │
│  │  • skills-stats                                            │  │
│  └───────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

### 7.2 环境配置

```yaml
# 环境变量
production:
  VITE_SUPABASE_URL: https://xxx.supabase.co
  VITE_SUPABASE_ANON_KEY: eyJxxx...
  SUPABASE_SERVICE_ROLE_KEY: eyJxxx...  # 仅 Edge Functions 使用

staging:
  VITE_SUPABASE_URL: https://xxx-staging.supabase.co
  VITE_SUPABASE_ANON_KEY: eyJxxx...
  SUPABASE_SERVICE_ROLE_KEY: eyJxxx...
```

### 7.3 CI/CD 流程

```yaml
# .github/workflows/deploy.yml
name: Deploy Skills Hub

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  quality:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - run: npm ci
      - run: npm run lint
      - run: npm run type-check
      - run: npm run test

  deploy:
    needs: quality
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm ci
      - run: npm run build
      - name: Deploy to ESA Pages
        run: |
          # ESA 部署命令
          npx esa-pages deploy --dir=dist

  deploy-edge-functions:
    needs: quality
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: supabase/setup-cli@v1
      - run: supabase functions deploy skills-publish
      - run: supabase functions deploy skills-download
      - run: supabase functions deploy skills-stats
```

---

## 8. 安全考量

### 8.1 安全威胁模型

| 威胁 | 风险等级 | 缓解措施 |
|------|----------|----------|
| **未授权访问** | 高 | RLS 策略 + JWT 验证 |
| **恶意文件上传** | 高 | 文件类型校验 + 大小限制 + 病毒扫描 |
| **XSS 攻击** | 中 | README 渲染使用 DOMPurify |
| **CSRF 攻击** | 中 | SameSite Cookie + CSRF Token |
| **SQL 注入** | 低 | PostgREST 参数化查询 |
| **DDoS 攻击** | 中 | CDN + Rate Limiting |
| **数据泄露** | 高 | RLS 策略 + 最小权限原则 |

### 8.2 安全措施

#### 8.2.1 认证与授权

```typescript
// Edge Function 认证中间件
import { createClient } from '@supabase/supabase-js';

export async function authenticate(request: Request) {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    throw new Error('Unauthorized');
  }

  const token = authHeader.slice(7);
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  const { data: { user }, error } = await supabase.auth.getUser(token);

  if (error || !user) {
    throw new Error('Unauthorized');
  }

  return user;
}
```

#### 8.2.2 文件上传安全

```typescript
// 文件验证
const ALLOWED_TYPES = ['application/zip', 'application/x-tar', 'application/gzip'];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export function validateFile(file: File): void {
  if (!ALLOWED_TYPES.includes(file.type)) {
    throw new Error('Invalid file type. Only ZIP/TAR/GZ are allowed.');
  }

  if (file.size > MAX_FILE_SIZE) {
    throw new Error('File size exceeds 10MB limit.');
  }
}

// 文件名安全处理
export function sanitizeFileName(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, '_');
}
```

#### 8.2.3 README 渲染安全

```typescript
import DOMPurify from 'dompurify';
import { marked } from 'marked';

export function renderReadme(markdown: string): string {
  // 1. 解析 Markdown
  const html = marked(markdown);

  // 2. 清理 XSS
  const clean = DOMPurify.sanitize(html, {
    ALLOWED_TAGS: [
      'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
      'p', 'br', 'hr',
      'ul', 'ol', 'li',
      'a', 'strong', 'em', 'code', 'pre',
      'blockquote', 'table', 'thead', 'tbody', 'tr', 'td', 'th',
      'img',
    ],
    ALLOWED_ATTR: ['href', 'src', 'alt', 'title', 'class'],
    ALLOW_DATA_ATTR: false,
  });

  return clean;
}
```

### 8.3 Rate Limiting

```typescript
// Edge Function Rate Limiting
const RATE_LIMITS = {
  'skills-publish': { requests: 10, window: 60 },  // 10 次/分钟
  'skills-download': { requests: 100, window: 60 }, // 100 次/分钟
};

export async function checkRateLimit(
  userId: string,
  endpoint: string
): Promise<boolean> {
  const limit = RATE_LIMITS[endpoint];
  const key = `ratelimit:${endpoint}:${userId}`;

  // 使用 Redis 或 KV 存储实现
  // ...
}
```

---

## 9. 性能优化策略

### 9.1 数据库优化

#### 9.1.1 索引策略

```sql
-- 全文搜索索引（GIN）
CREATE INDEX idx_skills_search ON skills USING GIN(search_vector);

-- 高频查询索引
CREATE INDEX idx_skills_visibility_downloads ON skills(visibility, downloads_count DESC);
CREATE INDEX idx_skills_visibility_created ON skills(visibility, created_at DESC);

-- 标签/平台数组索引
CREATE INDEX idx_skills_tags ON skills USING GIN(tags);
CREATE INDEX idx_skills_platforms ON skills USING GIN(platforms);

-- 外键索引
CREATE INDEX idx_skill_versions_skill ON skill_versions(skill_id);
CREATE INDEX idx_skill_likes_skill ON skill_likes(skill_id);
CREATE INDEX idx_skill_favorites_user ON skill_favorites(user_id);
```

#### 9.1.2 查询优化

```sql
-- 使用物化视图预计算热门 Skill（每小时刷新）
CREATE MATERIALIZED VIEW IF NOT EXISTS popular_skills AS
SELECT
  s.id,
  s.name,
  s.slug,
  s.description,
  s.downloads_count,
  s.likes_count,
  s.tags,
  s.platforms,
  p.full_name as author_name,
  p.avatar_url as author_avatar
FROM skills s
JOIN profiles p ON p.id = s.author_id
WHERE s.visibility = 'public'
ORDER BY (s.downloads_count * 0.6 + s.likes_count * 0.4) DESC
LIMIT 100;

CREATE UNIQUE INDEX idx_popular_skills_id ON popular_skills(id);

-- 定时刷新（通过 pg_cron）
SELECT cron.schedule('refresh-popular-skills', '0 * * * *', 'REFRESH MATERIALIZED VIEW CONCURRENTLY popular_skills');
```

### 9.2 前端优化

#### 9.2.1 代码分割

```typescript
// 路由级懒加载
const SkillDetailPage = lazy(() => import('@/pages/skills/SkillDetailPage'));
const PublishPage = lazy(() => import('@/pages/skills/PublishPage'));
const UserSkillsPage = lazy(() => import('@/pages/skills/UserSkillsPage'));
```

#### 9.2.2 图片优化

```typescript
// 使用 Supabase 图片变换
const avatarUrl = supabase.storage
  .from('avatars')
  .getPublicUrl(path, {
    transform: {
      width: 100,
      height: 100,
      resize: 'cover',
    },
  });
```

#### 9.2.3 列表虚拟化

```typescript
// 大列表使用虚拟滚动
import { useVirtualizer } from '@tanstack/react-virtual';

function SkillList({ skills }: { skills: Skill[] }) {
  const virtualizer = useVirtualizer({
    count: skills.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 200, // 每个卡片高度
    overscan: 5,
  });

  return (
    <div ref={parentRef} style={{ height: '100vh', overflow: 'auto' }}>
      <div style={{ height: virtualizer.getTotalSize() }}>
        {virtualizer.getVirtualItems().map((virtualItem) => (
          <SkillCard
            key={skills[virtualItem.index].id}
            skill={skills[virtualItem.index]}
            style={{
              position: 'absolute',
              transform: `translateY(${virtualItem.start}px)`,
            }}
          />
        ))}
      </div>
    </div>
  );
}
```

### 9.3 缓存策略

#### 9.3.1 浏览器缓存

```typescript
// Service Worker 缓存静态资源
// sw.js
const CACHE_NAME = 'skills-hub-v1';
const STATIC_ASSETS = [
  '/',
  '/search',
  '/static/js/main.js',
  '/static/css/main.css',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
});
```

#### 9.3.2 API 缓存

```typescript
// React Query 缓存
import { useQuery } from '@tanstack/react-query';

export function useSkill(slug: string) {
  return useQuery({
    queryKey: ['skill', slug],
    queryFn: () => skillService.getBySlug(slug),
    staleTime: 5 * 60 * 1000, // 5 分钟
    cacheTime: 30 * 60 * 1000, // 30 分钟
  });
}
```

### 9.4 CDN 优化

```
# ESA Pages 缓存规则
/*      Cache-Control: public, max-age=3600, stale-while-revalidate=86400
/api/*  Cache-Control: no-cache
/static/* Cache-Control: public, max-age=31536000, immutable
```

---

## 10. 监控与运维

### 10.1 监控指标

| 指标 | 目标 | 告警阈值 |
|------|------|----------|
| **搜索响应时间** | P95 < 200ms | P95 > 500ms |
| **页面加载时间** | P95 < 1.5s | P95 > 3s |
| **API 错误率** | < 0.1% | > 1% |
| **安装成功率** | > 98% | < 95% |
| **数据库连接数** | < 50 | > 80 |

### 10.2 日志规范

```typescript
// 结构化日志
interface LogEntry {
  timestamp: string;
  level: 'debug' | 'info' | 'warn' | 'error';
  service: 'web' | 'edge-function' | 'cli';
  trace_id: string;
  user_id?: string;
  action: string;
  duration_ms?: number;
  error?: string;
  metadata: Record<string, unknown>;
}

// 示例日志
{
  "timestamp": "2026-03-19T10:00:00Z",
  "level": "info",
  "service": "edge-function",
  "trace_id": "abc123",
  "user_id": "user-uuid",
  "action": "skill_download",
  "duration_ms": 150,
  "metadata": {
    "skill_slug": "react-component-generator",
    "version": "1.0.0",
    "install_type": "cli"
  }
}
```

### 10.3 健康检查

```typescript
// Edge Function 健康检查
Deno.serve(async (req: Request) => {
  if (req.url.endsWith('/health')) {
    return new Response(JSON.stringify({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: Deno.env.get('DENO_DEPLOYMENT_ID'),
    }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }
  // ... 正常处理
});
```

---

## 11. 扩展性设计

### 11.1 未来功能预留

| 功能 | 数据模型预留 | API 预留 |
|------|-------------|----------|
| **评论系统** | `skill_comments` 表 | `/rest/v1/skill_comments` |
| **付费 Skill** | `price` 字段、`skill_purchases` 表 | Edge Function 处理支付 |
| **云端安装** | `skill_cloud_installs` 表 | `skills-cloud-sync` Edge Function |
| **企业版** | `organizations` 关联、私有 Registry | 多租户隔离 |
| **推荐算法** | `skill_recommendations` 物化视图 | `skills-recommend` Edge Function |

### 11.2 水平扩展

```
┌─────────────────────────────────────────────────────────────────┐
│                    未来扩展架构                                  │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  当前：单 Supabase 项目                                         │
│                                                                 │
│  扩展：                                                         │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐  │
│  │ 读副本      │  │ 搜索服务    │  │ 文件存储                 │  │
│  │ (Postgres   │  │ (Meilisearch│  │ (S3/CloudFlare R2)      │  │
│  │ Replica)    │  │ /Algolia)   │  │                         │  │
│  └─────────────┘  └─────────────┘  └─────────────────────────┘  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 12. Migration 计划

### 12.1 Migration 文件清单

| 序号 | 文件名 | 说明 |
|------|--------|------|
| 00002 | `00002_add_skills_tables.sql` | 创建 Skills Hub 核心表 |
| 00003 | `00003_add_skills_rls.sql` | 添加 RLS 策略 |
| 00004 | `00004_add_skills_functions.sql` | 添加触发器和函数 |
| 00005 | `00005_add_skills_storage.sql` | 配置 Storage Bucket |

### 12.2 Migration 执行顺序

```
1. 创建表结构 (00002)
   ├── skills
   ├── skill_versions
   ├── skill_likes
   ├── skill_favorites
   └── skill_installs

2. 添加 RLS 策略 (00003)
   ├── skills RLS
   ├── skill_versions RLS
   ├── skill_likes RLS
   ├── skill_favorites RLS
   └── skill_installs RLS

3. 添加触发器和函数 (00004)
   ├── update_skill_likes_count()
   ├── update_skill_favorites_count()
   ├── update_skill_downloads_count()
   └── generate_skill_slug()

4. 配置 Storage (00005)
   └── skills bucket + RLS
```

---

## 附录 A：技术决策记录 (ADR)

### ADR-001: 使用 PostgreSQL Full-Text 而非 Elasticsearch

**背景：** Skills Hub 需要搜索功能，可选方案有 PostgreSQL Full-Text、Elasticsearch、Meilisearch。

**决策：** MVP 阶段使用 PostgreSQL Full-Text。

**理由：**
- 减少运维复杂度，无需额外服务
- Supabase 内置支持，零配置
- MVP 阶段数据量小（< 5000 Skills），性能足够
- 后续可平滑迁移到 Meilisearch

### ADR-002: 计数字段冗余存储

**背景：** 点赞数、收藏数、下载数需要实时展示。

**决策：** 在 `skills` 表冗余存储计数，通过触发器同步。

**理由：**
- 避免每次查询都 JOIN + COUNT
- 提升列表页查询性能
- 触发器保证数据一致性
- 符合读多写少场景的最佳实践

### ADR-003: 文件下载通过 Edge Function 而非直接 Storage

**背景：** Skill 文件存储在 Supabase Storage，需要控制访问权限。

**决策：** 通过 Edge Function 生成签名 URL，而非直接暴露 Storage。

**理由：**
- 统一访问控制逻辑
- 记录下载日志
- 防止直接链接泄露
- 支持未来付费 Skill 的权限控制

---

## 附录 B：参考资料

- [Supabase Documentation](https://supabase.com/docs)
- [PostgreSQL Full-Text Search](https://www.postgresql.org/docs/current/textsearch.html)
- [Row Level Security Best Practices](https://supabase.com/docs/guides/auth/row-level-security)
- [OPC-Starter Architecture](/docs/Architecture.md)
- [OPC-Starter Conventions](/docs/CONVENTIONS.md)
- [Skills Hub PRD](/docs/planning-artifacts/prd.md)
- [Skills Hub UX Design](/docs/planning-artifacts/ux-design-specification.md)

---

**文档状态：** ✅ 完成

**创建者：** Design Agent
**日期：** 2026-03-19
