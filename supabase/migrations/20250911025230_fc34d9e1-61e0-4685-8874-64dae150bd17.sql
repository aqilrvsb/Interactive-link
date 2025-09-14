-- Fix the hash_password function with proper type casting for the digest function
CREATE OR REPLACE FUNCTION public.hash_password(password text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
BEGIN
  -- Use digest function with explicit type casting for the algorithm parameter
  RETURN encode(digest((password || 'salt123')::bytea, 'sha256'::text), 'hex');
END;
$function$;