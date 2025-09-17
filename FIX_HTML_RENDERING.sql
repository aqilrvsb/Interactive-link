-- ================================================
-- FIX HTML RENDERING IN SUPABASE STORAGE
-- Run this in Supabase SQL Editor to fix HTML files showing as plain text
-- ================================================

-- 1. Drop and recreate the websites bucket with proper settings
DELETE FROM storage.buckets WHERE id = 'websites';

-- 2. Create websites bucket with HTML mime type support
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'websites',
  'websites', 
  true,
  10485760, -- 10MB limit
  ARRAY['text/html', 'text/css', 'text/javascript', 'application/javascript', 'text/plain']::text[]
) ON CONFLICT (id) DO UPDATE 
SET public = true,
    file_size_limit = 10485760,
    allowed_mime_types = ARRAY['text/html', 'text/css', 'text/javascript', 'application/javascript', 'text/plain']::text[];

-- 3. Update RLS policies for the websites bucket
DROP POLICY IF EXISTS "Users can upload website files" ON storage.objects;
DROP POLICY IF EXISTS "Users can update website files" ON storage.objects;
DROP POLICY IF EXISTS "Website files are publicly accessible" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete website files" ON storage.objects;

-- Allow authenticated users to upload
CREATE POLICY "Users can upload website files"
ON storage.objects FOR INSERT
WITH CHECK (
    bucket_id = 'websites' 
    AND auth.role() = 'authenticated'
);

-- Allow authenticated users to update
CREATE POLICY "Users can update website files"
ON storage.objects FOR UPDATE
USING (
    bucket_id = 'websites' 
    AND auth.role() = 'authenticated'
);

-- Allow public read access
CREATE POLICY "Website files are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'websites');

-- Allow authenticated users to delete
CREATE POLICY "Users can delete website files"
ON storage.objects FOR DELETE
USING (
    bucket_id = 'websites' 
    AND auth.role() = 'authenticated'
);

-- 4. Update any existing files to have correct content type (if needed)
UPDATE storage.objects
SET metadata = jsonb_set(
    COALESCE(metadata, '{}'::jsonb),
    '{mimetype}',
    '"text/html"'
)
WHERE bucket_id = 'websites' 
AND name LIKE '%.html';

-- 5. Verify the bucket configuration
SELECT * FROM storage.buckets WHERE id = 'websites';

-- 6. Check if there are any HTML files
SELECT id, name, metadata 
FROM storage.objects 
WHERE bucket_id = 'websites' 
AND name LIKE '%.html'
LIMIT 5;

-- Success message
SELECT '✅ Storage bucket reconfigured for HTML rendering!' as message;