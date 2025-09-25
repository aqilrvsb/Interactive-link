# URL Structure Documentation

## New URL Format
Projects now use the following URL structure:
```
https://your-domain.com/{user_id}/preview/{project-name}
```

Example:
- User #1 creates "My Cool Website" → `/1/preview/my-cool-website`
- User #2 creates "Portfolio Site" → `/2/preview/portfolio-site`
- User #150 creates "Business Page" → `/150/preview/business-page`

## Sequential User IDs
- Every new user automatically gets a sequential ID: 1, 2, 3, 4, 5...
- This ID is permanent and unique to each user
- Stored in the `user_sequences` table in Supabase

## How It Works

### 1. User Registration
When a new user signs up:
- They automatically get the next sequential ID
- First user gets ID #1, second user gets ID #2, etc.

### 2. Project Creation
When a user creates/saves a project:
- Project gets a URL-friendly slug from its title
- URL becomes: `/{user_sequential_id}/preview/{project-slug}`
- Example: User #5 creates "My Portfolio" → `/5/preview/my-portfolio`

### 3. Project Renaming
When a project is renamed:
- The slug updates to match the new name
- Old URL stops working, new URL is created
- Example: Rename "Test Site" to "Production Site"
  - Old: `/3/preview/test-site`
  - New: `/3/preview/production-site`

## Benefits
1. **Clean URLs**: `/5/preview/my-website` instead of `/preview/my-website-a1b2c3d4`
2. **User Organization**: Easy to see all projects by a specific user
3. **No Conflicts**: User #1 and User #100 can both have "my-website"
4. **SEO Friendly**: Clean, readable URLs that work well with search engines

## Database Migrations Required
Run these migrations in your Supabase SQL editor:
1. `20250114_sequential_user_ids.sql` - Creates sequential user ID system
2. `20250114_create_project_files_bucket.sql` - Creates storage bucket for HTML files

## Testing
1. Create a new user account
2. Check their sequential ID in the `user_sequences` table
3. Create a project and save it
4. The preview URL will be: `/{sequential_id}/preview/{project-name}`