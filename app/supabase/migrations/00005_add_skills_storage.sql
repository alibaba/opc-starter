-- migrations/00005_add_skills_storage.sql
-- Seq: 00005
-- Name: add_skills_storage
-- Story: Epic-29
-- Description: Skills Hub Storage Bucket 配置
-- Created: 2026-03-19
-- =====================================================

-- =====================================================
-- 1. 创建 Storage Bucket
-- =====================================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'skills',
  'skills',
  false,  -- 私有 bucket，通过 Edge Function 控制访问
  10485760,  -- 10MB 文件大小限制
  ARRAY['application/zip', 'application/x-zip-compressed', 'application/x-tar', 'application/gzip']
)
ON CONFLICT (id) DO UPDATE SET
  public = false,
  file_size_limit = 10485760,
  allowed_mime_types = ARRAY['application/zip', 'application/x-zip-compressed', 'application/x-tar', 'application/gzip'];

COMMENT ON TABLE storage.buckets IS 'Storage buckets - skills bucket 用于存储 Skill 包文件';

-- =====================================================
-- 2. Storage RLS 策略
-- =====================================================

-- 作者可上传自己的 Skill 文件
-- 文件路径格式: {author_id}/{skill_slug}/{version}/package.zip
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

-- 作者可更新自己的 Skill 文件
DROP POLICY IF EXISTS skills_update ON storage.objects;
CREATE POLICY skills_update ON storage.objects
  FOR UPDATE
  USING (
    bucket_id = 'skills' AND
    auth.uid()::text = split_part(name, '/', 1)
  );

-- 注意：SELECT 策略不直接开放，通过 Edge Function 生成签名 URL 控制访问
-- 这样可以统一访问控制逻辑，记录下载日志，支持未来付费 Skill

-- =====================================================
-- 3. Migration 元数据记录
-- =====================================================
INSERT INTO public._schema_migrations (seq, name, description, story, applied_at, execution_time_ms, applied_by)
VALUES (
  '00005',
  'add_skills_storage',
  'Skills Hub Storage Bucket 配置',
  'Epic-29',
  NOW(),
  0,
  current_user
)
ON CONFLICT (seq) DO UPDATE SET
  applied_at = NOW(),
  applied_by = current_user;
