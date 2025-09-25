-- ================================================
-- CLEAN DATABASE AND CONVERT PROJECT ID TO INTEGER
-- This will clean unused tables and convert project IDs to integers
-- ================================================

-- STEP 1: Clean up unused tables
-- ================================================
DROP TABLE IF EXISTS public.custom_domains CASCADE;
DROP TABLE IF EXISTS public.generation_history CASCADE;
DROP TABLE IF EXISTS public.site_assets CASCADE;
DROP TABLE IF EXISTS public.site_versions CASCADE;
DROP TABLE IF EXISTS public.users CASCADE;  -- Not using this, using auth.users
DROP TABLE IF EXISTS public.user_settings CASCADE;
DROP TABLE IF EXISTS public.project_sequences CASCADE;  -- We don't need this anymore

-- STEP 2: Backup existing projects (optional but recommended)
-- ================================================
CREATE TABLE IF NOT EXISTS public.projects_backup AS 
SELECT * FROM public.projects;

-- STEP 3: Create new projects table with integer ID
-- ================================================
CREATE TABLE public.projects_new (
  id SERIAL PRIMARY KEY,
  user_id UUID,  -- Make nullable temporarily to handle orphaned projects
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

-- STEP 4: Copy valid data (only projects with valid users or null user_id)
-- ================================================
INSERT INTO public.projects_new (
  user_id, title, description, code_content, 
  language, ai_model, prompt, is_public, 
  created_at, updated_at
)
SELECT 
  CASE 
    WHEN EXISTS (SELECT 1 FROM auth.users WHERE id = p.user_id) 
    THEN p.user_id 
    ELSE NULL 
  END as user_id,
  title, 
  COALESCE(description, ''),
  code_content,
  COALESCE(language, 'html'),
  ai_model, 
  prompt, 
  COALESCE(is_public, true),
  created_at, 
  updated_at
FROM public.projects p
ORDER BY p.created_at;

-- STEP 5: Drop old table and rename new one
-- ================================================
DROP TABLE public.projects CASCADE;
ALTER TABLE public.projects_new RENAME TO projects;

-- STEP 6: Add foreign key constraint (after cleaning data)
-- ================================================
ALTER TABLE public.projects 
  ADD CONSTRAINT projects_user_id_fkey 
  FOREIGN KEY (user_id) 
  REFERENCES auth.users(id) 
  ON DELETE CASCADE;

-- STEP 7: Create indexes for performance
-- ================================================
CREATE INDEX idx_projects_user_id ON public.projects(user_id);
CREATE INDEX idx_projects_created_at ON public.projects(created_at);
CREATE INDEX idx_projects_is_public ON public.projects(is_public);

-- STEP 8: Enable RLS
-- ================================================
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

-- STEP 9: Create RLS policies
-- ================================================
-- Allow anyone to view public projects
CREATE POLICY "Anyone can view public projects" ON public.projects
  FOR SELECT USING (is_public = true);

-- Allow authenticated users to view their own projects
CREATE POLICY "Users can view own projects" ON public.projects
  FOR SELECT USING (auth.uid() = user_id);

-- Allow authenticated users to insert their own projects
CREATE POLICY "Users can insert own projects" ON public.projects
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Allow authenticated users to update their own projects
CREATE POLICY "Users can update own projects" ON public.projects
  FOR UPDATE USING (auth.uid() = user_id);

-- Allow authenticated users to delete their own projects
CREATE POLICY "Users can delete own projects" ON public.projects
  FOR DELETE USING (auth.uid() = user_id);

-- STEP 10: Clean up profiles table (keep only essential fields)
-- ================================================
ALTER TABLE public.profiles 
  DROP COLUMN IF EXISTS sequential_id;

-- STEP 11: Keep user_sequences table (useful for user URLs)
-- But make sure it's clean
-- ================================================
DELETE FROM public.user_sequences 
WHERE user_id NOT IN (SELECT id FROM auth.users);

-- STEP 12: Verify the migration
-- ================================================
SELECT 
  'Projects count' as info,
  COUNT(*) as value
FROM projects
UNION ALL
SELECT 
  'Max project ID' as info,
  MAX(id)::text as value
FROM projects
UNION ALL
SELECT 
  'Public projects' as info,
  COUNT(*)::text as value
FROM projects WHERE is_public = true
UNION ALL
SELECT 
  'Projects with users' as info,
  COUNT(*)::text as value
FROM projects WHERE user_id IS NOT NULL;

-- ================================================
-- After this migration:
-- 1. Project IDs are integers (1, 2, 3, ...)
-- 2. URLs will be: /1/my-project, /2/portfolio
-- 3. Unused tables are removed
-- 4. Data is cleaned (no orphaned records)
-- 5. Projects without valid users have NULL user_id
-- ================================================

-- To restore if something goes wrong:
-- DROP TABLE projects;
-- ALTER TABLE projects_backup RENAME TO projects;