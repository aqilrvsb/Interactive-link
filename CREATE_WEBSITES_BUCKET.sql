-- ================================================
-- CREATE WEBSITES STORAGE BUCKET IN SUPABASE
-- ================================================

-- This script creates the 'websites' storage bucket if it doesn't exist
-- Run this in your Supabase SQL Editor

-- 1. Create the websites storage bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'websites',
  'websites', 
  true,
  10485760, -- 10MB limit
  ARRAY['text/html', 'text/css', 'text/javascript', 'application/javascript']::text[]
) ON CONFLICT (id) DO UPDATE 
SET public = true,
    file_size_limit = 10485760;

-- 2. Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can upload their own website files" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own website files" ON storage.objects;
DROP POLICY IF EXISTS "Website files are publicly accessible" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own website files" ON storage.objects;

-- 3. Create policy to allow authenticated users to upload
CREATE POLICY "Users can upload their own website files"
ON storage.objects FOR INSERT
WITH CHECK (
    bucket_id = 'websites' 
    AND auth.role() = 'authenticated'
);

-- 4. Create policy to allow authenticated users to update their files
CREATE POLICY "Users can update their own website files"
ON storage.objects FOR UPDATE
USING (
    bucket_id = 'websites' 
    AND auth.role() = 'authenticated'
);

-- 5. Create policy for public read access
CREATE POLICY "Website files are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'websites');

-- 6. Create policy to allow users to delete their own files
CREATE POLICY "Users can delete their own website files"
ON storage.objects FOR DELETE
USING (
    bucket_id = 'websites' 
    AND auth.role() = 'authenticated'
);

-- Verify the bucket was created
SELECT * FROM storage.buckets WHERE id = 'websites';
