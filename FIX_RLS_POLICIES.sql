-- ================================================
-- FIX RLS POLICIES FOR PROJECTS TABLE
-- Fixes the "row violates row-level security policy" error
-- ================================================

-- STEP 1: Drop existing policies
-- ================================================
DROP POLICY IF EXISTS "Anyone can view public projects" ON public.projects;
DROP POLICY IF EXISTS "Users can view own projects" ON public.projects;
DROP POLICY IF EXISTS "Users can insert own projects" ON public.projects;
DROP POLICY IF EXISTS "Users can update own projects" ON public.projects;
DROP POLICY IF EXISTS "Users can delete own projects" ON public.projects;

-- STEP 2: Create more permissive policies for development/testing
-- ================================================

-- Allow anyone to view public projects (no auth required)
CREATE POLICY "Anyone can view public projects" 
ON public.projects FOR SELECT 
USING (is_public = true);

-- Allow authenticated users to view all their projects
CREATE POLICY "Authenticated users can view own projects" 
ON public.projects FOR SELECT 
USING (auth.uid() = user_id);

-- Allow authenticated users to insert projects (ensure user_id matches)
CREATE POLICY "Authenticated users can insert own projects" 
ON public.projects FOR INSERT 
WITH CHECK (
  auth.uid() IS NOT NULL AND 
  auth.uid() = user_id
);

-- Allow authenticated users to update their own projects
CREATE POLICY "Authenticated users can update own projects" 
ON public.projects FOR UPDATE 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Allow authenticated users to delete their own projects
CREATE POLICY "Authenticated users can delete own projects" 
ON public.projects FOR DELETE 
USING (auth.uid() = user_id);

-- STEP 3: Verify current user (for debugging)
-- ================================================
-- Run this to check if you're authenticated
SELECT 
  auth.uid() as current_user_id,
  CASE 
    WHEN auth.uid() IS NULL THEN 'Not authenticated'
    ELSE 'Authenticated'
  END as auth_status;

-- STEP 4: Alternative - Temporarily disable RLS for testing (NOT for production!)
-- ================================================
-- Uncomment this line only for testing:
-- ALTER TABLE public.projects DISABLE ROW LEVEL SECURITY;

-- STEP 5: Check if user_id is being passed correctly
-- ================================================
-- This will show all projects and their user_ids
SELECT 
  id,
  title,
  user_id,
  CASE 
    WHEN user_id = auth.uid() THEN 'Owned by current user'
    WHEN user_id IS NULL THEN 'No owner'
    ELSE 'Owned by another user'
  END as ownership
FROM projects
LIMIT 10;

-- ================================================
-- DEBUGGING TIPS:
-- 1. Make sure you're logged in when creating projects
-- 2. Make sure user_id is being set to auth.uid() when creating
-- 3. Check that the user exists in auth.users table
-- ================================================