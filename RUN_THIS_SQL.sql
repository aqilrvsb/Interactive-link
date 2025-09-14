-- ================================================
-- COMPLETE MIGRATION FOR SEQUENTIAL USER IDS & FILE STORAGE
-- Run this in Supabase SQL Editor
-- ================================================

-- 1. Create user_sequences table for sequential IDs
CREATE TABLE IF NOT EXISTS public.user_sequences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  sequential_id SERIAL UNIQUE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 2. Enable RLS on user_sequences
ALTER TABLE public.user_sequences ENABLE ROW LEVEL SECURITY;

-- 3. Create RLS policies for user_sequences
DROP POLICY IF EXISTS "Users can view their own sequential ID" ON public.user_sequences;
CREATE POLICY "Users can view their own sequential ID" ON public.user_sequences
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "System can insert sequential IDs" ON public.user_sequences;
CREATE POLICY "System can insert sequential IDs" ON public.user_sequences
  FOR INSERT WITH CHECK (true);

-- 4. Create function to auto-assign sequential IDs
CREATE OR REPLACE FUNCTION public.assign_sequential_user_id()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_sequences (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Create trigger for new user registrations
DROP TRIGGER IF EXISTS on_auth_user_created_assign_sequential_id ON auth.users;
CREATE TRIGGER on_auth_user_created_assign_sequential_id
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.assign_sequential_user_id();

-- 6. Add sequential_id column to profiles table (optional, for easy access)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'profiles' 
    AND column_name = 'sequential_id'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN sequential_id INTEGER;
  END IF;
END $$;

-- 7. Create storage bucket for project files
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'project-files',
  'project-files',
  true,
  52428800, -- 50MB limit
  ARRAY['text/html', 'text/css', 'text/javascript', 'application/javascript']::text[]
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 52428800;

-- 8. Create storage policies for project files
DROP POLICY IF EXISTS "Users can upload their own project files" ON storage.objects;
CREATE POLICY "Users can upload their own project files" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'project-files');

DROP POLICY IF EXISTS "Users can update their own project files" ON storage.objects;
CREATE POLICY "Users can update their own project files" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'project-files');

DROP POLICY IF EXISTS "Users can delete their own project files" ON storage.objects;
CREATE POLICY "Users can delete their own project files" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'project-files');

DROP POLICY IF EXISTS "Public read access for project files" ON storage.objects;
CREATE POLICY "Public read access for project files" ON storage.objects
  FOR SELECT TO public
  USING (bucket_id = 'project-files');

-- 9. Assign sequential IDs to all existing users
INSERT INTO public.user_sequences (user_id)
SELECT id FROM auth.users
WHERE id NOT IN (SELECT user_id FROM public.user_sequences)
ORDER BY created_at
ON CONFLICT DO NOTHING;

-- 10. Create a helper function to get user's sequential ID
CREATE OR REPLACE FUNCTION public.get_user_sequential_id(user_uuid UUID)
RETURNS INTEGER AS $$
DECLARE
  seq_id INTEGER;
BEGIN
  SELECT sequential_id INTO seq_id
  FROM public.user_sequences
  WHERE user_id = user_uuid;
  
  RETURN seq_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 11. Create a view for easy access to user sequential IDs
CREATE OR REPLACE VIEW public.users_with_sequential_ids AS
SELECT 
  u.id as user_id,
  u.email,
  u.created_at,
  us.sequential_id,
  p.username,
  p.full_name
FROM auth.users u
LEFT JOIN public.user_sequences us ON u.id = us.user_id
LEFT JOIN public.profiles p ON u.id = p.user_id
ORDER BY us.sequential_id;

-- ================================================
-- VERIFICATION QUERIES - Run these to check everything worked
-- ================================================

-- Check if tables and bucket were created
SELECT 
  'user_sequences table' as item,
  EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'user_sequences'
  ) as exists;

SELECT 
  'project-files bucket' as item,
  EXISTS (
    SELECT FROM storage.buckets 
    WHERE id = 'project-files'
  ) as exists;

-- View users with their sequential IDs
SELECT 
  sequential_id as "User #",
  email,
  created_at as "Registered"
FROM public.users_with_sequential_ids
ORDER BY sequential_id;

-- Count total users with sequential IDs
SELECT 
  COUNT(*) as "Total Users with Sequential IDs"
FROM public.user_sequences;

-- ================================================
-- SUCCESS MESSAGE
-- ================================================
SELECT 
  '✅ Migration Complete!' as status,
  'Users will now get sequential IDs (1, 2, 3...)' as message,
  'URL format: /{user_id}/preview/{project-name}' as url_format;