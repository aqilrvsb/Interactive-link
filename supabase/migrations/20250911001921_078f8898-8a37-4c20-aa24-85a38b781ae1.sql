-- Fix the hash_password function with proper type casting
CREATE OR REPLACE FUNCTION public.hash_password(password text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
BEGIN
  -- Use digest function with proper type casting
  RETURN encode(digest(password || 'salt123', 'sha256'::text), 'hex');
END;
$function$;