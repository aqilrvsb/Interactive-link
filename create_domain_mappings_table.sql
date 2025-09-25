-- Create domain_mappings table for custom domains
CREATE TABLE IF NOT EXISTS domain_mappings (
  id SERIAL PRIMARY KEY,
  domain VARCHAR(255) UNIQUE NOT NULL,
  project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
  verified BOOLEAN DEFAULT false,
  verification_token VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster lookups
CREATE INDEX idx_domain_mappings_domain ON domain_mappings(domain);
CREATE INDEX idx_domain_mappings_project ON domain_mappings(project_id);

-- RLS policies
ALTER TABLE domain_mappings ENABLE ROW LEVEL SECURITY;

-- Users can see domain mappings for their own projects
CREATE POLICY "Users can view own project domains" ON domain_mappings
  FOR SELECT USING (
    project_id IN (
      SELECT id FROM projects WHERE user_id = auth.uid()
    )
  );

-- Users can insert domain mappings for their own projects
CREATE POLICY "Users can add domains to own projects" ON domain_mappings
  FOR INSERT WITH CHECK (
    project_id IN (
      SELECT id FROM projects WHERE user_id = auth.uid()
    )
  );

-- Users can update domain mappings for their own projects
CREATE POLICY "Users can update own project domains" ON domain_mappings
  FOR UPDATE USING (
    project_id IN (
      SELECT id FROM projects WHERE user_id = auth.uid()
    )
  );

-- Users can delete domain mappings for their own projects  
CREATE POLICY "Users can delete own project domains" ON domain_mappings
  FOR DELETE USING (
    project_id IN (
      SELECT id FROM projects WHERE user_id = auth.uid()
    )
  );