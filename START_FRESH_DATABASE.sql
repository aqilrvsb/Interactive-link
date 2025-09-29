-- ================================================
-- OPTION 2: START FRESH (Delete all data and recreate)
-- Use this if you don't need to keep existing data
-- ================================================

-- STEP 1: Drop ALL project-related tables
-- ================================================
DROP TABLE IF EXISTS public.custom_domains CASCADE;
DROP TABLE IF EXISTS public.generation_history CASCADE;
DROP TABLE IF EXISTS public.site_assets CASCADE;
DROP TABLE IF EXISTS public.site_versions CASCADE;
DROP TABLE IF EXISTS public.project_sequences CASCADE;
DROP TABLE IF EXISTS public.projects CASCADE;
DROP TABLE IF EXISTS public.users CASCADE;
DROP TABLE IF EXISTS public.user_settings CASCADE;

-- STEP 2: Create clean projects table with integer ID
-- ================================================
CREATE TABLE public.projects (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  code_content TEXT,
  language VARCHAR(50) DEFAULT 'html',
  ai_model VARCHAR(100),
  prompt TEXT,
  is_public BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- STEP 3: Create indexes
-- ================================================
CREATE INDEX idx_projects_user_id ON public.projects(user_id);
CREATE INDEX idx_projects_created_at ON public.projects(created_at);
CREATE INDEX idx_projects_is_public ON public.projects(is_public);

-- STEP 4: Enable RLS
-- ================================================
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

-- STEP 5: Create RLS policies
-- ================================================
-- Anyone can view public projects
CREATE POLICY "Anyone can view public projects" ON public.projects
  FOR SELECT USING (is_public = true);

-- Users can manage their own projects
CREATE POLICY "Users can view own projects" ON public.projects
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own projects" ON public.projects
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own projects" ON public.projects
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own projects" ON public.projects
  FOR DELETE USING (auth.uid() = user_id);

-- STEP 6: Keep profiles table clean
-- ================================================
ALTER TABLE public.profiles 
  DROP COLUMN IF EXISTS sequential_id;

-- STEP 7: Keep user_sequences for user URLs (optional)
-- ================================================
-- This is useful if you want URLs like /1/2/project
-- Where 1 is user sequential ID

-- STEP 8: Insert some test data (optional)
-- ================================================
-- INSERT INTO public.projects (user_id, title, description, code_content, is_public)
-- VALUES 
--   (auth.uid(), 'My First Project', 'A test project', '<h1>Hello World</h1>', true),
--   (auth.uid(), 'Portfolio Site', 'My portfolio', '<h1>Welcome</h1>', true);

-- STEP 9: Check the result
-- ================================================
SELECT 
  'Table created successfully' as status,
  'Projects will have integer IDs starting from 1' as info;

-- ================================================
-- After running this:
-- 1. All old data is removed
-- 2. Clean projects table with integer IDs
-- 3. URLs will be: /1/project-name, /2/portfolio
-- 4. No complexity, just simple integers
-- ================================================