-- migrations/00002_add_skills_tables.sql
-- Seq: 00002
-- Name: add_skills_tables
-- Story: Epic-29
-- Description: Skills Hub 核心表创建：skills, skill_versions, skill_likes, skill_favorites, skill_installs
-- Created: 2026-03-19
-- =====================================================

-- =====================================================
-- 1. Skills 主表
-- =====================================================
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
  platforms TEXT[] DEFAULT '{}',          -- ['qoder', 'cursor', 'claude', 'cline', 'windsurf']

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

COMMENT ON TABLE public.skills IS 'Skills Hub 主表，存储 Skill 元数据';
COMMENT ON COLUMN public.skills.slug IS 'URL 友好的唯一标识，自动生成';
COMMENT ON COLUMN public.skills.visibility IS '可见性：draft(草稿), public(公开), private(私有)';
COMMENT ON COLUMN public.skills.platforms IS '兼容平台：qoder, cursor, claude, cline, windsurf';
COMMENT ON COLUMN public.skills.search_vector IS '全文搜索向量，自动从 name/description/tags 生成';

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
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =====================================================
-- 2. Skill 版本表
-- =====================================================
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

COMMENT ON TABLE public.skill_versions IS 'Skill 版本表，存储每个版本的文件和元数据';
COMMENT ON COLUMN public.skill_versions.storage_path IS 'Supabase Storage 中的文件路径';
COMMENT ON COLUMN public.skill_versions.file_hash IS 'SHA256 哈希，用于文件完整性校验';

-- 索引
CREATE INDEX IF NOT EXISTS idx_skill_versions_skill ON public.skill_versions(skill_id);
CREATE INDEX IF NOT EXISTS idx_skill_versions_created ON public.skill_versions(created_at DESC);

-- =====================================================
-- 3. 点赞表
-- =====================================================
CREATE TABLE IF NOT EXISTS public.skill_likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  skill_id UUID NOT NULL REFERENCES public.skills(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,

  -- 约束：每个用户对每个 Skill 只能点赞一次
  CONSTRAINT unique_skill_like UNIQUE (skill_id, user_id)
);

COMMENT ON TABLE public.skill_likes IS 'Skill 点赞记录';

-- 索引
CREATE INDEX IF NOT EXISTS idx_skill_likes_skill ON public.skill_likes(skill_id);
CREATE INDEX IF NOT EXISTS idx_skill_likes_user ON public.skill_likes(user_id);

-- =====================================================
-- 4. 收藏表
-- =====================================================
CREATE TABLE IF NOT EXISTS public.skill_favorites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  skill_id UUID NOT NULL REFERENCES public.skills(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,

  -- 约束：每个用户对每个 Skill 只能收藏一次
  CONSTRAINT unique_skill_favorite UNIQUE (skill_id, user_id)
);

COMMENT ON TABLE public.skill_favorites IS 'Skill 收藏记录';

-- 索引
CREATE INDEX IF NOT EXISTS idx_skill_favorites_skill ON public.skill_favorites(skill_id);
CREATE INDEX IF NOT EXISTS idx_skill_favorites_user ON public.skill_favorites(user_id);

-- =====================================================
-- 5. 安装记录表（用于统计）
-- =====================================================
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

COMMENT ON TABLE public.skill_installs IS 'Skill 安装/下载记录，用于统计';
COMMENT ON COLUMN public.skill_installs.install_type IS '安装来源：web(网页下载) 或 cli(命令行安装)';
COMMENT ON COLUMN public.skill_installs.client_info IS '客户端信息，如 { platform: "qoder", version: "0.8.0", os: "macos" }';

-- 索引
CREATE INDEX IF NOT EXISTS idx_skill_installs_skill ON public.skill_installs(skill_id);
CREATE INDEX IF NOT EXISTS idx_skill_installs_user ON public.skill_installs(user_id);
CREATE INDEX IF NOT EXISTS idx_skill_installs_created ON public.skill_installs(created_at DESC);

-- =====================================================
-- 6. Migration 元数据记录
-- =====================================================
INSERT INTO public._schema_migrations (seq, name, description, story, applied_at, execution_time_ms, applied_by)
VALUES (
  '00002',
  'add_skills_tables',
  'Skills Hub 核心表创建：skills, skill_versions, skill_likes, skill_favorites, skill_installs',
  'Epic-29',
  NOW(),
  0,
  current_user
)
ON CONFLICT (seq) DO UPDATE SET
  applied_at = NOW(),
  applied_by = current_user;
