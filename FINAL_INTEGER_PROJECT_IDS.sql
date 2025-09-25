-- ================================================
-- FINAL DATABASE STRUCTURE - INTEGER PROJECT IDs
-- Implements clean URLs like /1/aqil, /2/portfolio
-- ================================================

-- STEP 1: Drop ALL unnecessary tables
-- ================================================
DROP TABLE IF EXISTS public.custom_domains CASCADE;
DROP TABLE IF EXISTS public.generation_history CASCADE;
DROP TABLE IF EXISTS public.site_assets CASCADE;
DROP TABLE IF EXISTS public.site_versions CASCADE;
DROP TABLE IF EXISTS public.users CASCADE;  -- Using auth.users instead
DROP TABLE IF EXISTS public.user_settings CASCADE;
DROP TABLE IF EXISTS public.project_sequences CASCADE;  -- Don't need this anymore

-- STEP 2: Backup existing projects (if any exist)
-- ================================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'projects') THEN
    CREATE TABLE IF NOT EXISTS public.projects_backup AS 
    SELECT * FROM public.projects;
  END IF;
END $$;

-- STEP 3: Drop old projects table
-- ================================================
DROP TABLE IF EXISTS public.projects CASCADE;

-- STEP 4: Create new projects table with INTEGER ID
-- ================================================
CREATE TABLE public.projects (
  id SERIAL PRIMARY KEY,  -- Integer: 1, 2, 3, 4, ...
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  code_content TEXT,
  language VARCHAR(50) DEFAULT 'html',
  ai_model VARCHAR(100),
  prompt TEXT,
  is_public BOOLEAN DEFAULT true,  -- Public by default for easy sharing
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- STEP 5: Restore data from backup if it exists
-- ================================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'projects_backup') THEN
    -- Insert data from backup, will get new sequential IDs
    INSERT INTO public.projects (
      user_id, title, description, code_content, 
      language, ai_model, prompt, is_public, 
      created_at, updated_at
    )
    SELECT 
      user_id, title, description, code_content,
      COALESCE(language, 'html'),
      ai_model, prompt,
      COALESCE(is_public, true),
      created_at, updated_at
    FROM public.projects_backup
    WHERE user_id IN (SELECT id FROM auth.users)  -- Only valid users
    ORDER BY created_at;  -- Maintain chronological order
    
    -- Drop backup table after successful migration
    DROP TABLE public.projects_backup;
  END IF;
END $$;

-- STEP 6: Create indexes for performance
-- ================================================
CREATE INDEX idx_projects_user_id ON public.projects(user_id);
CREATE INDEX idx_projects_created_at ON public.projects(created_at);
CREATE INDEX idx_projects_is_public ON public.projects(is_public);
CREATE INDEX idx_projects_updated_at ON public.projects(updated_at);

-- STEP 7: Enable Row Level Security (RLS)
-- ================================================
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

-- STEP 8: Create RLS policies
-- ================================================
-- Anyone can view public projects (no login required)
CREATE POLICY "Anyone can view public projects" ON public.projects
  FOR SELECT USING (is_public = true);

-- Users can view their own projects (even if private)
CREATE POLICY "Users can view own projects" ON public.projects
  FOR SELECT USING (auth.uid() = user_id);

-- Users can create their own projects
CREATE POLICY "Users can insert own projects" ON public.projects
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own projects
CREATE POLICY "Users can update own projects" ON public.projects
  FOR UPDATE USING (auth.uid() = user_id);

-- Users can delete their own projects
CREATE POLICY "Users can delete own projects" ON public.projects
  FOR DELETE USING (auth.uid() = user_id);

-- STEP 9: Keep profiles table (clean structure)
-- ================================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  username TEXT UNIQUE,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT profiles_pkey PRIMARY KEY (id),
  CONSTRAINT profiles_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Enable RLS on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Public profiles are viewable by everyone" ON public.profiles
  FOR SELECT USING (true);

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = user_id);

-- STEP 10: Keep user_sequences table (for user URLs if needed)
-- ================================================
CREATE SEQUENCE IF NOT EXISTS user_sequences_sequential_id_seq;

CREATE TABLE IF NOT EXISTS public.user_sequences (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  sequential_id INTEGER NOT NULL DEFAULT nextval('user_sequences_sequential_id_seq') UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  CONSTRAINT user_sequences_pkey PRIMARY KEY (id),
  CONSTRAINT user_sequences_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Enable RLS on user_sequences
ALTER TABLE public.user_sequences ENABLE ROW LEVEL SECURITY;

-- User sequences policies
CREATE POLICY "Anyone can view user sequences" ON public.user_sequences
  FOR SELECT USING (true);

CREATE POLICY "System can insert user sequences" ON public.user_sequences
  FOR INSERT WITH CHECK (true);

-- STEP 11: Create function to auto-assign user sequential IDs
-- ================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  
  INSERT INTO public.user_sequences (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- STEP 12: Verify the migration
-- ================================================
SELECT 
  'Projects table' as table_name,
  COUNT(*) as record_count,
  'INTEGER IDs: 1, 2, 3, ...' as id_type
FROM projects
UNION ALL
SELECT 
  'Profiles table' as table_name,
  COUNT(*) as record_count,
  'UUID' as id_type
FROM profiles
UNION ALL
SELECT 
  'User sequences table' as table_name,
  COUNT(*) as record_count,
  'Sequential IDs for users' as id_type
FROM user_sequences;

-- ================================================
-- RESULT:
-- 1. Projects have INTEGER IDs (1, 2, 3, ...)
-- 2. URLs will be: /1/my-project, /2/portfolio
-- 3. Ultra simple and clean
-- 4. Only essential tables kept
-- 5. Public projects accessible without login
-- ================================================