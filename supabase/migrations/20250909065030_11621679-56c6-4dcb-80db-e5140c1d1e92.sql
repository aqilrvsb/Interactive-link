-- Fix security warnings by setting search_path for functions
CREATE OR REPLACE FUNCTION public.hash_password(password TEXT)
RETURNS TEXT AS $$
BEGIN
  -- Simple hash function - in production you'd want bcrypt
  RETURN encode(digest(password || 'salt123', 'sha256'), 'hex');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Update function for user registration with search_path
CREATE OR REPLACE FUNCTION public.register_user(
  p_username TEXT,
  p_password TEXT,
  p_full_name TEXT DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
  user_id UUID;
  result JSON;
BEGIN
  -- Check if username already exists
  IF EXISTS (SELECT 1 FROM public.users WHERE username = p_username) THEN
    RETURN json_build_object('error', 'Username already exists');
  END IF;
  
  -- Insert new user
  INSERT INTO public.users (username, password_hash, full_name)
  VALUES (p_username, public.hash_password(p_password), p_full_name)
  RETURNING id INTO user_id;
  
  -- Return success with user data
  SELECT json_build_object(
    'success', true,
    'user', json_build_object(
      'id', id,
      'username', username,
      'full_name', full_name
    )
  ) INTO result
  FROM public.users WHERE id = user_id;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Update function for user login with search_path
CREATE OR REPLACE FUNCTION public.login_user(
  p_username TEXT,
  p_password TEXT
)
RETURNS JSON AS $$
DECLARE
  user_record RECORD;
  result JSON;
BEGIN
  -- Check credentials
  SELECT * INTO user_record
  FROM public.users 
  WHERE username = p_username 
  AND password_hash = public.hash_password(p_password);
  
  IF user_record IS NULL THEN
    RETURN json_build_object('error', 'Invalid username or password');
  END IF;
  
  -- Return success with user data
  RETURN json_build_object(
    'success', true,
    'user', json_build_object(
      'id', user_record.id,
      'username', user_record.username,
      'full_name', user_record.full_name
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;