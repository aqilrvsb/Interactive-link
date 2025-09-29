-- Check if projects exist and are public
SELECT id, title, is_public, is_community_visible, user_id 
FROM projects 
WHERE is_public = true;

-- Check RLS policies on projects table
SELECT * FROM pg_policies WHERE tablename = 'projects';

-- Make sure projects are readable by everyone when public
CREATE POLICY "Public projects are viewable by everyone" 
ON projects FOR SELECT 
USING (is_public = true);

-- Also check if profiles table has proper RLS
CREATE POLICY "Profiles are viewable by everyone" 
ON profiles FOR SELECT 
USING (true);