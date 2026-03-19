-- =====================================================
-- 补救脚本：更新 _schema_migrations 表
-- 用于修复已执行 migration 但未记录元数据的情况
-- 执行方式：在 Supabase SQL Editor 中执行
-- =====================================================

-- 确保表存在
CREATE TABLE IF NOT EXISTS public._schema_migrations (
  seq TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  story TEXT,
  applied_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  execution_time_ms INTEGER,
  applied_by TEXT DEFAULT current_user
);

-- 插入/更新 00001 baseline（如果不存在）
INSERT INTO public._schema_migrations (seq, name, description, story, applied_at, applied_by)
VALUES (
  '00001',
  'baseline',
  'OPC-Starter v1.0 初始 schema：profiles, organizations, organization_members, agent_threads/messages/actions, _schema_migrations',
  NULL,
  NOW(),
  current_user
)
ON CONFLICT (seq) DO UPDATE SET
  applied_at = NOW(),
  applied_by = current_user;

-- 插入/更新 00002 add_skills_tables
INSERT INTO public._schema_migrations (seq, name, description, story, applied_at, applied_by)
VALUES (
  '00002',
  'add_skills_tables',
  'Skills Hub 核心表创建：skills, skill_versions, skill_likes, skill_favorites, skill_installs',
  'Epic-29',
  NOW(),
  current_user
)
ON CONFLICT (seq) DO UPDATE SET
  applied_at = NOW(),
  applied_by = current_user;

-- 插入/更新 00003 add_skills_rls
INSERT INTO public._schema_migrations (seq, name, description, story, applied_at, applied_by)
VALUES (
  '00003',
  'add_skills_rls',
  'Skills Hub RLS 策略配置',
  'Epic-29',
  NOW(),
  current_user
)
ON CONFLICT (seq) DO UPDATE SET
  applied_at = NOW(),
  applied_by = current_user;

-- 插入/更新 00004 add_skills_functions
INSERT INTO public._schema_migrations (seq, name, description, story, applied_at, applied_by)
VALUES (
  '00004',
  'add_skills_functions',
  'Skills Hub 触发器和函数：计数更新、slug 生成',
  'Epic-29',
  NOW(),
  current_user
)
ON CONFLICT (seq) DO UPDATE SET
  applied_at = NOW(),
  applied_by = current_user;

-- 插入/更新 00005 add_skills_storage
INSERT INTO public._schema_migrations (seq, name, description, story, applied_at, applied_by)
VALUES (
  '00005',
  'add_skills_storage',
  'Skills Hub Storage Bucket 配置',
  'Epic-29',
  NOW(),
  current_user
)
ON CONFLICT (seq) DO UPDATE SET
  applied_at = NOW(),
  applied_by = current_user;

-- 验证结果
SELECT * FROM public._schema_migrations ORDER BY seq;
