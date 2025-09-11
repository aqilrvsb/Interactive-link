-- Add missing INSERT policy for users table to allow registration function to work
CREATE POLICY "Allow function to insert users" 
ON public.users 
FOR INSERT 
WITH CHECK (true);

-- Also ensure the register_user function can be called by anyone
GRANT EXECUTE ON FUNCTION public.register_user(text, text, text) TO anon, authenticated;