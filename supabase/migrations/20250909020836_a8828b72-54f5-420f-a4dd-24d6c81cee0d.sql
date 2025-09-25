-- Create tables for enhanced website builder

-- User settings for custom Supabase configuration
CREATE TABLE public.user_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  custom_supabase_url TEXT,
  custom_supabase_key TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- Site versions for versioned HTML builds
CREATE TABLE public.site_versions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL DEFAULT 1,
  html_content TEXT NOT NULL,
  css_content TEXT,
  js_content TEXT,
  assets JSONB DEFAULT '[]'::jsonb,
  build_timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  is_published BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Custom domains for projects
CREATE TABLE public.custom_domains (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  domain_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'verifying', 'connected', 'error')),
  verification_token TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  dns_instructions JSONB,
  error_message TEXT,
  verified_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(domain_name)
);

-- Assets storage for site versions
CREATE TABLE public.site_assets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  site_version_id UUID NOT NULL REFERENCES public.site_versions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  filename TEXT NOT NULL,
  content_type TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  file_path TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.site_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.custom_domains ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.site_assets ENABLE ROW LEVEL SECURITY;

-- RLS policies for user_settings
CREATE POLICY "Users can view their own settings"
ON public.user_settings FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own settings"
ON public.user_settings FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own settings"
ON public.user_settings FOR UPDATE
USING (auth.uid() = user_id);

-- RLS policies for site_versions
CREATE POLICY "Users can view their own site versions"
ON public.site_versions FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own site versions"
ON public.site_versions FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own site versions"
ON public.site_versions FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own site versions"
ON public.site_versions FOR DELETE
USING (auth.uid() = user_id);

-- RLS policies for custom_domains
CREATE POLICY "Users can view their own domains"
ON public.custom_domains FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own domains"
ON public.custom_domains FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own domains"
ON public.custom_domains FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own domains"
ON public.custom_domains FOR DELETE
USING (auth.uid() = user_id);

-- RLS policies for site_assets
CREATE POLICY "Users can view their own assets"
ON public.site_assets FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own assets"
ON public.site_assets FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own assets"
ON public.site_assets FOR DELETE
USING (auth.uid() = user_id);

-- Indexes for better performance
CREATE INDEX idx_site_versions_project_id ON public.site_versions(project_id);
CREATE INDEX idx_site_versions_user_id ON public.site_versions(user_id);
CREATE INDEX idx_custom_domains_project_id ON public.custom_domains(project_id);
CREATE INDEX idx_custom_domains_domain_name ON public.custom_domains(domain_name);
CREATE INDEX idx_site_assets_site_version_id ON public.site_assets(site_version_id);

-- Triggers for updated_at timestamps
CREATE TRIGGER update_user_settings_updated_at
BEFORE UPDATE ON public.user_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_custom_domains_updated_at
BEFORE UPDATE ON public.custom_domains
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();