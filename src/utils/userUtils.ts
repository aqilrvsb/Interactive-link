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
/**
 * Simple utility to format time ago without external dependencies
 */
export const formatTimeAgo = (date: string | Date): string => {
  const now = new Date();
  const targetDate = new Date(date);
  const diffInMs = now.getTime() - targetDate.getTime();
  
  const seconds = Math.floor(diffInMs / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  const weeks = Math.floor(days / 7);
  const months = Math.floor(days / 30);
  const years = Math.floor(days / 365);
  
  if (years > 0) {
    return `${years} year${years !== 1 ? 's' : ''} ago`;
  } else if (months > 0) {
    return `${months} month${months !== 1 ? 's' : ''} ago`;
  } else if (weeks > 0) {
    return `${weeks} week${weeks !== 1 ? 's' : ''} ago`;
  } else if (days > 0) {
    return `${days} day${days !== 1 ? 's' : ''} ago`;
  } else if (hours > 0) {
    return `${hours} hour${hours !== 1 ? 's' : ''} ago`;
  } else if (minutes > 0) {
    return `${minutes} minute${minutes !== 1 ? 's' : ''} ago`;
  } else {
    return 'Just now';
  }
};
