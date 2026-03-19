-- rollbacks/00003_add_skills_rls_rollback.sql
-- Seq: 00003
-- Name: add_skills_rls_rollback
-- Description: 回滚 Skills Hub RLS 策略配置
-- Created: 2026-03-19
-- =====================================================

-- 删除 skill_installs RLS 策略
DROP POLICY IF EXISTS skill_installs_insert ON public.skill_installs;
DROP POLICY IF EXISTS skill_installs_select ON public.skill_installs;

-- 删除 skill_favorites RLS 策略
DROP POLICY IF EXISTS skill_favorites_delete ON public.skill_favorites;
DROP POLICY IF EXISTS skill_favorites_insert ON public.skill_favorites;
DROP POLICY IF EXISTS skill_favorites_select ON public.skill_favorites;

-- 删除 skill_likes RLS 策略
DROP POLICY IF EXISTS skill_likes_delete ON public.skill_likes;
DROP POLICY IF EXISTS skill_likes_insert ON public.skill_likes;
DROP POLICY IF EXISTS skill_likes_select ON public.skill_likes;

-- 删除 skill_versions RLS 策略
DROP POLICY IF EXISTS skill_versions_delete ON public.skill_versions;
DROP POLICY IF EXISTS skill_versions_insert ON public.skill_versions;
DROP POLICY IF EXISTS skill_versions_select ON public.skill_versions;

-- 删除 skills RLS 策略
DROP POLICY IF EXISTS skills_delete ON public.skills;
DROP POLICY IF EXISTS skills_update ON public.skills;
DROP POLICY IF EXISTS skills_insert ON public.skills;
DROP POLICY IF EXISTS skills_select_own ON public.skills;
DROP POLICY IF EXISTS skills_select_public ON public.skills;

-- 禁用 RLS（回滚后避免 DENY ALL 状态）
ALTER TABLE public.skill_installs DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.skill_favorites DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.skill_likes DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.skill_versions DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.skills DISABLE ROW LEVEL SECURITY;

-- 删除 migration 元数据记录
DELETE FROM public._schema_migrations WHERE seq = '00003';
