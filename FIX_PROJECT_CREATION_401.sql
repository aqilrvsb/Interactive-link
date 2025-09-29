-- ================================================
-- IMMEDIATE FIX FOR PROJECT CREATION
-- Run this to fix the 401 Unauthorized error
-- ================================================

-- STEP 1: Check if RLS is enabled
-- ================================================
SELECT 
  tablename,
  rowsecurity
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename = 'projects';

-- STEP 2: Drop ALL existing policies (clean slate)
-- ================================================
DO $$
DECLARE
  pol record;
BEGIN
  FOR pol IN 
    SELECT policyname 
    FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'projects'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.projects', pol.policyname);
  END LOOP;
END $$;

-- STEP 3: Create simple, working policies
-- ================================================

-- 1. Public read for public projects
CREATE POLICY "public_projects_read" 
ON public.projects FOR SELECT
USING (is_public = true);

-- 2. Authenticated users can read their own projects
CREATE POLICY "own_projects_read" 
ON public.projects FOR SELECT
USING (auth.uid() = user_id);

-- 3. Authenticated users can create projects (FIXED)
CREATE POLICY "create_projects" 
ON public.projects FOR INSERT
TO authenticated  -- Only for authenticated role
WITH CHECK (auth.uid() = user_id);

-- 4. Authenticated users can update their own projects
CREATE POLICY "update_own_projects" 
ON public.projects FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- 5. Authenticated users can delete their own projects
CREATE POLICY "delete_own_projects" 
ON public.projects FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- STEP 4: Grant necessary permissions
-- ================================================
GRANT ALL ON public.projects TO authenticated;
GRANT SELECT ON public.projects TO anon;
GRANT USAGE ON SEQUENCE projects_id_seq TO authenticated;

-- STEP 5: Verify the fix
-- ================================================
SELECT 
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE schemaname = 'public' 
  AND tablename = 'projects'
ORDER BY policyname;

-- STEP 6: Test authentication status
-- ================================================
SELECT 
  current_user,
  auth.uid() as auth_user_id,
  CASE 
    WHEN auth.uid() IS NULL THEN 'Not authenticated - this will cause 401 errors'
    ELSE 'Authenticated as: ' || auth.uid()::text
  END as status;

-- ================================================
-- If this doesn't work, try OPTION B below
-- ================================================

-- OPTION B: Temporary disable RLS (for testing only!)
-- Uncomment these lines if you need to test without RLS:
-- ALTER TABLE public.projects DISABLE ROW LEVEL SECURITY;
-- 
-- To re-enable:
-- ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;