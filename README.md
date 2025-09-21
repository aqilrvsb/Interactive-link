# CepatBina - Multi-Tenant Website Builder with Custom Domain Support

## System Architecture Overview

This project consists of TWO Vercel deployments from ONE GitHub repository:

### Project A: Main Application (cepatbina.com)
- **Purpose**: Dashboard, authentication, website builder/editor
- **Domain**: cepatbina.com, www.cepatbina.com
- **Tech Stack**: React (Vite), Supabase, TailwindCSS
- **Deployment**: Standard Vercel deployment with React build

### Project B: Live Sites Server (*.cepatbina.com)
- **Purpose**: Serves customer websites on custom domains
- **Domains**: *.cepatbina.com, plus all customer custom domains
- **Tech Stack**: Vercel Serverless Function (Node.js)
- **Deployment**: Same repo, but only uses `/api/render.js`

## Database Structure

### Tables in Supabase:

#### 1. `projects` table (existing)
```sql
- id: integer (primary key)
- user_id: uuid (references auth.users)
- title: text
- code_content: text (HTML/CSS/JS content)
- is_public: boolean
- created_at: timestamp
```

#### 2. `custom_domains` table (for domain mapping)
```sql
- id: uuid (primary key)
- project_id: integer (references projects.id)
- user_id: uuid (references auth.users)
- domain_name: text (e.g., "client.com" or "project.cepatbina.com")
- status: text ("pending", "verified", "active")
- verification_token: text
- dns_instructions: jsonb
- error_message: text
- verified_at: timestamp
- created_at: timestamp
- updated_at: timestamp
```

## File Structure

```
Interactive-link-main/
├── src/                     # React application (Main App)
│   ├── pages/
│   │   ├── Dashboard.tsx    # Project management
│   │   ├── WebsiteBuilder.tsx # Code editor
│   │   └── LivePreview.tsx  # Preview component
│   └── integrations/
│       └── supabase/
│           └── client.ts    # Supabase connection (hardcoded)
├── api/
│   └── render.js           # Serverless function for Live Sites
├── vercel.json             # Config for Main App
├── vercel-live.json        # Config for Live Sites
└── package.json
```

## How Domain Routing Works

### 1. Subdomain Request Flow (e.g., project1.cepatbina.com)
```
User visits project1.cepatbina.com
↓
DNS resolves to Vercel (via *.cepatbina.com wildcard)
↓
Vercel routes to Live Sites project
↓
/api/render.js reads hostname
↓
Extracts subdomain: "project1"
↓
Queries database: Find project where title matches "project1"
↓
Returns project HTML content
```

### 2. Custom Domain Request Flow (e.g., client.com)
```
User visits client.com
↓
DNS (CNAME) points to cepatbina.com
↓
Vercel routes to Live Sites project
↓
/api/render.js reads hostname: "client.com"
↓
Queries custom_domains table for matching domain
↓
Gets project_id from mapping
↓
Fetches project content from projects table
↓
Returns project HTML content
```

## Deployment Configuration

### Main App (cepatbina.com) - Vercel Project Settings:
```
Framework Preset: Vite
Build Command: npm run build
Output Directory: dist
Install Command: npm install
```

### Live Sites (*.cepatbina.com) - Vercel Project Settings:
```
Framework Preset: Other
Build Command: cp vercel-live.json vercel.json
Output Directory: .
Install Command: npm install
```

## API Endpoints

### /api/render.js (Live Sites Project)
The only endpoint in the Live Sites project. Handles ALL domain requests:

```javascript
// Reads hostname from request
// Checks if subdomain of cepatbina.com → query by project title
// Else → query custom_domains table
// Returns HTML content or 404
```

## Adding a Custom Domain - Complete Flow

### Step 1: User adds domain in dashboard
```javascript
// In Dashboard component
const addDomain = async (projectId, domainName) => {
  // Insert into custom_domains table
  const { data } = await supabase
    .from('custom_domains')
    .insert({
      project_id: projectId,
      domain_name: domainName,
      status: 'pending',
      dns_instructions: {
        type: 'CNAME',
        host: '@',
        value: 'cepatbina.com'
      }
    });
};
```

### Step 2: Show DNS instructions to user
```
Please add these DNS records at your domain provider:
Type: CNAME
Host: @ (or www)
Value: cepatbina.com
```

### Step 3: User configures DNS at their registrar

### Step 4: Verify DNS (manual or automated)
```javascript
// Check if DNS points to us
const checkDNS = async (domain) => {
  // Use DNS lookup API or manual verification
  // Update status to 'verified' when confirmed
};
```

### Step 5: Add domain to Vercel (via API)
```javascript
// Requires Vercel API token
const addToVercel = async (domain) => {
  const response = await fetch(
    `https://api.vercel.com/v10/projects/${LIVE_SITES_PROJECT_ID}/domains`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${VERCEL_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ name: domain })
    }
  );
};
```

### Step 6: Update status to 'active'
Domain is now live and serving content!

## Environment Configuration

### Supabase Connection (Hardcoded in both projects):
```javascript
const SUPABASE_URL = "https://mvmwcgnlebbesarvsvxk.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...";
```

No environment variables needed - credentials are in:
- `/src/integrations/supabase/client.ts` (Main App)
- `/api/render.js` (Live Sites)

## DNS Configuration

### For cepatbina.com (at your DNS provider):
```
A     @     76.76.21.21         # Vercel IP
A     *     76.76.21.21         # Wildcard for subdomains
CNAME www   cname.vercel-dns.com
```

### For customer domains:
```
CNAME @     cepatbina.com       # Points to your domain
# OR
A     @     76.76.21.21         # Direct to Vercel
```

## Testing the Setup

### 1. Test subdomain routing:
- Visit: `test.cepatbina.com`
- Should show: "Site not found" (no project named "test")

### 2. Test with real project:
- Create project titled "demo"
- Visit: `demo.cepatbina.com`
- Should show: That project's content

### 3. Test custom domain:
- Add domain mapping in custom_domains table
- Configure DNS
- Add to Vercel via API
- Visit custom domain
- Should show: Mapped project's content

## Current Limitations & TODOs

### Completed:
- ✅ Two-project setup on Vercel
- ✅ Wildcard subdomain support
- ✅ Database schema for domain mappings
- ✅ Serverless function for routing

### Still Needed:
- ⏳ UI for domain management in dashboard
- ⏳ DNS verification system
- ⏳ Vercel API integration for adding domains
- ⏳ SSL certificate monitoring
- ⏳ Domain removal functionality

## Security Considerations

1. **Public Anon Key**: The Supabase anon key is public (safe for frontend)
2. **RLS Policies**: Ensure proper Row Level Security on custom_domains table
3. **Domain Verification**: Always verify DNS before activating domains
4. **Rate Limiting**: Consider adding rate limits to prevent abuse

## Troubleshooting

### "Site not found" on subdomain:
- Check if project title matches subdomain exactly
- Ensure project is marked as public
- Verify wildcard DNS is configured

### Custom domain not working:
- Check DNS propagation (can take 24-48 hours)
- Verify domain is added to Vercel project
- Check custom_domains table for correct mapping
- Ensure SSL certificate is provisioned

### Build fails on Live Sites project:
- Ensure vercel-live.json exists
- Check build command: `cp vercel-live.json vercel.json`
- Verify /api/render.js has no syntax errors

## Support & Maintenance

This architecture supports:
- Unlimited subdomains (via wildcard)
- Hundreds of custom domains
- Automatic SSL via Vercel/Let's Encrypt
- Global CDN distribution
- Zero-downtime deployments

For 200+ clients, this setup will handle the load easily on Vercel's free/pro tier.