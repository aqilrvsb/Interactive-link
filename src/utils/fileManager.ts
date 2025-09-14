import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

export class FileManager {
  // Simple: Create HTML file from code
  static async createProjectFile(
    projectId: string, 
    title: string, 
    htmlContent: string,
    userId?: string
  ): Promise<boolean> {
    try {
      // Store in localStorage for preview
      localStorage.setItem(`project_file_${projectId}`, JSON.stringify({
        id: projectId,
        title,
        content: htmlContent,
        createdAt: new Date().toISOString()
      }));
      
      return true;
    } catch (error) {
      console.error('Error creating project file:', error);
      return false;
    }
  }

  // Simple: Open preview in new tab
  static async openPreview(projectId: string): Promise<void> {
    try {
      const data = localStorage.getItem(`project_file_${projectId}`);
      if (!data) {
        toast.error('No file found. Please save first.');
        return;
      }
      
      const fileData = JSON.parse(data);
      
      // Create blob URL and open it
      const blob = new Blob([fileData.content], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      
      window.open(url, '_blank');
      toast.success('Preview opened');
      
      // Clean up after 30 seconds
      setTimeout(() => URL.revokeObjectURL(url), 30000);
    } catch (error) {
      console.error('Error opening preview:', error);
      toast.error('Failed to open preview');
    }
  }

  // Get the project file
  static getProjectFile(projectId: string) {
    try {
      const data = localStorage.getItem(`project_file_${projectId}`);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      return null;
    }
  }
}