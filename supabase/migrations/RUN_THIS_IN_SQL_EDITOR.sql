-- Run this directly in Supabase SQL Editor at:
-- https://supabase.com/dashboard/project/mvmwcgnlebbesarvsvxk/sql/new

-- First, let's check what already exists
DO $$ 
BEGIN
    -- Check if user_sequences table exists
    IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'user_sequences') THEN
        -- Create the table
        CREATE TABLE public.user_sequences (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
            sequential_id SERIAL UNIQUE NOT NULL,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
        );
        
        -- Enable RLS
        ALTER TABLE public.user_sequences ENABLE ROW LEVEL SECURITY;
        
        RAISE NOTICE 'Created user_sequences table';
    ELSE
        RAISE NOTICE 'user_sequences table already exists';
    END IF;
END $$;

-- Create or replace policies
DROP POLICY IF EXISTS "Users can view their own sequential ID" ON public.user_sequences;
CREATE POLICY "Users can view their own sequential ID" ON public.user_sequences
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "System can insert sequential IDs" ON public.user_sequences;
CREATE POLICY "System can insert sequential IDs" ON public.user_sequences
    FOR INSERT WITH CHECK (true);

-- Create or replace function
CREATE OR REPLACE FUNCTION public.assign_sequential_user_id()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.user_sequences (user_id)
    VALUES (NEW.id)
    ON CONFLICT (user_id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create or replace trigger
DROP TRIGGER IF EXISTS on_auth_user_created_assign_sequential_id ON auth.users;
CREATE TRIGGER on_auth_user_created_assign_sequential_id
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.assign_sequential_user_id();

-- Add column to profiles if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT FROM information_schema.columns 
                   WHERE table_schema = 'public' 
                   AND table_name = 'profiles' 
                   AND column_name = 'sequential_id') THEN
        ALTER TABLE public.profiles ADD COLUMN sequential_id INTEGER;
    END IF;
END $$;

-- Create storage bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'project-files',
    'project-files',
    true,
    52428800,
    ARRAY['text/html', 'text/css', 'text/javascript', 'application/javascript']
)
ON CONFLICT (id) DO UPDATE SET
    public = true,
    file_size_limit = 52428800;

-- Create storage policies
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

-- Assign sequential IDs to existing users
INSERT INTO public.user_sequences (user_id)
SELECT id FROM auth.users
WHERE id NOT IN (SELECT user_id FROM public.user_sequences)
ORDER BY created_at
ON CONFLICT DO NOTHING;

-- Show results
SELECT 'Migration completed!' as status;

-- Verify the setup
SELECT 
    'Users with sequential IDs: ' || COUNT(*) as result
FROM public.user_sequences;

SELECT 
    'Storage bucket exists: ' || 
    CASE 
        WHEN EXISTS (SELECT FROM storage.buckets WHERE id = 'project-files') 
        THEN 'Yes' 
        ELSE 'No' 
    END as result;