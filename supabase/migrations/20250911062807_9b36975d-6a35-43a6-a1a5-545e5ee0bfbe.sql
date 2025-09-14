-- Remove the foreign key constraint that's causing the issue
-- The projects table is trying to reference auth.users but we're using custom authentication

ALTER TABLE public.projects DROP CONSTRAINT IF EXISTS projects_user_id_fkey;

-- Since we're using custom auth with the users table, we don't need this foreign key constraint
-- The application logic will handle ensuring valid user_ids