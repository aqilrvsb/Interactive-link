// Vercel API Integration for domain management
// Note: You need to get a Vercel API token from https://vercel.com/account/tokens

// IMPORTANT: Replace this with your actual Vercel API token
const VERCEL_API_TOKEN = 'O2kfUGzhJatE7y0toxr47l6P';

// Replace with your Live Sites project ID from Vercel dashboard
const LIVE_SITES_PROJECT_ID = 'cepatbina-live-sites';

export interface VercelDomain {
  name: string;
  apexName: string;
  projectId: string;
  redirect?: string;
  redirectStatusCode?: number;
  gitBranch?: string;
  updatedAt: number;
  createdAt: number;
  verified: boolean;
  verification?: any[];
}

// Add a domain to the Vercel project
export const addDomainToVercel = async (domain: string): Promise<{
  success: boolean;
  data?: VercelDomain;
  error?: string;
}> => {
  if (VERCEL_API_TOKEN === 'YOUR_VERCEL_API_TOKEN_HERE') {
    return {
      success: false,
      error: 'Vercel API token not configured. Please add your token in src/utils/vercelApi.ts'
    };
  }

  try {
    const response = await fetch(
      `https://api.vercel.com/v10/projects/${LIVE_SITES_PROJECT_ID}/domains`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${VERCEL_API_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: domain,
        }),
      }
    );

    if (!response.ok) {
      const error = await response.json();
      console.error('Vercel API error:', error);
      
      // Handle specific errors
      if (error.error?.code === 'domain_taken') {
        return { success: false, error: 'Domain is already registered with Vercel' };
      }
      if (error.error?.code === 'forbidden') {
        return { success: false, error: 'Invalid API token or insufficient permissions' };
      }
      
      return { success: false, error: error.error?.message || 'Failed to add domain to Vercel' };
    }

    const data = await response.json();
    return { success: true, data };
  } catch (error) {
    console.error('Error adding domain to Vercel:', error);
    return {
      success: false,
      error: 'Network error. Please try again.'
    };
  }
};

// Remove a domain from Vercel
export const removeDomainFromVercel = async (domain: string): Promise<{
  success: boolean;
  error?: string;
}> => {
  if (VERCEL_API_TOKEN === 'YOUR_VERCEL_API_TOKEN_HERE') {
    return {
      success: false,
      error: 'Vercel API token not configured'
    };
  }

  try {
    const response = await fetch(
      `https://api.vercel.com/v9/projects/${LIVE_SITES_PROJECT_ID}/domains/${domain}`,
      {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${VERCEL_API_TOKEN}`,
        },
      }
    );

    if (!response.ok) {
      const error = await response.json();
      return { success: false, error: error.error?.message || 'Failed to remove domain' };
    }

    return { success: true };
  } catch (error) {
    console.error('Error removing domain from Vercel:', error);
    return {
      success: false,
      error: 'Network error. Please try again.'
    };
  }
};

// Check domain verification status
export const checkDomainStatus = async (domain: string): Promise<{
  verified: boolean;
  error?: string;
}> => {
  if (VERCEL_API_TOKEN === 'YOUR_VERCEL_API_TOKEN_HERE') {
    return {
      verified: false,
      error: 'Vercel API token not configured'
    };
  }

  try {
    const response = await fetch(
      `https://api.vercel.com/v9/projects/${LIVE_SITES_PROJECT_ID}/domains/${domain}`,
      {
        headers: {
          'Authorization': `Bearer ${VERCEL_API_TOKEN}`,
        },
      }
    );

    if (!response.ok) {
      return { verified: false, error: 'Domain not found' };
    }

    const data = await response.json();
    return { verified: data.verified };
  } catch (error) {
    console.error('Error checking domain status:', error);
    return {
      verified: false,
      error: 'Failed to check domain status'
    };
  }
};

// List all domains in the project
export const listVercelDomains = async (): Promise<{
  success: boolean;
  domains?: VercelDomain[];
  error?: string;
}> => {
  if (VERCEL_API_TOKEN === 'YOUR_VERCEL_API_TOKEN_HERE') {
    return {
      success: false,
      error: 'Vercel API token not configured'
    };
  }

  try {
    const response = await fetch(
      `https://api.vercel.com/v9/projects/${LIVE_SITES_PROJECT_ID}/domains`,
      {
        headers: {
          'Authorization': `Bearer ${VERCEL_API_TOKEN}`,
        },
      }
    );

    if (!response.ok) {
      const error = await response.json();
      return { success: false, error: error.error?.message };
    }

    const data = await response.json();
    return { success: true, domains: data.domains };
  } catch (error) {
    console.error('Error listing domains:', error);
    return {
      success: false,
      error: 'Failed to list domains'
    };
  }
};