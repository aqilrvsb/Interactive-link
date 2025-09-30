-- Add subject field to projects table
-- Migration: 20250125_add_subject_to_projects.sql

BEGIN;

-- Add kategori and tahun columns to projects table
ALTER TABLE projects 
ADD COLUMN IF NOT EXISTS kategori VARCHAR(50) CHECK (kategori IN (
  'Matematik',
  'Sejarah', 
  'Sains',
  'Bahasa Melayu',
  'Bahasa Inggeris',
  'Pendidikan Islam'
)),
ADD COLUMN IF NOT EXISTS tahun INTEGER CHECK (tahun >= 1 AND tahun <= 3);

-- Create performance indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_projects_kategori ON projects(kategori);
CREATE INDEX IF NOT EXISTS idx_projects_tahun ON projects(tahun);
CREATE INDEX IF NOT EXISTS idx_projects_kategori_tahun ON projects(kategori, tahun);

-- Update existing RLS policies to include new fields
DROP POLICY IF EXISTS "Users can view public projects with categories" ON projects;
CREATE POLICY "Users can view public projects with categories" ON projects
  FOR SELECT USING (
    is_public = true OR 
    auth.uid() = user_id
  );

-- Create function for category statistics
CREATE OR REPLACE FUNCTION get_category_stats()
RETURNS TABLE(kategori VARCHAR(50), project_count BIGINT) AS $$
BEGIN
  RETURN QUERY
  SELECT p.kategori, COUNT(*) as project_count
  FROM projects p
  WHERE p.is_public = true 
    AND p.kategori IS NOT NULL
  GROUP BY p.kategori
  ORDER BY project_count DESC;
END;
$$ LANGUAGE plpgsql;

-- Grant permissions for the new function
GRANT EXECUTE ON FUNCTION get_category_stats() TO anon;
GRANT EXECUTE ON FUNCTION get_category_stats() TO authenticated;

COMMIT;