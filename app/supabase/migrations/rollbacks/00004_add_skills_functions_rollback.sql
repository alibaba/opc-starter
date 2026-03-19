-- rollbacks/00004_add_skills_functions_rollback.sql
-- Seq: 00004
-- Name: add_skills_functions_rollback
-- Description: 回滚 Skills Hub 触发器和函数
-- Created: 2026-03-19
-- =====================================================

-- 删除触发器
DROP TRIGGER IF EXISTS trigger_set_published_at ON public.skills;
DROP TRIGGER IF EXISTS trigger_update_downloads_count ON public.skill_installs;
DROP TRIGGER IF EXISTS trigger_update_favorites_count ON public.skill_favorites;
DROP TRIGGER IF EXISTS trigger_update_likes_count ON public.skill_likes;

-- 删除函数
DROP FUNCTION IF EXISTS public.set_skill_published_at();
DROP FUNCTION IF EXISTS public.generate_skill_slug(TEXT);
DROP FUNCTION IF EXISTS public.update_skill_downloads_count();
DROP FUNCTION IF EXISTS public.update_skill_favorites_count();
DROP FUNCTION IF EXISTS public.update_skill_likes_count();

-- 删除 migration 元数据记录
DELETE FROM public._schema_migrations WHERE seq = '00004';
