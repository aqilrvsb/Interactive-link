-- Debug script to check why projects aren't showing in community

-- 1. Check what values are actually in the database
SELECT id, title, is_public, is_community_visible, user_id 
FROM projects;

-- 2. Force update all projects to be visible (for testing)
UPDATE projects 
SET is_community_visible = true
WHERE is_public = true;

-- 3. Check the results
SELECT id, title, is_public, is_community_visible 
FROM projects
WHERE is_public = true AND is_community_visible = true;

-- 4. Check if there are any NULL values causing issues
SELECT COUNT(*) as null_count
FROM projects
WHERE is_community_visible IS NULL;

-- 5. Fix any NULL values
UPDATE projects
SET is_community_visible = true
WHERE is_community_visible IS NULL;