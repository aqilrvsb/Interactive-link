-- Create a table to track sequential user IDs
CREATE TABLE IF NOT EXISTS public.user_sequences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  sequential_id SERIAL UNIQUE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.user_sequences ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own sequential ID" ON public.user_sequences
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "System can insert sequential IDs" ON public.user_sequences
  FOR INSERT WITH CHECK (true);

-- Create a function to automatically assign sequential IDs to new users
CREATE OR REPLACE FUNCTION public.assign_sequential_user_id()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_sequences (user_id)
  VALUES (NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to assign sequential ID when user signs up
CREATE TRIGGER on_auth_user_created_assign_sequential_id
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.assign_sequential_user_id();

-- Add sequential_id to profiles view for easy access
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS sequential_id INTEGER;

-- Create a function to get user's sequential ID
CREATE OR REPLACE FUNCTION public.get_user_sequential_id(user_uuid UUID)
RETURNS INTEGER AS $$
DECLARE
  seq_id INTEGER;
BEGIN
  SELECT sequential_id INTO seq_id
  FROM public.user_sequences
  WHERE user_id = user_uuid;
  
  RETURN seq_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update existing users with sequential IDs (if any exist)
INSERT INTO public.user_sequences (user_id)
SELECT id FROM auth.users
WHERE id NOT IN (SELECT user_id FROM public.user_sequences)
ORDER BY created_at;