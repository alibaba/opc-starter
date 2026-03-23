-- =====================================================
-- 补救脚本：修复 _schema_migrations 表结构和历史记录
-- 用于修复已执行 migration 但未记录元数据的情况
-- 执行方式：通过 MCP Server 或 Supabase SQL Editor 执行
-- =====================================================

-- =====================================================
-- 1. 补齐缺失的 status 字段
-- =====================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = '_schema_migrations'
    AND column_name = 'status'
  ) THEN
    ALTER TABLE public._schema_migrations ADD COLUMN status TEXT NOT NULL DEFAULT 'applied'
      CHECK (status IN ('pending', 'applied', 'failed'));
    COMMENT ON COLUMN public._schema_migrations.status IS 'Migration 状态：pending（执行中）、applied（已应用）、failed（失败）';
  END IF;
END $$;

-- =====================================================
-- 2. 补齐缺失的 checksum 字段
-- =====================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = '_schema_migrations'
    AND column_name = 'checksum'
  ) THEN
    ALTER TABLE public._schema_migrations ADD COLUMN checksum TEXT;
    COMMENT ON COLUMN public._schema_migrations.checksum IS 'Migration 文件的 SHA256 校验和';
  END IF;
END $$;

-- =====================================================
-- 3. 补齐索引
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_schema_migrations_status ON public._schema_migrations(status);
CREATE INDEX IF NOT EXISTS idx_schema_migrations_applied_at ON public._schema_migrations(applied_at DESC);

-- =====================================================
-- 4. 补录 migration 记录
-- =====================================================

-- 00001 baseline
INSERT INTO public._schema_migrations (seq, name, description, story, status, applied_at, applied_by)
VALUES (
  '00001',
  'baseline',
  'OPC-Starter v1.0 初始 schema（含增强的 migration tracking）',
  NULL,
  'applied',
  NOW(),
  current_user
)
ON CONFLICT (seq) DO UPDATE SET
  status = 'applied',
  description = EXCLUDED.description;

-- 00002 add_skills_tables
INSERT INTO public._schema_migrations (seq, name, description, story, status, applied_at, applied_by)
VALUES (
  '00002',
  'add_skills_tables',
  'Skills Hub 核心表创建：skills, skill_versions, skill_likes, skill_favorites, skill_installs',
  'Epic-29',
  'applied',
  NOW(),
  current_user
)
ON CONFLICT (seq) DO UPDATE SET
  status = 'applied';

-- 00003 add_skills_rls
INSERT INTO public._schema_migrations (seq, name, description, story, status, applied_at, applied_by)
VALUES (
  '00003',
  'add_skills_rls',
  'Skills Hub RLS 策略配置',
  'Epic-29',
  'applied',
  NOW(),
  current_user
)
ON CONFLICT (seq) DO UPDATE SET
  status = 'applied';

-- 00004 add_skills_functions
INSERT INTO public._schema_migrations (seq, name, description, story, status, applied_at, applied_by)
VALUES (
  '00004',
  'add_skills_functions',
  'Skills Hub 触发器和函数：计数更新、slug 生成',
  'Epic-29',
  'applied',
  NOW(),
  current_user
)
ON CONFLICT (seq) DO UPDATE SET
  status = 'applied';

-- 00005 add_skills_storage
INSERT INTO public._schema_migrations (seq, name, description, story, status, applied_at, applied_by)
VALUES (
  '00005',
  'add_skills_storage',
  'Skills Hub Storage Bucket 配置',
  'Epic-29',
  'applied',
  NOW(),
  current_user
)
ON CONFLICT (seq) DO UPDATE SET
  status = 'applied';

-- =====================================================
-- 5. 验证结果
-- =====================================================
SELECT seq, name, status, applied_at, checksum FROM public._schema_migrations ORDER BY seq;
