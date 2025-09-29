import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'react-hot-toast';
import { FileManager } from '@/utils/fileManager';

export interface Project {
  id: number;  // Changed from string to number
  user_id: string;
  title: string;
  description?: string;
  code_content?: string;
  language: string;
  ai_model?: string;
  prompt?: string;
  is_public: boolean;
  created_at: string;
  updated_at: string;
}

export const useProjects = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const fetchTimeoutRef = useRef<NodeJS.Timeout>();
  const lastFetchRef = useRef<string>('');

  const fetchProjects = async () => {
    try {
      // Get user ID from multiple sources
      let userId = user?.id;
      
      if (!userId) {
        // Try to get from Supabase auth directly
        const { data: { user: authUser } } = await supabase.auth.getUser();
        userId = authUser?.id;
      }
      
      if (!userId) {
        // Try from localStorage as last resort
        const storedUser = localStorage.getItem('auth_user');
        if (storedUser) {
          try {
            const parsed = JSON.parse(storedUser);
            userId = parsed.id;
          } catch (e) {
            console.error('Failed to parse stored user');
          }
        }
      }
      
      if (!userId) {
        console.log('No user ID found after all attempts');
        setProjects([]);
        setLoading(false);
        return;
      }

      // Prevent duplicate fetches
      if (lastFetchRef.current === userId) {
        console.log('Already fetched for this user, skipping');
        setLoading(false);
        return;
      }
      
      lastFetchRef.current = userId;
      console.log('Fetching projects for user:', userId);
      
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('user_id', userId)
        .order('updated_at', { ascending: false });

      if (error) {
        console.error('Supabase error:', error);
        // Don't throw, just log and set empty
        setProjects([]);
      } else {
        setProjects(data || []);
        console.log('Projects loaded:', data?.length || 0);
      }
    } catch (error: any) {
      console.error('Error fetching projects:', error);
      setProjects([]);
    } finally {
      setLoading(false);
    }
  };

  const createProject = async (projectData: Omit<Project, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => {
    let userId = user?.id;
    
    if (!userId) {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      userId = authUser?.id;
    }
    
    if (!userId) {
      toast.error('Please log in to create projects');
      return null;
    }

    try {
      const { data, error } = await supabase
        .from('projects')
        .insert([{ ...projectData, user_id: userId }])
        .select()
        .single();

      if (error) throw error;
      
      // Create HTML file in project directory
      if (projectData.code_content) {
        const fileCreated = await FileManager.createProjectFile(
          data.id,
          projectData.title,
          projectData.code_content,
          userId
        );
        
        if (fileCreated) {
          console.log(`HTML file created for project: ${data.id}`);
        }
      }
      
      setProjects(prev => [data, ...prev]);
      toast.success('Project created successfully');
      return data;
    } catch (error: any) {
      toast.error(`Failed to create project: ${error.message}`);
      console.error('Error creating project:', error);
      return null;
    }
  };

  const updateProject = async (id: number, updates: Partial<Omit<Project, 'id' | 'user_id' | 'created_at'>>) => {
    try {
      const { data, error } = await supabase
        .from('projects')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      
      // Update HTML file if code content changed
      if (updates.code_content && data) {
        let userId = user?.id;
        if (!userId) {
          const { data: { user: authUser } } = await supabase.auth.getUser();
          userId = authUser?.id;
        }
        
        if (userId) {
          const fileUpdated = await FileManager.updateProjectFile(
            id,
            data.title,
            updates.code_content,
            userId
          );
          
          if (fileUpdated) {
            console.log(`HTML file updated for project: ${id}`);
          }
        }
      }
      
      setProjects(prev => prev.map(p => p.id === id ? data : p));
      toast.success('Project updated successfully');
      return data;
    } catch (error: any) {
      toast.error(`Failed to update project: ${error.message}`);
      console.error('Error updating project:', error);
      return null;
    }
  };

  const deleteProject = async (id: number) => {
    try {
      const { error } = await supabase
        .from('projects')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      // Delete HTML file from project directory
      let userId = user?.id;
      if (!userId) {
        const { data: { user: authUser } } = await supabase.auth.getUser();
        userId = authUser?.id;
      }
      
      if (userId) {
        const fileDeleted = await FileManager.deleteProjectFile(id, userId);
        if (fileDeleted) {
          console.log(`HTML file deleted for project: ${id}`);
        }
      }
      
      setProjects(prev => prev.filter(p => p.id !== id));
      toast.success('Project deleted successfully');
    } catch (error: any) {
      toast.error('Failed to delete project');
      console.error('Error deleting project:', error);
    }
  };

  useEffect(() => {
    // Clear any existing timeout
    if (fetchTimeoutRef.current) {
      clearTimeout(fetchTimeoutRef.current);
    }

    // Debounce the fetch to avoid rapid consecutive calls
    fetchTimeoutRef.current = setTimeout(() => {
      fetchProjects();
    }, 100);

    // Cleanup
    return () => {
      if (fetchTimeoutRef.current) {
        clearTimeout(fetchTimeoutRef.current);
      }
    };
  }, [user?.id]);

  // Also fetch on mount regardless of user state
  useEffect(() => {
    // Give auth time to initialize, then fetch
    const timer = setTimeout(() => {
      fetchProjects();
    }, 500);

    return () => clearTimeout(timer);
  }, []);

  return {
    projects,
    loading,
    createProject,
    updateProject,
    deleteProject,
    refetch: fetchProjects
  };
};