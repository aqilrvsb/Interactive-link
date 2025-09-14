-- Create RLS policies for the websites storage bucket
-- Allow authenticated users to upload their own websites
CREATE POLICY "Users can upload their own websites" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'websites' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow public read access to websites
CREATE POLICY "Public websites are viewable by everyone" ON storage.objects
FOR SELECT USING (bucket_id = 'websites');

-- Allow users to update their own websites
CREATE POLICY "Users can update their own websites" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'websites' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow users to delete their own websites
CREATE POLICY "Users can delete their own websites" ON storage.objects
FOR DELETE USING (
  bucket_id = 'websites' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);