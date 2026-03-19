-- migrations/00003_add_skills_rls.sql
-- Seq: 00003
-- Name: add_skills_rls
-- Story: Epic-29
-- Description: Skills Hub RLS 策略配置
-- Created: 2026-03-19
-- =====================================================

-- =====================================================
-- 1. skills 表 RLS 策略
-- =====================================================
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

COMMENT ON TABLE public.skills IS 'Skills Hub 主表 - RLS: 游客查看公开，作者管理自己的';

-- =====================================================
-- 2. skill_versions 表 RLS 策略
-- =====================================================
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

COMMENT ON TABLE public.skill_versions IS 'Skill 版本表 - RLS: 跟随 skills 可见性，作者可管理';

-- =====================================================
-- 3. skill_likes 表 RLS 策略
-- =====================================================
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

COMMENT ON TABLE public.skill_likes IS 'Skill 点赞记录 - RLS: 所有人可查看，登录用户可管理自己的';

-- =====================================================
-- 4. skill_favorites 表 RLS 策略
-- =====================================================
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

COMMENT ON TABLE public.skill_favorites IS 'Skill 收藏记录 - RLS: 用户管理自己的';

-- =====================================================
-- 5. skill_installs 表 RLS 策略
-- =====================================================
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

COMMENT ON TABLE public.skill_installs IS 'Skill 安装记录 - RLS: 用户查看自己的，所有人可创建';

-- =====================================================
-- 6. Migration 元数据记录
-- =====================================================
INSERT INTO public._schema_migrations (seq, name, description, story, applied_at, execution_time_ms, applied_by)
VALUES (
  '00003',
  'add_skills_rls',
  'Skills Hub RLS 策略配置',
  'Epic-29',
  NOW(),
  0,
  current_user
)
ON CONFLICT (seq) DO UPDATE SET
  applied_at = NOW(),
  applied_by = current_user;
