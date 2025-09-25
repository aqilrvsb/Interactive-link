-- Create a public bucket for project HTML files
INSERT INTO storage.buckets (id, name, public, avif_autodetection, file_size_limit, allowed_mime_types)
VALUES (
  'project-files',
  'project-files',
  true, -- Make it public so files can be accessed directly
  false,
  52428800, -- 50MB limit
  ARRAY['text/html', 'text/css', 'text/javascript', 'application/javascript']
)
ON CONFLICT (id) DO NOTHING;

-- Create RLS policies for the bucket
CREATE POLICY "Users can upload their own project files" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'project-files' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update their own project files" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'project-files' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own project files" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'project-files' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Public read access for project files" ON storage.objects
  FOR SELECT TO public
  USING (bucket_id = 'project-files');