// Utility functions for user management

/**
 * Cleans email by removing domain part
 * Example: "abc@interactive-link.app" -> "abc"
 */
export const cleanEmailForDisplay = (email: string | null | undefined): string => {
  if (!email) return 'Anonymous';
  
  // If it contains @, take only the part before @
  if (email.includes('@')) {
    return email.split('@')[0];
  }
  
  return email;
};

/**
 * Get display name from user data
 */
export const getUserDisplayName = (userData: {
  username?: string;
  full_name?: string;
  email?: string;
  user_id?: string;
}): string => {
  // Priority: username > full_name > cleaned email > anonymous
  if (userData.username) {
    return cleanEmailForDisplay(userData.username);
  }
  
  if (userData.full_name) {
    return cleanEmailForDisplay(userData.full_name);
  }
  
  if (userData.email) {
    return cleanEmailForDisplay(userData.email);
  }
  
  if (userData.user_id) {
    return `User-${userData.user_id.slice(0, 8)}`;
  }
  
  return 'Anonymous';
};
