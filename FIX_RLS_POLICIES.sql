-- IMPORTANT: Run this in Supabase SQL Editor to fix the Community feature

-- 1. First, check if your projects are actually public
SELECT id, title, is_public, is_community_visible, user_id 
FROM projects;

-- 2. Make sure ALL projects are set to public and visible
UPDATE projects 
SET is_public = true, 
    is_community_visible = true;

-- 3. Fix RLS policies - this is likely the issue!
-- Drop existing SELECT policies on projects
DROP POLICY IF EXISTS "Users can view own projects" ON projects;
DROP POLICY IF EXISTS "Public projects are viewable by everyone" ON projects;

-- Create a new policy that allows EVERYONE to see public projects
CREATE POLICY "Anyone can view public projects" 
ON projects FOR SELECT 
USING (is_public = true);

-- Also make sure profiles are readable (for showing creator info)
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON profiles;
CREATE POLICY "Profiles are viewable by everyone" 
ON profiles FOR SELECT 
USING (true);

-- 4. Test the query that the app uses
SELECT 
  p.id,
  p.title,
  p.is_public,
  p.is_community_visible,
  p.user_id
FROM projects p
WHERE p.is_public = true;