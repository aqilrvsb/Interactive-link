-- ================================================
-- FIX PROJECTS NOT SHOWING ON DASHBOARD REFRESH
-- ================================================

-- STEP 1: Check if there are any projects in the database
-- ================================================
SELECT 
  COUNT(*) as total_projects,
  COUNT(DISTINCT user_id) as unique_users
FROM projects;

-- STEP 2: Check if RLS is blocking the SELECT
-- ================================================
-- Temporarily disable RLS to test
ALTER TABLE public.projects DISABLE ROW LEVEL SECURITY;

-- STEP 3: Re-enable RLS with fixed policies
-- ================================================
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

-- Drop all existing policies
DROP POLICY IF EXISTS "public_projects_read" ON public.projects;
DROP POLICY IF EXISTS "own_projects_read" ON public.projects;
DROP POLICY IF EXISTS "create_projects" ON public.projects;
DROP POLICY IF EXISTS "update_own_projects" ON public.projects;
DROP POLICY IF EXISTS "delete_own_projects" ON public.projects;
DROP POLICY IF EXISTS "Anyone can view public projects" ON public.projects;
DROP POLICY IF EXISTS "Authenticated users can view own projects" ON public.projects;
DROP POLICY IF EXISTS "Authenticated users can insert own projects" ON public.projects;
DROP POLICY IF EXISTS "Authenticated users can update own projects" ON public.projects;
DROP POLICY IF EXISTS "Authenticated users can delete own projects" ON public.projects;
DROP POLICY IF EXISTS "Users can view own projects" ON public.projects;
DROP POLICY IF EXISTS "Users can view public projects" ON public.projects;
DROP POLICY IF EXISTS "Users can insert own projects" ON public.projects;
DROP POLICY IF EXISTS "Users can update own projects" ON public.projects;
DROP POLICY IF EXISTS "Users can delete own projects" ON public.projects;

-- STEP 4: Create simple, working policies
-- ================================================

-- Allow everyone to see public projects
CREATE POLICY "anyone_view_public_projects" 
ON public.projects FOR SELECT
USING (is_public = true);

-- Allow authenticated users to see their own projects (even private ones)
CREATE POLICY "users_view_own_projects" 
ON public.projects FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Allow authenticated users to insert their own projects
CREATE POLICY "users_insert_own_projects" 
ON public.projects FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Allow authenticated users to update their own projects
CREATE POLICY "users_update_own_projects" 
ON public.projects FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Allow authenticated users to delete their own projects
CREATE POLICY "users_delete_own_projects" 
ON public.projects FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- STEP 5: Grant proper permissions
-- ================================================
GRANT ALL ON public.projects TO authenticated;
GRANT SELECT ON public.projects TO anon;
GRANT ALL ON SEQUENCE projects_id_seq TO authenticated;
GRANT USAGE ON SEQUENCE projects_id_seq TO authenticated;

-- STEP 6: Test with a sample insert (if no projects exist)
-- ================================================
DO $$
DECLARE
  user_id_var UUID;
  project_count INTEGER;
BEGIN
  -- Get current user
  user_id_var := auth.uid();
  
  -- Count existing projects
  SELECT COUNT(*) INTO project_count FROM projects;
  
  -- If no projects and user is authenticated, create a test project
  IF project_count = 0 AND user_id_var IS NOT NULL THEN
    INSERT INTO projects (user_id, title, description, code_content, is_public)
    VALUES (
      user_id_var,
      'Test Project',
      'A test project to verify everything works',
      '<h1>Hello World</h1>',
      true
    );
    RAISE NOTICE 'Test project created';
  END IF;
END $$;

-- STEP 7: Verify the fix
-- ================================================
SELECT 
  'Current User' as info,
  auth.uid()::text as value
UNION ALL
SELECT 
  'Projects Count' as info,
  COUNT(*)::text as value
FROM projects
UNION ALL
SELECT 
  'My Projects Count' as info,
  COUNT(*)::text as value
FROM projects
WHERE user_id = auth.uid()
UNION ALL
SELECT 
  'Public Projects Count' as info,
  COUNT(*)::text as value
FROM projects
WHERE is_public = true;

-- STEP 8: Show actual projects for debugging
-- ================================================
SELECT 
  id,
  title,
  user_id,
  is_public,
  created_at
FROM projects
ORDER BY created_at DESC
LIMIT 10;