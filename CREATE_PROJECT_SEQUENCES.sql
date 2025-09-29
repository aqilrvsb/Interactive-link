-- ================================================
-- CREATE SEQUENTIAL PROJECT IDs
-- This gives projects simple integer IDs like 1, 2, 3 instead of UUIDs
-- ================================================

-- 1. Create a table for sequential project IDs
CREATE TABLE IF NOT EXISTS public.project_sequences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL UNIQUE REFERENCES public.projects(id) ON DELETE CASCADE,
  sequential_id SERIAL UNIQUE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 2. Enable RLS on project_sequences
ALTER TABLE public.project_sequences ENABLE ROW LEVEL SECURITY;

-- 3. Create RLS policies
CREATE POLICY "Users can view all project sequences" ON public.project_sequences
  FOR SELECT USING (true);

CREATE POLICY "System can insert project sequences" ON public.project_sequences
  FOR INSERT WITH CHECK (true);

-- 4. Create function to auto-assign sequential project IDs
CREATE OR REPLACE FUNCTION public.assign_sequential_project_id()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.project_sequences (project_id)
  VALUES (NEW.id)
  ON CONFLICT (project_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Create trigger for new projects
DROP TRIGGER IF EXISTS on_project_created_assign_sequential_id ON public.projects;
CREATE TRIGGER on_project_created_assign_sequential_id
  AFTER INSERT ON public.projects
  FOR EACH ROW
  EXECUTE FUNCTION public.assign_sequential_project_id();

-- 6. Assign sequential IDs to all existing projects
DO $$
DECLARE
  project_record RECORD;
BEGIN
  -- Loop through all projects
  FOR project_record IN 
    SELECT id, created_at 
    FROM public.projects 
    WHERE id NOT IN (SELECT project_id FROM public.project_sequences)
    ORDER BY created_at
  LOOP
    -- Insert sequential ID for each project
    INSERT INTO public.project_sequences (project_id)
    VALUES (project_record.id)
    ON CONFLICT DO NOTHING;
  END LOOP;
END $$;

-- 7. Create helper function to get project by sequential ID
CREATE OR REPLACE FUNCTION public.get_project_by_sequential_id(seq_id INTEGER)
RETURNS TABLE(
  id UUID,
  user_id UUID,
  title TEXT,
  code_content TEXT,
  is_public BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id,
    p.user_id,
    p.title,
    p.code_content,
    p.is_public
  FROM projects p
  JOIN project_sequences ps ON ps.project_id = p.id
  WHERE ps.sequential_id = seq_id
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. Grant permissions
GRANT SELECT ON public.project_sequences TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_project_by_sequential_id TO anon, authenticated;

-- 9. Add index for performance
CREATE INDEX IF NOT EXISTS idx_project_sequences_sequential_id ON public.project_sequences(sequential_id);

-- 10. Verify the setup
SELECT 
  COUNT(*) as total_projects,
  COUNT(DISTINCT ps.project_id) as projects_with_sequential_ids
FROM public.projects p
LEFT JOIN public.project_sequences ps ON p.id = ps.project_id;

-- ================================================
-- After running this:
-- - All projects will have sequential integer IDs (1, 2, 3, etc.)
-- - New projects automatically get the next ID
-- - URLs can be: /1/2/my-project (user 1, project 2)
-- ================================================