-- rollbacks/00005_add_skills_storage_rollback.sql
-- Seq: 00005
-- Name: add_skills_storage_rollback
-- Description: 回滚 Skills Hub Storage Bucket 配置
-- Created: 2026-03-19
-- =====================================================

-- 删除 Storage RLS 策略
DROP POLICY IF EXISTS skills_update ON storage.objects;
DROP POLICY IF EXISTS skills_delete ON storage.objects;
DROP POLICY IF EXISTS skills_upload ON storage.objects;

-- 删除 Storage Bucket
-- ⚠️ 警告：此操作会删除 skills bucket 及其中所有文件！
-- 生产环境执行前请确认已备份重要数据
DELETE FROM storage.buckets WHERE id = 'skills';

-- 删除 migration 元数据记录
DELETE FROM public._schema_migrations WHERE seq = '00005';
