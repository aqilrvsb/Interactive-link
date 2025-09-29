import { supabase } from '@/integrations/supabase/client';

/**
 * Get user information including usernames for community display
 */
export const getUsersInfo = async (userIds: string[]): Promise<Record<string, string>> => {
  const userInfo: Record<string, string> = {};
  
  if (userIds.length === 0) return userInfo;
  
  try {
    // Get usernames from profiles table
    const { data: profiles, error } = await supabase
      .from('profiles')
      .select('user_id, username, full_name')
      .in('user_id', userIds);
    
    if (error) {
      console.error('Error fetching profiles:', error);
    }
    
    // Process profiles
    if (profiles && profiles.length > 0) {
      profiles.forEach(profile => {
        // Use username if available, otherwise use full_name, otherwise use anonymous
        const displayName = profile.username || profile.full_name || `User-${profile.user_id.slice(0, 8)}`;
        userInfo[profile.user_id] = displayName;
      });
    }
    
    // For users without profiles, create anonymous names
    userIds.forEach(userId => {
      if (!userInfo[userId]) {
        // Create a consistent anonymous name for users without profiles
        userInfo[userId] = `Anonymous`;
      }
    });
    
  } catch (error) {
    console.error('Error fetching user info:', error);
    
    // Ultimate fallback - use anonymous for all
    userIds.forEach(userId => {
      userInfo[userId] = `Anonymous`;
    });
  }
  
  return userInfo;
};
