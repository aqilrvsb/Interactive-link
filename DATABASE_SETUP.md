# Supabase Database Connection Configuration

To connect directly to your Supabase database and run migrations, you need to:

1. Get your database password from Supabase Dashboard:
   - Go to https://supabase.com/dashboard/project/mvmwcgnlebbesarvsvxk/settings/database
   - Find the "Connection string" section
   - Copy the password

2. Add to your .env file:
   ```
   DATABASE_URL=postgresql://postgres:[YOUR-PASSWORD]@db.mvmwcgnlebbesarvsvxk.supabase.co:5432/postgres
   ```

3. Run migrations using Supabase CLI or directly in SQL Editor

## Manual Migration Steps (via Supabase Dashboard)

1. Go to SQL Editor: https://supabase.com/dashboard/project/mvmwcgnlebbesarvsvxk/sql
2. Run these migrations in order:

### Migration 1: Sequential User IDs
Copy and run the content from: `supabase/migrations/20250114_sequential_user_ids.sql`

### Migration 2: Project Files Bucket
Copy and run the content from: `supabase/migrations/20250114_create_project_files_bucket.sql`

## Using Supabase CLI (Alternative)

```bash
# Install Supabase CLI
npm install -g supabase

# Login to Supabase
supabase login

# Link to your project
supabase link --project-ref mvmwcgnlebbesarvsvxk

# Run migrations
supabase db push
```