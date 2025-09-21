# CepatBina - Multi-Tenant Website Builder with Custom Domain Support

## System Overview

A website builder where users create projects, and each project can have its own custom domain. One user can have multiple projects, each with different domains.

## Real Example Scenario

### Client A has 2 projects:

**Project 1:**
- Project ID: 8
- Title: "aqilxxxx"
- Preview URL: `www.cepatbina.com/p/8/aqilxxxx`
- Custom Domain: `www.aqil.com`

**Project 2:**
- Project ID: 10  
- Title: "meow"
- Preview URL: `www.cepatbina.com/p/10/meow`
- Custom Domain: `www.meow.com`

### How It Works:

1. **Client A creates Project 1 (aqilxxxx)**
   - Gets preview URL: `cepatbina.com/p/8/aqilxxxx`
   - Clicks "Add Domain" → enters `aqil.com`
   - Configures DNS at their registrar
   - Now `www.aqil.com` shows Project 1's website

2. **Client A creates Project 2 (meow)**
   - Gets preview URL: `cepatbina.com/p/10/meow`
   - Clicks "Add Domain" → enters `meow.com`
   - Configures DNS at their registrar
   - Now `www.meow.com` shows Project 2's website

## Architecture: Two Vercel Projects from One GitHub Repo

### Project A: Main Application (`cepatbina.com`)
- Dashboard where users manage projects
- Website builder/editor
- Authentication
- Preview URLs (`/p/[id]/[slug]`)

### Project B: Live Sites Server (`*.cepatbina.com` + all custom domains)
- Only runs `/api/render.js`
- Receives ALL custom domain traffic
- Looks up which project owns the domain
- Returns that project's HTML content

## The Domain Routing Magic

When someone visits `www.aqil.com`:

```
1. Browser requests www.aqil.com
   ↓
2. DNS points to Vercel (76.76.21.21)
   ↓
3. Vercel routes to Live Sites project
   ↓
4. /api/render.js executes:
   - Reads hostname: "www.aqil.com"
   - Queries database: SELECT project_id FROM custom_domains WHERE domain_name = 'www.aqil.com'
   - Gets: project_id = 8
   - Fetches: SELECT code_content FROM projects WHERE id = 8
   - Returns: Project 8's HTML
   ↓
5. Visitor sees Project 8's website on www.aqil.com
```

## Database Structure

### `projects` table
| id | user_id | title | code_content | created_at |
|----|---------|-------|--------------|------------|
| 8 | uuid-clientA | aqilxxxx | `<html>...project 1...</html>` | 2025-01-16 |
| 10 | uuid-clientA | meow | `<html>...project 2...</html>` | 2025-01-17 |

### `custom_domains` table
| id | project_id | domain_name | status | verified_at |
|----|------------|-------------|---------|-------------|
| 1 | 8 | aqil.com | active | 2025-01-16 |
| 2 | 8 | www.aqil.com | active | 2025-01-16 |
| 3 | 10 | meow.com | active | 2025-01-17 |
| 4 | 10 | www.meow.com | active | 2025-01-17 |

## File Structure
```
Interactive-link-main/
├── src/                        # React app (Main Application)
│   ├── pages/
│   │   ├── Dashboard.tsx       # Shows all user projects
│   │   ├── WebsiteBuilder.tsx  # Editor for projects
│   │   └── LivePreview.tsx     # Preview component
│   └── integrations/
│       └── supabase/
│           └── client.ts       # Hardcoded Supabase credentials
├── api/
│   └── render.js              # THE MAGIC FILE - routes domains to projects
├── vercel.json                # Config for Main App
├── vercel-live.json           # Config for Live Sites (routes everything to render.js)
└── package.json
```

## The Key File: `/api/render.js`

This single file handles ALL custom domains:

```javascript
export default async function handler(req, res) {
  // 1. Get the domain being accessed
  const domain = req.headers.host; // e.g., "www.aqil.com"
  
  // 2. Look up which project owns this domain
  const { data: mapping } = await supabase
    .from('custom_domains')
    .select('project_id')
    .eq('domain_name', domain)
    .eq('status', 'active')
    .single();
    
  if (!mapping) {
    return res.status(404).send('Domain not configured');
  }
  
  // 3. Get that project's content
  const { data: project } = await supabase
    .from('projects')
    .select('code_content')
    .eq('id', mapping.project_id)
    .single();
    
  // 4. Return the project's HTML
  res.setHeader('Content-Type', 'text/html');
  res.send(project.code_content);
}
```

## Deployment Configuration

### Main App Vercel Project (`cepatbina.com`)
```json
{
  "Framework Preset": "Vite",
  "Build Command": "npm run build",
  "Output Directory": "dist"
}
```
Domains configured:
- `cepatbina.com`
- `www.cepatbina.com`

### Live Sites Vercel Project (`cepatbina-live-sites`)
```json
{
  "Framework Preset": "Other",
  "Build Command": "cp vercel-live.json vercel.json",
  "Output Directory": "."
}
```
Domains configured:
- `*.cepatbina.com` (wildcard for subdomains)
- Each client domain added via Vercel API

## Adding a Custom Domain - Complete Flow

### Step 1: User adds domain in dashboard
User clicks "Add Domain" on their project and enters `aqil.com`

### Step 2: Save to database
```javascript
await supabase.from('custom_domains').insert({
  project_id: 8,
  domain_name: 'aqil.com',
  status: 'pending'
});
```

### Step 3: User configures DNS
User adds at their domain registrar:
```
A     @     76.76.21.21
A     @     76.76.21.61
CNAME www   cname.vercel-dns.com
```

### Step 4: Verify DNS (manual process for now)
Check if DNS points to Vercel correctly

### Step 5: Add domain to Vercel (manual for now)
In Vercel dashboard for Live Sites project:
- Settings → Domains → Add Domain
- Enter: `aqil.com` and `www.aqil.com`

### Step 6: Update database
```javascript
await supabase.from('custom_domains')
  .update({ status: 'active', verified_at: new Date() })
  .eq('domain_name', 'aqil.com');
```

### Step 7: Domain is live!
Now when anyone visits `aqil.com`, they see Project 8's content

## Current Implementation Status

### ✅ WORKING NOW:
- Main app dashboard at `cepatbina.com`
- Project creation and editing
- Preview URLs (`/p/[id]/[slug]`)
- Two Vercel projects deployed
- `/api/render.js` serverless function
- Database tables created
- Wildcard subdomain (`*.cepatbina.com`) configured
- Add Domain UI with detailed instructions

### ⚠️ PARTIALLY WORKING:
- Domain to project routing (render.js ready but needs testing)
- Database queries for domain lookup

### ❌ TODO - NOT YET IMPLEMENTED:
- Actually saving domains to database when user clicks "Add Domain"
- DNS verification system
- Vercel API integration to add domains programmatically
- List of configured domains per project
- Domain removal functionality
- Domain status tracking (pending/verified/active)

## Testing the Current Setup

### Test 1: Subdomain routing (should work)
1. Create project with title "test"
2. Visit `test.cepatbina.com`
3. Should show that project's content

### Test 2: Custom domain (manual setup required)
1. Add domain mapping manually to database:
```sql
INSERT INTO custom_domains (project_id, domain_name, status)
VALUES (8, 'yourdomain.com', 'active');
```
2. Add domain to Vercel Live Sites project manually
3. Configure DNS
4. Visit domain - should show project content

## For New AI/Developers Understanding This:

### The Core Concept:
- **Main App** = Where users build websites
- **Live Sites** = Where websites are served on custom domains
- **One repository** = Both projects use same code
- **render.js** = The brain that routes domains to correct projects

### The Flow:
1. User creates project → stored in database with HTML content
2. User adds custom domain → stored in custom_domains table
3. Visitor goes to custom domain → hits render.js
4. render.js looks up domain → finds project → returns HTML
5. Visitor sees the website on custom domain

### Critical Files:
- `/api/render.js` - Routes domains to projects
- `/src/pages/Dashboard.tsx` - Project management UI
- `vercel-live.json` - Makes Live Sites project work
- Database tables - Store project-domain mappings

### What Makes It Work:
The magic is that ALL custom domains point to the same Vercel project (Live Sites), but `/api/render.js` reads the hostname and serves different content based on database lookup. This allows unlimited projects to have custom domains without manual configuration for each one.

## Support for 200+ Clients

This architecture supports:
- ✅ Unlimited projects per user
- ✅ Multiple domains per project
- ✅ Automatic SSL via Vercel
- ✅ Global CDN distribution
- ✅ No per-domain server configuration
- ✅ Scales to thousands of domains

## Next Development Steps

1. **Make "Add Domain" button functional**
   - Save domain to database
   - Show list of domains per project

2. **Add DNS verification**
   - Check if DNS points to Vercel
   - Update domain status

3. **Integrate Vercel API**
   - Programmatically add domains to Live Sites project
   - Remove manual step

4. **Add domain management UI**
   - Show all domains for a project
   - Remove domain functionality
   - Domain status indicators

## Environment Variables

None needed! Supabase credentials are hardcoded in:
- `/src/integrations/supabase/client.ts`
- `/api/render.js`

Both use the same credentials:
```javascript
const SUPABASE_URL = "https://mvmwcgnlebbesarvsvxk.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...";
```