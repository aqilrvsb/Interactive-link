import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'react-hot-toast';
import { FileManager } from '@/utils/fileManager';

export interface Project {
  id: string;
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

  const fetchProjects = async () => {
    console.log('fetchProjects called, user:', user);
    if (!user) {
      console.log('No user found, setting loading to false');
      setLoading(false);
      return;
    }
    
    try {
      console.log('Attempting to fetch projects for user:', user.id);
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false });

      console.log('Supabase response:', { data, error });
      if (error) throw error;
      setProjects(data || []);
      console.log('Projects set successfully:', data);
    } catch (error: any) {
      console.error('Error fetching projects:', error);
      toast.error('Failed to fetch projects');
    } finally {
      setLoading(false);
      console.log('Loading set to false');
    }
  };

  const createProject = async (projectData: Omit<Project, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => {
    if (!user) return null;

    try {
      const { data, error } = await supabase
        .from('projects')
        .insert([{ ...projectData, user_id: user.id }])
        .select()
        .single();

      if (error) throw error;
      
      // Create HTML file in project directory
      if (projectData.code_content) {
        const fileCreated = await FileManager.createProjectFile(
          data.id,
          projectData.title,
          projectData.code_content
        );
        
        if (fileCreated) {
          console.log(`HTML file created for project: ${data.id}`);
        }
      }
      
      setProjects(prev => [data, ...prev]);
      toast.success('Project and HTML file created successfully');
      return data;
    } catch (error: any) {
      toast.error('Failed to create project');
      console.error('Error creating project:', error);
      return null;
    }
  };

  const updateProject = async (id: string, updates: Partial<Project>) => {
    try {
      const { data, error } = await supabase
        .from('projects')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      
      // Update HTML file if code content changed
      if (updates.code_content) {
        const fileUpdated = await FileManager.updateProjectFile(
          id,
          updates.title || data.title,
          updates.code_content
        );
        
        if (fileUpdated) {
          console.log(`HTML file updated for project: ${id}`);
        }
      }
      
      setProjects(prev => prev.map(p => p.id === id ? data : p));
      toast.success('Project and HTML file updated successfully');
      return data;
    } catch (error: any) {
      toast.error('Failed to update project');
      console.error('Error updating project:', error);
      return null;
    }
  };

  const deleteProject = async (id: string) => {
    try {
      const { error } = await supabase
        .from('projects')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      // Delete HTML file from project directory
      const fileDeleted = await FileManager.deleteProjectFile(id);
      if (fileDeleted) {
        console.log(`HTML file deleted for project: ${id}`);
      }
      
      setProjects(prev => prev.filter(p => p.id !== id));
      toast.success('Project and HTML file deleted successfully');
    } catch (error: any) {
      toast.error('Failed to delete project');
      console.error('Error deleting project:', error);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, [user]);

  return {
    projects,
    loading,
    createProject,
    updateProject,
    deleteProject,
    refetch: fetchProjects,
  };
};