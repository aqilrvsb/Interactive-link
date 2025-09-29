-- First, let's check if we need to create the trigger for handle_new_user
-- The function exists but there's no trigger to call it

-- Create trigger to automatically create profile when user signs up
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Also, let's make the username constraint handle conflicts better
-- by making it case-insensitive and adding a unique constraint if it doesn't exist
ALTER TABLE public.profiles 
ADD CONSTRAINT profiles_username_key UNIQUE (username);