-- Create the websites storage bucket for hosting HTML files
INSERT INTO storage.buckets (id, name, public) 
VALUES ('websites', 'websites', true)
ON CONFLICT (id) DO NOTHING;

-- Create policy to allow authenticated users to upload their own website files
CREATE POLICY "Users can upload their own website files" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'websites' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Create policy to allow authenticated users to update their own website files
CREATE POLICY "Users can update their own website files" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'websites' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Create policy to allow everyone to view website files (public access)
CREATE POLICY "Website files are publicly accessible" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'websites');

-- Create policy to allow users to delete their own website files
CREATE POLICY "Users can delete their own website files" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'websites' AND auth.uid()::text = (storage.foldername(name))[1]);