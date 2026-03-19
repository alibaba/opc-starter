-- rollbacks/00002_add_skills_tables_rollback.sql
-- Seq: 00002
-- Name: add_skills_tables_rollback
-- Description: 回滚 Skills Hub 核心表创建
-- Created: 2026-03-19
-- =====================================================

-- 显式删除触发器（避免依赖 CASCADE，保证 rollback 清晰可审计）
DROP TRIGGER IF EXISTS skills_updated_at ON public.skills;
DROP TRIGGER IF EXISTS trigger_set_published_at ON public.skills;

-- 按依赖顺序删除表（先删除依赖表，后删除被依赖表）
DROP TABLE IF EXISTS public.skill_installs CASCADE;
DROP TABLE IF EXISTS public.skill_favorites CASCADE;
DROP TABLE IF EXISTS public.skill_likes CASCADE;
DROP TABLE IF EXISTS public.skill_versions CASCADE;
DROP TABLE IF EXISTS public.skills CASCADE;

-- 删除 migration 元数据记录
DELETE FROM public._schema_migrations WHERE seq = '00002';
