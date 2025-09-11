-- Use a simpler approach with md5 which is built into PostgreSQL
CREATE OR REPLACE FUNCTION public.hash_password(password text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
BEGIN
  -- Use md5 which is built into PostgreSQL
  RETURN md5(password || 'salt123');
END;
$function$;