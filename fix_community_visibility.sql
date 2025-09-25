-- Fix community visibility for existing and new projects

-- 1. Set default to TRUE for new projects
ALTER TABLE projects 
ALTER COLUMN is_community_visible SET DEFAULT true;

-- 2. Update ALL existing public projects to be visible in community
UPDATE projects 
SET is_community_visible = true 
WHERE is_public = true;

-- 3. Verify the changes
SELECT id, title, is_public, is_community_visible 
FROM projects 
WHERE is_public = true;