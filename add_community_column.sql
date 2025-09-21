-- Add community visibility column to projects table
ALTER TABLE projects 
ADD COLUMN IF NOT EXISTS is_community_visible BOOLEAN DEFAULT false;

-- Update existing public projects to be visible in community by default
UPDATE projects 
SET is_community_visible = true 
WHERE is_public = true;

-- Add index for faster community queries
CREATE INDEX IF NOT EXISTS idx_projects_community 
ON projects(is_public, is_community_visible) 
WHERE is_public = true AND is_community_visible = true;