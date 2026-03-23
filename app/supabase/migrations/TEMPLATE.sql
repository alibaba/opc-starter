-- =====================================================
-- Migration Template - OPC-Starter
-- =====================================================
-- 使用说明：
-- 1. 复制此文件到 migrations/ 目录，命名为 {seq}_{name}.sql
-- 2. 填写头部元信息
-- 3. 在 DDL 区域编写 SQL 语句
-- 4. 执行时，开头会插入 pending 状态，末尾更新为 applied
-- =====================================================

-- =====================================================
-- 元信息（请填写）
-- =====================================================
-- Seq: 000XX
-- Name: your_migration_name
-- Description: 简要描述此 migration 的作用
-- Story: Epic-XX 或 Story-XX-XX（可选）
-- Created: YYYY-MM-DD
-- =====================================================

-- =====================================================
-- 0. 注册 migration 开始（pending 状态）
-- =====================================================
-- 这确保了即使 DDL 执行失败，也能追踪到哪些 migration 尝试过
INSERT INTO public._schema_migrations (seq, name, description, story, status, applied_at, applied_by)
VALUES (
  '000XX',  -- 替换为实际 seq
  'your_migration_name',  -- 替换为实际 name
  '简要描述此 migration 的作用',  -- 替换为实际 description
  'Epic-XX',  -- 替换为实际 story
  'pending',
  NULL,
  current_user
)
ON CONFLICT (seq) DO UPDATE SET
  status = 'pending',
  applied_at = NULL,
  applied_by = current_user;

-- =====================================================
-- 1. DDL 语句（在此编写实际的 schema 变更）
-- =====================================================

-- TODO: 在此编写你的 DDL 语句
-- 示例：
-- CREATE TABLE IF NOT EXISTS public.example_table (
--   id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
--   name TEXT NOT NULL,
--   created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
-- );

-- =====================================================
-- 2. 索引（如果需要）
-- =====================================================
-- CREATE INDEX IF NOT EXISTS idx_example_table_name ON public.example_table(name);

-- =====================================================
-- 3. RLS 策略（如果需要）
-- =====================================================
-- ALTER TABLE public.example_table ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY example_policy ON public.example_table FOR ALL USING (auth.uid() IS NOT NULL);

-- =====================================================
-- 4. 触发器（如果需要）
-- =====================================================
-- CREATE TRIGGER example_updated_at
--   BEFORE UPDATE ON public.example_table
--   FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 5. 注册 migration 完成（applied 状态）
-- =====================================================
-- 只有执行到这里，才说明 migration 成功完成
UPDATE public._schema_migrations
SET 
  status = 'applied',
  applied_at = NOW(),
  applied_by = current_user
WHERE seq = '000XX';  -- 替换为实际 seq

-- =====================================================
-- End of Migration
-- =====================================================
