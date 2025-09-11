-- Enable pgcrypto extension for digest function
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Update the hash_password function to ensure it works
CREATE OR REPLACE FUNCTION public.hash_password(password text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
BEGIN
  -- Use digest function with pgcrypto extension
  RETURN encode(digest(password || 'salt123', 'sha256'), 'hex');
END;
$function$;