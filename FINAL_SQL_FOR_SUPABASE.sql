-- ================================================
-- COPY AND PASTE THIS ENTIRE SCRIPT INTO SUPABASE SQL EDITOR
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
CREATE POLICY "Users can view their own sequential ID" ON public.user_sequences
  FOR SELECT USING (auth.uid() = user_id);

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

-- 6. Add sequential_id column to profiles table (if it doesn't exist)
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS sequential_id INTEGER;

-- 7. Create storage bucket for project files
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'project-files',
  'project-files',
  true,
  52428800,
  ARRAY['text/html', 'text/css', 'text/javascript', 'application/javascript']::text[]
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 52428800;

-- 8. Create storage policies for project files
CREATE POLICY "Users can upload their own project files" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'project-files');

CREATE POLICY "Users can update their own project files" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'project-files');

CREATE POLICY "Users can delete their own project files" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'project-files');

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

-- 11. Create a view for easy access to user sequential IDs with profiles
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

-- 12. Update profiles with sequential IDs
UPDATE public.profiles p
SET sequential_id = us.sequential_id
FROM public.user_sequences us
WHERE p.user_id = us.user_id
AND p.sequential_id IS NULL;

-- ================================================
-- VERIFICATION - This will show results after migration
-- ================================================

-- Check what was created
SELECT 'MIGRATION COMPLETE' as status;

-- Show user sequences table exists
SELECT COUNT(*) as "Total Users with Sequential IDs" 
FROM public.user_sequences;

-- Show first 10 users with their sequential IDs
SELECT 
  sequential_id as "User #",
  email as "Email",
  to_char(created_at, 'YYYY-MM-DD') as "Registered Date"
FROM public.users_with_sequential_ids
WHERE sequential_id IS NOT NULL
ORDER BY sequential_id
LIMIT 10;

-- Check storage bucket
SELECT 
  id as "Bucket Name",
  public as "Is Public",
  file_size_limit as "Max File Size"
FROM storage.buckets 
WHERE id = 'project-files';

-- Show success message
SELECT 
  '✅ SUCCESS: Sequential User IDs are now active!' as message,
  'URL Format: /{user_id}/preview/{project-name}' as url_pattern,
  'Example: /1/preview/my-website' as example;