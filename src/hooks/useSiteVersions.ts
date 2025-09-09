import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface SiteVersion {
  id: string;
  project_id: string;
  user_id: string;
  version_number: number;
  html_content: string;
  css_content?: string | null;
  js_content?: string | null;
  assets: any;
  build_timestamp: string;
  is_published: boolean;
  created_at: string;
}

export const useSiteVersions = (projectId?: string) => {
  const [versions, setVersions] = useState<SiteVersion[]>([]);
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();

  const fetchVersions = async () => {
    if (!user || !projectId) {
      setVersions([]);
      return;
    }
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('site_versions')
        .select('*')
        .eq('project_id', projectId)
        .order('version_number', { ascending: false });

      if (error) throw error;
      setVersions((data as SiteVersion[]) || []);
    } catch (error: any) {
      console.error('Error fetching site versions:', error);
      toast.error('Failed to fetch site versions');
    } finally {
      setLoading(false);
    }
  };

  const createVersion = async (versionData: {
    project_id: string;
    html_content: string;
    css_content?: string;
    js_content?: string;
    assets?: any[];
  }) => {
    if (!user) return null;

    try {
      // Get the latest version number
      const { data: latestVersion } = await supabase
        .from('site_versions')
        .select('version_number')
        .eq('project_id', versionData.project_id)
        .order('version_number', { ascending: false })
        .limit(1)
        .single();

      const nextVersionNumber = latestVersion ? latestVersion.version_number + 1 : 1;

      const { data, error } = await supabase
        .from('site_versions')
        .insert([{
          ...versionData,
          user_id: user.id,
          version_number: nextVersionNumber,
          assets: versionData.assets || []
        }])
        .select()
        .single();

      if (error) throw error;
      
      setVersions(prev => [data as SiteVersion, ...prev]);
      toast.success(`Version ${nextVersionNumber} created successfully`);
      return data;
    } catch (error: any) {
      toast.error('Failed to create site version');
      console.error('Error creating site version:', error);
      return null;
    }
  };

  const publishVersion = async (versionId: string) => {
    try {
      // First, unpublish all other versions for this project
      const version = versions.find(v => v.id === versionId);
      if (!version) return false;

      await supabase
        .from('site_versions')
        .update({ is_published: false })
        .eq('project_id', version.project_id);

      // Then publish this version
      const { data, error } = await supabase
        .from('site_versions')
        .update({ is_published: true })
        .eq('id', versionId)
        .select()
        .single();

      if (error) throw error;
      
      setVersions(prev => prev.map(v => ({
        ...v,
        is_published: v.id === versionId
      })));
      
      toast.success('Version published successfully');
      return true;
    } catch (error: any) {
      toast.error('Failed to publish version');
      console.error('Error publishing version:', error);
      return false;
    }
  };

  const deleteVersion = async (versionId: string) => {
    try {
      const { error } = await supabase
        .from('site_versions')
        .delete()
        .eq('id', versionId);

      if (error) throw error;
      
      setVersions(prev => prev.filter(v => v.id !== versionId));
      toast.success('Version deleted successfully');
    } catch (error: any) {
      toast.error('Failed to delete version');
      console.error('Error deleting version:', error);
    }
  };

  useEffect(() => {
    fetchVersions();
  }, [user, projectId]);

  return {
    versions,
    loading,
    createVersion,
    publishVersion,
    deleteVersion,
    refetch: fetchVersions,
  };
};