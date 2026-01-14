-- =====================================================
-- OPC-Starter v1.0 Database Schema
-- =====================================================
-- Version: v1.0.0
-- Created: 2026-01-13
-- 
-- Features: Supabase Auth, RLS, Organization Management
-- Usage: Execute in Supabase SQL Editor (PostgreSQL 14+)
-- 
-- Tables (4):
--   - profiles: 用户资料（1:1 auth.users）
--   - organizations: 组织架构（ltree 层级）
--   - organization_members: 组织成员关系
--   - agent_threads/messages/actions: Agent 会话
-- =====================================================

-- =====================================================
-- 0. Extensions
-- =====================================================
CREATE SCHEMA IF NOT EXISTS extensions;

CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS "ltree" WITH SCHEMA extensions;

-- =====================================================
-- 1. Helper Functions
-- =====================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public;

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public;

CREATE OR REPLACE FUNCTION get_user_accessible_organizations(user_uuid UUID)
RETURNS TABLE(organization_id UUID) AS $$
DECLARE
  user_role TEXT;
BEGIN
  SELECT role INTO user_role FROM public.profiles WHERE id = user_uuid;
  
  IF user_role = 'admin' THEN
    RETURN QUERY SELECT o.id FROM public.organizations o;
    RETURN;
  END IF;
  
  RETURN QUERY
  SELECT DISTINCT o.id
  FROM public.organizations o
  INNER JOIN public.organization_members om ON om.organization_id = o.id
  WHERE om.user_id = user_uuid
  
  UNION
  
  SELECT DISTINCT child.id
  FROM public.profiles p
  JOIN public.organizations parent ON parent.id = p.organization_id
  JOIN public.organizations child ON 
    child.id = parent.id
    OR child.path ~ (parent.path::text || '.*')::lquery
  WHERE p.id = user_uuid;
END;
$$ LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions;

CREATE OR REPLACE FUNCTION sync_profile_organization()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND OLD.organization_id IS DISTINCT FROM NEW.organization_id THEN
    IF OLD.organization_id IS NOT NULL THEN
      DELETE FROM public.organization_members
      WHERE user_id = OLD.id AND organization_id = OLD.organization_id;
    END IF;
    
    IF NEW.organization_id IS NOT NULL THEN
      INSERT INTO public.organization_members (organization_id, user_id, role)
      VALUES (NEW.organization_id, NEW.id, NEW.role)
      ON CONFLICT (organization_id, user_id) 
      DO UPDATE SET role = EXCLUDED.role;
    END IF;
  END IF;
  
  IF TG_OP = 'INSERT' AND NEW.organization_id IS NOT NULL THEN
    INSERT INTO public.organization_members (organization_id, user_id, role)
    VALUES (NEW.organization_id, NEW.id, NEW.role)
    ON CONFLICT (organization_id, user_id) 
    DO UPDATE SET role = EXCLUDED.role;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public;

-- =====================================================
-- 2. Core Tables
-- =====================================================

-- -----------------------------------------------------
-- 2.1 Profiles
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  nickname TEXT,
  avatar_url TEXT,
  bio TEXT,
  department TEXT,
  
  organization_id UUID,
  role TEXT CHECK (role IN ('admin', 'manager', 'member')) DEFAULT 'member' NOT NULL,
  is_active BOOLEAN DEFAULT true NOT NULL,
  
  settings JSONB DEFAULT '{}'::jsonb,
  
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_organization ON public.profiles(organization_id) WHERE organization_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS profiles_select ON public.profiles;
DROP POLICY IF EXISTS profiles_insert ON public.profiles;
DROP POLICY IF EXISTS profiles_update ON public.profiles;

CREATE POLICY profiles_select ON public.profiles
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY profiles_insert ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY profiles_update ON public.profiles
  FOR UPDATE USING (
    auth.uid() = id
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS profiles_updated_at ON public.profiles;
DROP TRIGGER IF EXISTS profiles_sync_organization ON public.profiles;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER profiles_sync_organization
  AFTER INSERT OR UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION sync_profile_organization();

-- -----------------------------------------------------
-- 2.2 Organizations
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS public.organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  display_name TEXT NOT NULL,
  short_name TEXT,
  description TEXT,
  
  parent_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  path ltree NOT NULL,
  level INTEGER NOT NULL DEFAULT 0,
  sort_order INTEGER DEFAULT 0,
  
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  
  CONSTRAINT no_self_reference CHECK (id != parent_id),
  CONSTRAINT unique_org_name UNIQUE (name)
);

CREATE INDEX IF NOT EXISTS idx_organizations_path ON public.organizations USING gist(path);
CREATE INDEX IF NOT EXISTS idx_organizations_parent ON public.organizations(parent_id) WHERE parent_id IS NOT NULL;

DROP TRIGGER IF EXISTS organizations_updated_at ON public.organizations;
CREATE TRIGGER organizations_updated_at
  BEFORE UPDATE ON public.organizations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- -----------------------------------------------------
-- 2.3 Organization Members
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS public.organization_members (
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role TEXT CHECK (role IN ('admin', 'manager', 'member')) DEFAULT 'member' NOT NULL,
  joined_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  PRIMARY KEY (organization_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_organization_members_user ON public.organization_members(user_id);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'fk_profiles_organization' 
    AND table_name = 'profiles'
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT fk_profiles_organization 
      FOREIGN KEY (organization_id) 
      REFERENCES public.organizations(id) 
      ON DELETE SET NULL;
  END IF;
END $$;

-- =====================================================
-- 3. RLS Policies for Organizations
-- =====================================================
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS organizations_select ON public.organizations;
DROP POLICY IF EXISTS organizations_insert ON public.organizations;
DROP POLICY IF EXISTS organizations_update ON public.organizations;
DROP POLICY IF EXISTS organizations_delete ON public.organizations;

CREATE POLICY organizations_select ON public.organizations
  FOR SELECT USING (
    public.organizations.id IN (
      SELECT organization_id 
      FROM get_user_accessible_organizations(auth.uid())
    )
  );

CREATE POLICY organizations_insert ON public.organizations
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY organizations_update ON public.organizations
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.organization_members
      WHERE organization_id = public.organizations.id
        AND user_id = auth.uid()
        AND role = 'admin'
    )
  );

CREATE POLICY organizations_delete ON public.organizations
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.organization_members
      WHERE organization_id = public.organizations.id
        AND user_id = auth.uid()
        AND role = 'admin'
    )
  );

-- =====================================================
-- 4. RLS Policies for Organization Members
-- =====================================================
ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS organization_members_select ON public.organization_members;
DROP POLICY IF EXISTS organization_members_insert ON public.organization_members;
DROP POLICY IF EXISTS organization_members_update ON public.organization_members;
DROP POLICY IF EXISTS organization_members_delete ON public.organization_members;

CREATE POLICY organization_members_select ON public.organization_members
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.organization_id = public.organization_members.organization_id
    )
  );

CREATE POLICY organization_members_insert ON public.organization_members
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
        AND organization_id = public.organization_members.organization_id
        AND role IN ('admin')
    )
  );

CREATE POLICY organization_members_update ON public.organization_members
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
        AND organization_id = public.organization_members.organization_id
        AND role = 'admin'
    )
  );

CREATE POLICY organization_members_delete ON public.organization_members
  FOR DELETE USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
        AND organization_id = public.organization_members.organization_id
        AND role IN ('admin')
    )
  );

-- =====================================================
-- 5. Agent Tables (A2UI Support)
-- =====================================================

-- Agent Threads
CREATE TABLE IF NOT EXISTS public.agent_threads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT,
  context JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_agent_threads_user_id ON public.agent_threads(user_id);

ALTER TABLE public.agent_threads ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS agent_threads_all ON public.agent_threads;
CREATE POLICY agent_threads_all ON public.agent_threads
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP TRIGGER IF EXISTS trigger_agent_threads_updated_at ON public.agent_threads;
CREATE TRIGGER trigger_agent_threads_updated_at
  BEFORE UPDATE ON public.agent_threads
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Agent Messages
CREATE TABLE IF NOT EXISTS public.agent_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id UUID NOT NULL REFERENCES public.agent_threads(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system', 'tool')),
  content TEXT,
  a2ui_messages JSONB,
  tool_calls JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_agent_messages_thread_id ON public.agent_messages(thread_id);

ALTER TABLE public.agent_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS agent_messages_all ON public.agent_messages;
CREATE POLICY agent_messages_all ON public.agent_messages
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.agent_threads
      WHERE agent_threads.id = agent_messages.thread_id
        AND agent_threads.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.agent_threads
      WHERE agent_threads.id = agent_messages.thread_id
        AND agent_threads.user_id = auth.uid()
    )
  );

-- Agent Actions
CREATE TABLE IF NOT EXISTS public.agent_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id UUID NOT NULL REFERENCES public.agent_threads(id) ON DELETE CASCADE,
  message_id UUID REFERENCES public.agent_messages(id) ON DELETE SET NULL,
  action_id TEXT NOT NULL,
  payload JSONB DEFAULT '{}'::jsonb,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'succeeded', 'failed')),
  error TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_agent_actions_thread_id ON public.agent_actions(thread_id);

ALTER TABLE public.agent_actions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS agent_actions_all ON public.agent_actions;
CREATE POLICY agent_actions_all ON public.agent_actions
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.agent_threads
      WHERE agent_threads.id = agent_actions.thread_id
        AND agent_threads.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.agent_threads
      WHERE agent_threads.id = agent_actions.thread_id
        AND agent_threads.user_id = auth.uid()
    )
  );

DROP TRIGGER IF EXISTS trigger_agent_actions_updated_at ON public.agent_actions;
CREATE TRIGGER trigger_agent_actions_updated_at
  BEFORE UPDATE ON public.agent_actions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 6. Admin Helper Functions
-- =====================================================

CREATE OR REPLACE FUNCTION admin_create_organization(
  p_name TEXT,
  p_display_name TEXT,
  p_description TEXT DEFAULT NULL,
  p_parent_id UUID DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_user_role TEXT;
  v_path ltree;
  v_level INTEGER;
  v_new_org_id UUID;
BEGIN
  SELECT role INTO v_user_role 
  FROM public.profiles 
  WHERE id = auth.uid();
  
  IF v_user_role IS NULL OR v_user_role != 'admin' THEN
    RAISE EXCEPTION 'Permission denied: Only admins can create organizations';
  END IF;
  
  IF p_parent_id IS NOT NULL THEN
    SELECT path, level + 1 INTO v_path, v_level
    FROM public.organizations
    WHERE id = p_parent_id;
    
    IF v_path IS NULL THEN
      RAISE EXCEPTION 'Parent organization not found';
    END IF;
    
    v_path := v_path || p_name::ltree;
  ELSE
    v_path := p_name::ltree;
    v_level := 0;
  END IF;
  
  INSERT INTO public.organizations (name, display_name, description, parent_id, path, level, created_by)
  VALUES (p_name, p_display_name, p_description, p_parent_id, v_path, v_level, auth.uid())
  RETURNING id INTO v_new_org_id;
  
  RETURN v_new_org_id;
END;
$$ LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions;

-- =====================================================
-- 7. Storage Buckets (Run in Supabase Dashboard)
-- =====================================================
-- Execute these in Supabase Dashboard > Storage:
--
-- 1. Create bucket: avatars (public)
-- 2. Create bucket: uploads (private)
--
-- Storage RLS policies:
-- INSERT: auth.uid() IS NOT NULL
-- SELECT: true (for public buckets)
-- DELETE: auth.uid() = owner_id

-- =====================================================
-- End of Schema
-- =====================================================
