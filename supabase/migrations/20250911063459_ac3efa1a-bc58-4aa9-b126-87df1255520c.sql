-- Drop the previous policies that use auth.uid() which doesn't work with custom auth
DROP POLICY IF EXISTS "Users can upload their own websites" ON storage.objects;
DROP POLICY IF EXISTS "Public websites are viewable by everyone" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own websites" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own websites" ON storage.objects;

-- Create new policies that work with custom authentication
-- Since we're using custom auth, we'll make the policies more permissive for the websites bucket

-- Allow anyone to upload to websites bucket (application logic will handle user restrictions)
CREATE POLICY "Enable insert for websites bucket" ON storage.objects
FOR INSERT WITH CHECK (bucket_id = 'websites');

-- Allow public read access to websites
CREATE POLICY "Enable select for websites bucket" ON storage.objects
FOR SELECT USING (bucket_id = 'websites');

-- Allow updates to websites bucket
CREATE POLICY "Enable update for websites bucket" ON storage.objects
FOR UPDATE USING (bucket_id = 'websites');

-- Allow deletes from websites bucket
CREATE POLICY "Enable delete for websites bucket" ON storage.objects
FOR DELETE USING (bucket_id = 'websites');