import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface UserSettings {
  id: string;
  user_id: string;
  custom_supabase_url?: string;
  custom_supabase_key?: string;
  created_at: string;
  updated_at: string;
}

export const useUserSettings = () => {
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  const fetchSettings = async () => {
    if (!user) {
      setSettings(null);
      setLoading(false);
      return;
    }
    
    try {
      const { data, error } = await supabase
        .from('user_settings')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) throw error;
      setSettings(data);
    } catch (error: any) {
      console.error('Error fetching user settings:', error);
      toast.error('Failed to fetch settings');
    } finally {
      setLoading(false);
    }
  };

  const updateSettings = async (updates: {
    custom_supabase_url?: string;
    custom_supabase_key?: string;
  }) => {
    if (!user) return null;

    try {
      const { data, error } = await supabase
        .from('user_settings')
        .upsert({
          user_id: user.id,
          ...updates,
        })
        .select()
        .single();

      if (error) throw error;
      
      setSettings(data);
      toast.success('Settings updated successfully');
      return data;
    } catch (error: any) {
      toast.error('Failed to update settings');
      console.error('Error updating settings:', error);
      return null;
    }
  };

  const hasCustomSupabase = () => {
    return !!(settings?.custom_supabase_url && settings?.custom_supabase_key);
  };

  useEffect(() => {
    fetchSettings();
  }, [user]);

  return {
    settings,
    loading,
    updateSettings,
    hasCustomSupabase,
    refetch: fetchSettings,
  };
};