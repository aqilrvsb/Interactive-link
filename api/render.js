import { supabase } from '../src/integrations/supabase/client.js';

export default async function handler(req, res) {
  try {
    // Get the hostname from the request
    const host = (req.headers['x-forwarded-host'] || req.headers.host || '').toLowerCase();
    
    // Normalize www
    const domain = host.startsWith('www.') ? host.slice(4) : host;
    
    console.log('Serving domain:', domain);
    
    // Special handling for subdomains of cepatbina.com
    let projectIdentifier = null;
    
    if (domain.endsWith('.cepatbina.com')) {
      // Extract subdomain (e.g., 'aqilxxxx' from 'aqilxxxx.cepatbina.com')
      const subdomain = domain.split('.')[0];
      
      // Look up project by subdomain/slug
      const { data: project } = await supabase
        .from('projects')
        .select('id, code_content')
        .ilike('title', subdomain)
        .single();
        
      if (project) {
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        res.setHeader('Cache-Control', 'public, max-age=3600');
        return res.status(200).send(project.code_content || '<h1>Project has no content</h1>');
      }
    }
    
    // Look up custom domain in domain_mappings table
    const { data: mapping } = await supabase
      .from('domain_mappings')
      .select('project_id')
      .eq('domain', domain)
      .eq('verified', true)
      .single();
    
    if (!mapping) {
      return res.status(404).send(`
        <!DOCTYPE html>
        <html>
        <head><title>Site Not Found</title></head>
        <body style="font-family: system-ui; padding: 2rem; text-align: center;">
          <h1>Site Not Found</h1>
          <p>The domain ${domain} is not connected to any project.</p>
          <p><a href="https://cepatbina.com">Go to CepatBina</a></p>
        </body>
        </html>
      `);
    }
    
    // Fetch project content
    const { data: project } = await supabase
      .from('projects')
      .select('code_content, title')
      .eq('id', mapping.project_id)
      .single();
    
    if (!project) {
      return res.status(404).send('Project not found');
    }
    
    // Return the project HTML
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=3600');
    res.status(200).send(project.code_content || '<h1>Project has no content yet</h1>');
    
  } catch (error) {
    console.error('Error in render:', error);
    res.status(500).send('Internal Server Error');
  }
}