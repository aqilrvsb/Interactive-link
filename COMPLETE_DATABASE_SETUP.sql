-- ================================================
-- COMPLETE DATABASE SETUP FOR INTERACTIVE LINK
-- Copy and paste this entire script into Supabase SQL Editor
-- ================================================

-- 1. Create sequence for user_sequences if it doesn't exist
CREATE SEQUENCE IF NOT EXISTS user_sequences_sequential_id_seq;

-- 2. Create projects table (base table, no foreign keys)
CREATE TABLE IF NOT EXISTS public.projects (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  title text NOT NULL,
  description text,
  code_content text,
  language text DEFAULT 'javascript'::text,
  ai_model text,
  prompt text,
  is_public boolean DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT projects_pkey PRIMARY KEY (id)
);

-- 3. Create profiles table
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  username text UNIQUE,
  full_name text,
  avatar_url text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  sequential_id integer,
  CONSTRAINT profiles_pkey PRIMARY KEY (id),
  CONSTRAINT profiles_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- 4. Create user_sequences table
CREATE TABLE IF NOT EXISTS public.user_sequences (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  sequential_id integer NOT NULL DEFAULT nextval('user_sequences_sequential_id_seq'::regclass) UNIQUE,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT user_sequences_pkey PRIMARY KEY (id),
  CONSTRAINT user_sequences_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- 5. Create user_settings table
CREATE TABLE IF NOT EXISTS public.user_settings (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  custom_supabase_url text,
  custom_supabase_key text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT user_settings_pkey PRIMARY KEY (id),
  CONSTRAINT user_settings_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- 6. Create generation_history table
CREATE TABLE IF NOT EXISTS public.generation_history (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  project_id uuid,
  prompt text NOT NULL,
  ai_model text NOT NULL,
  generated_code text,
  status text DEFAULT 'pending'::text,
  error_message text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT generation_history_pkey PRIMARY KEY (id),
  CONSTRAINT generation_history_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE,
  CONSTRAINT generation_history_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE SET NULL
);

-- 7. Create site_versions table
CREATE TABLE IF NOT EXISTS public.site_versions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL,
  user_id uuid NOT NULL,
  version_number integer NOT NULL DEFAULT 1,
  html_content text NOT NULL,
  css_content text,
  js_content text,
  assets jsonb DEFAULT '[]'::jsonb,
  build_timestamp timestamp with time zone NOT NULL DEFAULT now(),
  is_published boolean DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT site_versions_pkey PRIMARY KEY (id),
  CONSTRAINT site_versions_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE,
  CONSTRAINT site_versions_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- 8. Create site_assets table
CREATE TABLE IF NOT EXISTS public.site_assets (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  site_version_id uuid NOT NULL,
  user_id uuid NOT NULL,
  filename text NOT NULL,
  content_type text NOT NULL,
  file_size integer NOT NULL,
  file_path text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT site_assets_pkey PRIMARY KEY (id),
  CONSTRAINT site_assets_site_version_id_fkey FOREIGN KEY (site_version_id) REFERENCES public.site_versions(id) ON DELETE CASCADE,
  CONSTRAINT site_assets_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- 9. Create custom_domains table
CREATE TABLE IF NOT EXISTS public.custom_domains (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL,
  user_id uuid NOT NULL,
  domain_name text NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'pending'::text CHECK (status = ANY (ARRAY['pending'::text, 'verifying'::text, 'connected'::text, 'error'::text])),
  verification_token text NOT NULL DEFAULT (gen_random_uuid())::text,
  dns_instructions jsonb,
  error_message text,
  verified_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT custom_domains_pkey PRIMARY KEY (id),
  CONSTRAINT custom_domains_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE,
  CONSTRAINT custom_domains_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- 10. Create users table (for custom auth if needed)
CREATE TABLE IF NOT EXISTS public.users (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  username text NOT NULL UNIQUE,
  password_hash text NOT NULL,
  full_name text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT users_pkey PRIMARY KEY (id)
);

-- ================================================
-- ENABLE ROW LEVEL SECURITY (RLS)
-- ================================================

ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_sequences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.generation_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.site_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.site_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.custom_domains ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- ================================================
-- CREATE RLS POLICIES
-- ================================================

-- Projects policies
CREATE POLICY "Users can view their own projects" ON public.projects
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own projects" ON public.projects
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own projects" ON public.projects
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own projects" ON public.projects
  FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Public projects are viewable by everyone" ON public.projects
  FOR SELECT USING (is_public = true);

-- Profiles policies
CREATE POLICY "Profiles are viewable by everyone" ON public.profiles
  FOR SELECT USING (true);

CREATE POLICY "Users can update their own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- User sequences policies
CREATE POLICY "Users can view their own sequential ID" ON public.user_sequences
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "System can insert sequential IDs" ON public.user_sequences
  FOR INSERT WITH CHECK (true);

-- User settings policies
CREATE POLICY "Users can view their own settings" ON public.user_settings
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own settings" ON public.user_settings
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own settings" ON public.user_settings
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Generation history policies
CREATE POLICY "Users can view their own generation history" ON public.generation_history
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create generation history" ON public.generation_history
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Site versions policies
CREATE POLICY "Users can view their own site versions" ON public.site_versions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create site versions" ON public.site_versions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own site versions" ON public.site_versions
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own site versions" ON public.site_versions
  FOR DELETE USING (auth.uid() = user_id);

-- Site assets policies
CREATE POLICY "Users can view their own site assets" ON public.site_assets
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can upload site assets" ON public.site_assets
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own site assets" ON public.site_assets
  FOR DELETE USING (auth.uid() = user_id);

-- Custom domains policies
CREATE POLICY "Users can view their own domains" ON public.custom_domains
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create domains" ON public.custom_domains
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own domains" ON public.custom_domains
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own domains" ON public.custom_domains
  FOR DELETE USING (auth.uid() = user_id);

-- ================================================
-- CREATE INDEXES FOR PERFORMANCE
-- ================================================

CREATE INDEX IF NOT EXISTS idx_projects_user_id ON public.projects(user_id);
CREATE INDEX IF NOT EXISTS idx_projects_created_at ON public.projects(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON public.profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_site_versions_project_id ON public.site_versions(project_id);
CREATE INDEX IF NOT EXISTS idx_site_assets_site_version_id ON public.site_assets(site_version_id);
CREATE INDEX IF NOT EXISTS idx_generation_history_user_id ON public.generation_history(user_id);
CREATE INDEX IF NOT EXISTS idx_custom_domains_project_id ON public.custom_domains(project_id);

-- ================================================
-- CREATE FUNCTIONS AND TRIGGERS
-- ================================================

-- Function to auto-assign sequential IDs to new users
CREATE OR REPLACE FUNCTION public.assign_sequential_user_id()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_sequences (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for new user registrations
DROP TRIGGER IF EXISTS on_auth_user_created_assign_sequential_id ON auth.users;
CREATE TRIGGER on_auth_user_created_assign_sequential_id
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.assign_sequential_user_id();

-- Function to auto-create profile for new users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, username)
  VALUES (NEW.id, NEW.email)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create profile on signup
DROP TRIGGER IF EXISTS on_auth_user_created_create_profile ON auth.users;
CREATE TRIGGER on_auth_user_created_create_profile
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Function to update updated_at timestamps
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add update triggers for tables with updated_at
CREATE TRIGGER handle_projects_updated_at BEFORE UPDATE ON public.projects
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER handle_profiles_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER handle_user_settings_updated_at BEFORE UPDATE ON public.user_settings
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER handle_custom_domains_updated_at BEFORE UPDATE ON public.custom_domains
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ================================================
-- CREATE STORAGE BUCKET FOR WEBSITES
-- ================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'websites',
  'websites', 
  true,
  10485760, -- 10MB limit
  ARRAY['text/html', 'text/css', 'text/javascript', 'application/javascript']::text[]
) ON CONFLICT (id) DO UPDATE 
SET public = true,
    file_size_limit = 10485760;

-- Storage policies for websites bucket
DROP POLICY IF EXISTS "Users can upload website files" ON storage.objects;
DROP POLICY IF EXISTS "Users can update website files" ON storage.objects;
DROP POLICY IF EXISTS "Website files are publicly accessible" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete website files" ON storage.objects;

CREATE POLICY "Users can upload website files"
ON storage.objects FOR INSERT
WITH CHECK (
    bucket_id = 'websites' 
    AND auth.role() = 'authenticated'
);

CREATE POLICY "Users can update website files"
ON storage.objects FOR UPDATE
USING (
    bucket_id = 'websites' 
    AND auth.role() = 'authenticated'
);

CREATE POLICY "Website files are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'websites');

CREATE POLICY "Users can delete website files"
ON storage.objects FOR DELETE
USING (
    bucket_id = 'websites' 
    AND auth.role() = 'authenticated'
);

-- ================================================
-- CREATE VIEW FOR USERS WITH SEQUENTIAL IDS
-- ================================================

CREATE OR REPLACE VIEW public.users_with_sequential_ids AS
SELECT 
  u.id as user_id,
  u.email,
  p.username,
  p.full_name,
  us.sequential_id,
  p.created_at
FROM auth.users u
LEFT JOIN public.profiles p ON u.id = p.user_id
LEFT JOIN public.user_sequences us ON u.id = us.user_id;

-- Grant access to the view
GRANT SELECT ON public.users_with_sequential_ids TO authenticated;

-- ================================================
-- VERIFICATION QUERIES
-- ================================================

-- Check if all tables were created
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;

-- Check storage buckets
SELECT * FROM storage.buckets WHERE id = 'websites';

-- Check if RLS is enabled
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
ORDER BY tablename;

-- ================================================
-- END OF SETUP
-- ================================================
-- Your Interactive Link database is now fully configured!
-- All tables, policies, functions, and storage buckets are ready.