import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

export interface ProjectFile {
  id: string;
  title: string;
  content: string;
}

export class FileManager {
  private static getFileName(projectId: string): string {
    return `${projectId}.html`;
  }

  static async createProjectFile(projectId: string, title: string, content: string): Promise<boolean> {
    try {
      const fileName = this.getFileName(projectId);
      
      // Create the HTML content with proper structure
      const htmlContent = this.processHtmlContent(content, title);

      // Store in Supabase storage (create a public bucket for HTML files)
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('project-files')
        .upload(`${projectId}/${fileName}`, new Blob([htmlContent], { type: 'text/html' }), {
          contentType: 'text/html',
          upsert: true, // This will overwrite if exists
          cacheControl: '3600'
        });

      if (uploadError) {
        // Fallback to localStorage if Supabase storage fails
        localStorage.setItem(`project_file_${projectId}`, JSON.stringify({
          id: projectId,
          title,
          content: htmlContent,
          fileName,
          createdAt: new Date().toISOString()
        }));
        
        console.log('Stored in localStorage as fallback');
        return true;
      }

      // Also store metadata in localStorage for quick access
      localStorage.setItem(`project_file_${projectId}`, JSON.stringify({
        id: projectId,
        title,
        content: htmlContent,
        fileName,
        supabaseUrl: uploadData.path,
        createdAt: new Date().toISOString()
      }));
      
      toast.success('Project file created successfully');
      return true;
    } catch (error) {
      console.error('Error creating project file:', error);
      toast.error('Failed to create project file');
      return false;
    }
  }

  static async updateProjectFile(projectId: string, title: string, content: string): Promise<boolean> {
    try {
      // Same as create - it will upsert
      return this.createProjectFile(projectId, title, content);
    } catch (error) {
      console.error('Error updating project file:', error);
      return false;
    }
  }

  static async deleteProjectFile(projectId: string): Promise<boolean> {
    try {
      const fileName = this.getFileName(projectId);
      
      // Delete from Supabase storage
      await supabase.storage
        .from('project-files')
        .remove([`${projectId}/${fileName}`]);

      // Remove from localStorage
      localStorage.removeItem(`project_file_${projectId}`);
      
      return true;
    } catch (error) {
      console.error('Error deleting project file:', error);
      return false;
    }
  }

  static getProjectFile(projectId: string): ProjectFile | null {
    try {
      const data = localStorage.getItem(`project_file_${projectId}`);
      if (!data) return null;
      
      const fileData = JSON.parse(data);
      return {
        id: fileData.id,
        title: fileData.title,
        content: fileData.content
      };
    } catch (error) {
      console.error('Error getting project file:', error);
      return null;
    }
  }

  static async getProjectFileUrl(projectId: string): Promise<string | null> {
    try {
      const fileName = this.getFileName(projectId);
      
      // Get public URL from Supabase storage
      const { data } = supabase.storage
        .from('project-files')
        .getPublicUrl(`${projectId}/${fileName}`);
      
      if (data && data.publicUrl) {
        return data.publicUrl;
      }
      
      // Fallback to creating a data URL from localStorage
      const fileData = this.getProjectFile(projectId);
      if (fileData) {
        // Create a proper HTML file URL
        const blob = new Blob([fileData.content], { type: 'text/html' });
        return URL.createObjectURL(blob);
      }
      
      return null;
    } catch (error) {
      console.error('Error getting project file URL:', error);
      return null;
    }
  }

  static async openPreview(projectId: string): Promise<void> {
    try {
      // First try to get the Supabase public URL
      const url = await this.getProjectFileUrl(projectId);
      
      if (!url) {
        toast.error('No file found for this project. Please save first.');
        return;
      }
      
      // Open in new tab
      const previewWindow = window.open(url, '_blank');
      
      if (previewWindow) {
        toast.success('Preview opened in new tab');
      } else {
        toast.error('Please allow pop-ups to open preview');
      }
    } catch (error) {
      console.error('Error opening preview:', error);
      toast.error('Failed to open preview');
    }
  }

  private static processHtmlContent(content: string, title: string): string {
    // If content is already a complete HTML document, return as-is
    if (content.toLowerCase().includes('<!doctype') || content.toLowerCase().includes('<html')) {
      return content;
    }

    // Otherwise, wrap in basic HTML structure
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title}</title>
    <style>
      body {
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
        margin: 0;
        padding: 20px;
        line-height: 1.6;
      }
    </style>
</head>
<body>
${content}
</body>
</html>`;
  }

  static async downloadFile(projectId: string): Promise<void> {
    const fileData = this.getProjectFile(projectId);
    if (!fileData) {
      toast.error('No file found for this project');
      return;
    }
    
    const fileName = this.getFileName(projectId);
    const blob = new Blob([fileData.content], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast.success(`Downloaded ${fileName}`);
  }

  static listAllProjectFiles(): Array<{id: string, title: string, fileName: string, createdAt: string}> {
    const files = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith('project_file_')) {
        try {
          const data = JSON.parse(localStorage.getItem(key) || '');
          files.push({
            id: data.id,
            title: data.title,
            fileName: data.fileName,
            createdAt: data.createdAt
          });
        } catch (e) {
          console.error('Error parsing file data:', e);
        }
      }
    }
    return files.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }
}