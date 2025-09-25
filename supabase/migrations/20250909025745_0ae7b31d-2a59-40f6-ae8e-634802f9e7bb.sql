-- Update the handle_new_user function to handle duplicate usernames gracefully
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  base_username text;
  final_username text;
  counter int := 0;
BEGIN
  base_username := NEW.raw_user_meta_data ->> 'username';
  final_username := base_username;
  
  -- If username already exists, append a number to make it unique
  WHILE EXISTS (SELECT 1 FROM public.profiles WHERE username = final_username) LOOP
    counter := counter + 1;
    final_username := base_username || counter::text;
  END LOOP;
  
  INSERT INTO public.profiles (user_id, username, full_name)
  VALUES (
    NEW.id,
    final_username,
    NEW.raw_user_meta_data ->> 'full_name'
  );
  RETURN NEW;
END;
$$;