-- ================================================
-- CHANGE PROJECT ID FROM UUID TO INTEGER
-- WARNING: This is a major change - backup your data first!
-- ================================================

-- 1. Create new projects table with integer ID
CREATE TABLE public.projects_new (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
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

-- 2. Copy data from old table (will get new sequential IDs)
INSERT INTO public.projects_new (
  user_id, title, description, code_content, 
  language, ai_model, prompt, is_public, 
  created_at, updated_at
)
SELECT 
  user_id, title, description, code_content,
  language, ai_model, prompt, is_public,
  created_at, updated_at
FROM public.projects
ORDER BY created_at;

-- 3. Drop old table and rename new one
DROP TABLE public.projects CASCADE;
ALTER TABLE public.projects_new RENAME TO projects;

-- 4. Re-create indexes
CREATE INDEX idx_projects_user_id ON public.projects(user_id);
CREATE INDEX idx_projects_created_at ON public.projects(created_at);

-- 5. Enable RLS
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

-- 6. Re-create RLS policies
CREATE POLICY "Users can view public projects" ON public.projects
  FOR SELECT USING (is_public = true OR auth.uid() = user_id);

CREATE POLICY "Users can insert own projects" ON public.projects
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own projects" ON public.projects
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own projects" ON public.projects
  FOR DELETE USING (auth.uid() = user_id);

-- 7. Verify the change
SELECT id, title FROM projects ORDER BY id LIMIT 10;

-- ================================================
-- After this migration:
-- - Project IDs will be integers: 1, 2, 3, etc.
-- - URLs will be: /1/my-project, /2/portfolio, etc.
-- - No user ID needed in URLs
-- ================================================