-- migrations/00004_add_skills_functions.sql
-- Seq: 00004
-- Name: add_skills_functions
-- Story: Epic-29
-- Description: Skills Hub 触发器和函数：计数更新、slug 生成
-- Created: 2026-03-19
-- =====================================================

-- =====================================================
-- 1. 点赞计数更新函数和触发器
-- =====================================================
CREATE OR REPLACE FUNCTION public.update_skill_likes_count()
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
$$ LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public;

COMMENT ON FUNCTION public.update_skill_likes_count() IS 'Skill 点赞计数更新触发器函数';

-- 点赞计数触发器
DROP TRIGGER IF EXISTS trigger_update_likes_count ON public.skill_likes;
CREATE TRIGGER trigger_update_likes_count
  AFTER INSERT OR DELETE ON public.skill_likes
  FOR EACH ROW EXECUTE FUNCTION public.update_skill_likes_count();

-- =====================================================
-- 2. 收藏计数更新函数和触发器
-- =====================================================
CREATE OR REPLACE FUNCTION public.update_skill_favorites_count()
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
$$ LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public;

COMMENT ON FUNCTION public.update_skill_favorites_count() IS 'Skill 收藏计数更新触发器函数';

-- 收藏计数触发器
DROP TRIGGER IF EXISTS trigger_update_favorites_count ON public.skill_favorites;
CREATE TRIGGER trigger_update_favorites_count
  AFTER INSERT OR DELETE ON public.skill_favorites
  FOR EACH ROW EXECUTE FUNCTION public.update_skill_favorites_count();

-- =====================================================
-- 3. 下载计数更新函数和触发器
-- =====================================================
CREATE OR REPLACE FUNCTION public.update_skill_downloads_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.skills
  SET downloads_count = downloads_count + 1
  WHERE id = NEW.skill_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public;

COMMENT ON FUNCTION public.update_skill_downloads_count() IS 'Skill 下载计数更新触发器函数';

-- 下载计数触发器
DROP TRIGGER IF EXISTS trigger_update_downloads_count ON public.skill_installs;
CREATE TRIGGER trigger_update_downloads_count
  AFTER INSERT ON public.skill_installs
  FOR EACH ROW EXECUTE FUNCTION public.update_skill_downloads_count();

-- =====================================================
-- 4. Slug 自动生成函数
-- =====================================================
CREATE OR REPLACE FUNCTION public.generate_skill_slug(skill_name TEXT)
RETURNS TEXT AS $$
DECLARE
  base_slug TEXT;
  final_slug TEXT;
  counter INT := 0;
BEGIN
  -- 基础 slug：小写、替换空格和非字母数字为连字符、移除首尾连字符
  base_slug := lower(regexp_replace(skill_name, '[^a-zA-Z0-9]+', '-', 'g'));
  base_slug := regexp_replace(base_slug, '^-|-$', '', 'g');

  -- 限制长度（保留空间给数字后缀）
  base_slug := substring(base_slug, 1, 45);
  
  -- 截断后再次清理末尾连字符
  base_slug := regexp_replace(base_slug, '-+$', '', 'g');

  -- 如果处理后为空，使用默认 slug
  IF length(base_slug) = 0 THEN
    base_slug := 'skill';
  END IF;

  -- 检查唯一性
  final_slug := base_slug;

  WHILE EXISTS (SELECT 1 FROM public.skills WHERE slug = final_slug) LOOP
    counter := counter + 1;
    final_slug := base_slug || '-' || counter;
  END LOOP;

  RETURN final_slug;
END;
$$ LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public;

COMMENT ON FUNCTION public.generate_skill_slug(TEXT) IS '生成 URL 友好的 Skill slug，确保唯一性';

-- =====================================================
-- 5. 首次发布时自动设置 published_at
-- =====================================================
CREATE OR REPLACE FUNCTION public.set_skill_published_at()
RETURNS TRIGGER AS $$
BEGIN
  -- 当 visibility 从非 public 变为 public 时，设置 published_at
  IF NEW.visibility = 'public' AND (OLD.visibility IS NULL OR OLD.visibility != 'public') AND NEW.published_at IS NULL THEN
    NEW.published_at := NOW();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public;

COMMENT ON FUNCTION public.set_skill_published_at() IS 'Skill 首次发布时自动设置 published_at';

-- 发布触发器
DROP TRIGGER IF EXISTS trigger_set_published_at ON public.skills;
CREATE TRIGGER trigger_set_published_at
  BEFORE UPDATE ON public.skills
  FOR EACH ROW EXECUTE FUNCTION public.set_skill_published_at();

-- =====================================================
-- 6. Migration 元数据记录
-- =====================================================
INSERT INTO public._schema_migrations (seq, name, description, story, applied_at, execution_time_ms, applied_by)
VALUES (
  '00004',
  'add_skills_functions',
  'Skills Hub 触发器和函数：计数更新、slug 生成',
  'Epic-29',
  NOW(),
  0,
  current_user
)
ON CONFLICT (seq) DO UPDATE SET
  applied_at = NOW(),
  applied_by = current_user;
