import { supabase } from '@/integrations/supabase/client';
import { cleanEmailForDisplay } from './userUtils';

/**
 * Get user information including emails for community display
 */
export const getUsersInfo = async (userIds: string[]): Promise<Record<string, string>> => {
  const userInfo: Record<string, string> = {};
  
  if (userIds.length === 0) return userInfo;
  
  try {
    // Try to get from profiles first
    const { data: profiles } = await supabase
      .from('profiles')
      .select('user_id, username, full_name')
      .in('user_id', userIds);
    
    // Process profiles
    if (profiles) {
      profiles.forEach(profile => {
        const displayName = profile.username || profile.full_name;
        userInfo[profile.user_id] = cleanEmailForDisplay(displayName);
      });
    }
    
    // For users without profiles, we'll need to use a different approach
    // Since we can't directly access auth.users, let's use RPC function
    try {
      const { data: authData } = await supabase.rpc('get_user_emails', {
        user_ids: userIds
      });
      
      if (authData) {
        authData.forEach((user: any) => {
          if (!userInfo[user.id]) {
            userInfo[user.id] = cleanEmailForDisplay(user.email);
          }
        });
      }
    } catch (rpcError) {
      console.log('RPC not available, using fallback method');
      
      // Fallback: For users not in profiles, create anonymous names
      userIds.forEach(userId => {
        if (!userInfo[userId]) {
          userInfo[userId] = `User-${userId.slice(0, 8)}`;
        }
      });
    }
    
  } catch (error) {
    console.error('Error fetching user info:', error);
    
    // Ultimate fallback
    userIds.forEach(userId => {
      userInfo[userId] = `User-${userId.slice(0, 8)}`;
    });
  }
  
  return userInfo;
};
