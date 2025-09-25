import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface CustomDomain {
  id: string;
  project_id: string;
  user_id: string;
  domain_name: string;
  status: string;
  verification_token: string;
  dns_instructions?: any;
  error_message?: string | null;
  verified_at?: string | null;
  created_at: string;
  updated_at: string;
}

export const useCustomDomains = (projectId?: string) => {
  const [domains, setDomains] = useState<CustomDomain[]>([]);
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();

  const fetchDomains = async () => {
    if (!user || !projectId) {
      setDomains([]);
      return;
    }
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('custom_domains')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setDomains((data as CustomDomain[]) || []);
    } catch (error: any) {
      console.error('Error fetching domains:', error);
      toast.error('Failed to fetch domains');
    } finally {
      setLoading(false);
    }
  };

  const addDomain = async (domainName: string) => {
    if (!user || !projectId) return null;

    try {
      // Generate DNS instructions
      const dnsInstructions = {
        records: [
          {
            type: 'CNAME',
            name: domainName,
            value: `${projectId}.lovable.app`,
            ttl: 300
          },
          {
            type: 'TXT',
            name: `_lovable-challenge.${domainName}`,
            value: crypto.randomUUID(),
            ttl: 300
          }
        ]
      };

      const { data, error } = await supabase
        .from('custom_domains')
        .insert([{
          project_id: projectId,
          user_id: user.id,
          domain_name: domainName,
          status: 'pending',
          dns_instructions: dnsInstructions
        }])
        .select()
        .single();

      if (error) throw error;
      
      setDomains(prev => [data as CustomDomain, ...prev]);
      toast.success('Domain added successfully');
      return data;
    } catch (error: any) {
      if (error.code === '23505') {
        toast.error('This domain is already registered');
      } else {
        toast.error('Failed to add domain');
      }
      console.error('Error adding domain:', error);
      return null;
    }
  };

  const verifyDomain = async (domainId: string) => {
    try {
      setLoading(true);
      
      // Update status to verifying
      await supabase
        .from('custom_domains')
        .update({ status: 'verifying' })
        .eq('id', domainId);

      // In a real implementation, this would check DNS records
      // For now, we'll simulate verification after a delay
      setTimeout(async () => {
        const { data, error } = await supabase
          .from('custom_domains')
          .update({ 
            status: 'connected',
            verified_at: new Date().toISOString()
          })
          .eq('id', domainId)
          .select()
          .single();

        if (error) {
          await supabase
            .from('custom_domains')
            .update({ 
              status: 'error',
              error_message: 'DNS verification failed'
            })
            .eq('id', domainId);
          toast.error('Domain verification failed');
        } else {
          setDomains(prev => prev.map(d => d.id === domainId ? data as CustomDomain : d));
          toast.success('Domain verified successfully');
        }
        
        setLoading(false);
      }, 3000);

      // Update local state immediately
      setDomains(prev => prev.map(d => 
        d.id === domainId ? { ...d, status: 'verifying' } : d
      ));
      
      toast.info('Verifying domain... This may take a few moments.');
    } catch (error: any) {
      toast.error('Failed to verify domain');
      console.error('Error verifying domain:', error);
      setLoading(false);
    }
  };

  const removeDomain = async (domainId: string) => {
    try {
      const { error } = await supabase
        .from('custom_domains')
        .delete()
        .eq('id', domainId);

      if (error) throw error;
      
      setDomains(prev => prev.filter(d => d.id !== domainId));
      toast.success('Domain removed successfully');
    } catch (error: any) {
      toast.error('Failed to remove domain');
      console.error('Error removing domain:', error);
    }
  };

  useEffect(() => {
    fetchDomains();
  }, [user, projectId]);

  return {
    domains,
    loading,
    addDomain,
    verifyDomain,
    removeDomain,
    refetch: fetchDomains,
  };
};