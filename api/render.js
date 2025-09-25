import { createClient } from '@supabase/supabase-js';

// Import framework processor - we'll inline it here since this is a serverless function
const processFrameworkCode = (code) => {
  if (!code || !code.trim()) return code;
  
  // Check if it's already complete HTML
  if (code.includes('<!DOCTYPE') || code.includes('<html')) {
    return code;
  }
  
  // Detect React
  if (code.includes('React') || code.includes('useState') || code.includes('createElement') || /<[A-Z]\w+/.test(code)) {
    const reactHTML = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>React App</title>
    <script crossorigin src="https://unpkg.com/react@18/umd/react.production.min.js"></script>
    <script crossorigin src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js"></script>
    <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
</head>
<body>
    <div id="root"></div>
    <script type="text/babel">
        ${code}
        // Auto-render if not already done
        if (typeof App !== 'undefined' && !code.includes('ReactDOM')) {
            const root = ReactDOM.createRoot(document.getElementById('root'));
            root.render(React.createElement(App));
        }
    </script>
</body>
</html>`;
    return reactHTML;
  }
  
  // Detect Vue
  if (code.includes('Vue') || code.includes('v-model') || code.includes('@click') || code.includes('<template>')) {
    const vueHTML = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Vue App</title>
    <script src="https://unpkg.com/vue@3/dist/vue.global.js"></script>
</head>
<body>
    <div id="app">
        ${code.includes('<template>') ? code.match(/<template>([\s\S]*?)<\/template>/)?.[1] || '' : '<div>{{ message }}</div>'}
    </div>
    <script>
        const { createApp } = Vue;
        ${code.includes('<script>') ? code.match(/<script>([\s\S]*?)<\/script>/)?.[1] : code}
    </script>
</body>
</html>`;
    return vueHTML;
  }
  
  // Default: wrap in HTML
  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Website</title>
</head>
<body>
    ${code}
</body>
</html>`;
};

const SUPABASE_URL = "https://mvmwcgnlebbesarvsvxk.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im12bXdjZ25sZWJiZXNhcnZzdnhrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTcyMTc4NzksImV4cCI6MjA3Mjc5Mzg3OX0.OrQkQdGWmLNPCAYsjiRknXBUEsuegMS82-3b2D2g5ik";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

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
        return res.status(200).send(processFrameworkCode(project.code_content || '<h1>Project has no content</h1>'));
      }
    }
    
    // Look up custom domain in custom_domains table
    const { data: mapping } = await supabase
      .from('custom_domains')
      .select('project_id')
      .eq('domain_name', domain)
      .eq('status', 'active')
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
    res.status(200).send(processFrameworkCode(project.code_content || '<h1>Project has no content yet</h1>'));
    
  } catch (error) {
    console.error('Error in render:', error);
    res.status(500).send('Internal Server Error');
  }
}