-- Fix for get_user_emails function error
-- This SQL script creates the missing function that the community page needs

-- Drop the function if it exists (to recreate it cleanly)
DROP FUNCTION IF EXISTS public.get_user_emails(text[]);
DROP FUNCTION IF EXISTS public.get_user_emails(uuid[]);

-- Create the get_user_emails function
CREATE OR REPLACE FUNCTION public.get_user_emails(user_ids uuid[])
RETURNS TABLE (
  user_id uuid,
  email text
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    au.id as user_id,
    au.email::text as email
  FROM auth.users au
  WHERE au.id = ANY(user_ids);
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.get_user_emails(uuid[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_emails(uuid[]) TO anon;

-- Create an overloaded version that accepts text array (for compatibility)
CREATE OR REPLACE FUNCTION public.get_user_emails(user_ids text[])
RETURNS TABLE (
  user_id uuid,
  email text
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    au.id as user_id,
    au.email::text as email
  FROM auth.users au
  WHERE au.id::text = ANY(user_ids);
END;
$$;

-- Grant execute permission for text version
GRANT EXECUTE ON FUNCTION public.get_user_emails(text[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_emails(text[]) TO anon;

-- Alternative: If the above doesn't work due to auth.users access restrictions,
-- create a simpler version using profiles table
CREATE OR REPLACE FUNCTION public.get_user_emails_from_profiles(user_ids uuid[])
RETURNS TABLE (
  user_id uuid,
  email text
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- This assumes you have email stored in profiles or a similar table
  -- Adjust the query based on your actual schema
  RETURN QUERY
  SELECT 
    p.id as user_id,
    p.email::text as email  -- Adjust column name if different
  FROM profiles p
  WHERE p.id = ANY(user_ids);
END;
$$;

-- If you don't store emails in profiles, you might need to:
-- 1. Add email column to profiles table
-- 2. Or create a user_emails table
-- 3. Or modify the frontend to not require emails

-- Check if the function exists and works
-- You can test this in Supabase SQL editor:
-- SELECT * FROM public.get_user_emails(ARRAY['your-user-uuid-here']::uuid[]);