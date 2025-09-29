// DNS Verification utility functions
export const checkDNS = async (domain: string): Promise<{
  isValid: boolean;
  records: any[];
  error?: string;
}> => {
  try {
    // Use a public DNS lookup API
    const response = await fetch(`https://dns.google/resolve?name=${domain}&type=A`);
    const data = await response.json();
    
    // Check if A records point to Vercel
    const vercelIPs = ['76.76.21.21', '76.76.21.61'];
    const hasVercelIP = data.Answer?.some((record: any) => 
      vercelIPs.includes(record.data)
    );
    
    // Also check CNAME for www
    if (domain.startsWith('www.')) {
      const cnameResponse = await fetch(`https://dns.google/resolve?name=${domain}&type=CNAME`);
      const cnameData = await cnameResponse.json();
      const hasVercelCNAME = cnameData.Answer?.some((record: any) =>
        record.data?.includes('vercel') || record.data?.includes('cname.vercel-dns.com')
      );
      
      return {
        isValid: hasVercelCNAME || hasVercelIP,
        records: [...(data.Answer || []), ...(cnameData.Answer || [])]
      };
    }
    
    return {
      isValid: hasVercelIP,
      records: data.Answer || []
    };
  } catch (error) {
    console.error('DNS check error:', error);
    return {
      isValid: false,
      records: [],
      error: 'Failed to check DNS records'
    };
  }
};

export const verifyDomain = async (domain: string): Promise<boolean> => {
  const { isValid } = await checkDNS(domain);
  return isValid;
};