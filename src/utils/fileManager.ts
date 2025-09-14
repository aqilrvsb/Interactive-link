import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

export interface ProjectFile {
  id: string;
  title: string;
  content: string;
  slug?: string;
  userSequentialId?: number;
}

export class FileManager {
  // Get sequential user ID from database
  static async getUserSequentialId(userId: string): Promise<number | null> {
    try {
      const { data, error } = await supabase
        .from('user_sequences')
        .select('sequential_id')
        .eq('user_id', userId)
        .single();
      
      if (error) {
        console.error('Error getting sequential ID:', error);
        return null;
      }
      
      return data?.sequential_id || null;
    } catch (error) {
      console.error('Error fetching sequential ID:', error);
      return null;
    }
  }

  // Generate filename for storage (internal use)
  private static getStorageFileName(projectId: string, userId?: string): string {
    // Internal storage uses full IDs for uniqueness
    if (userId) {
      return `${userId}_${projectId}.html`;
    }
    return `${projectId}.html`;
  }

  // Generate a clean slug from project title
  static generateSlug(title: string): string {
    return title.toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
  }

  static async createProjectFile(
    projectId: string, 
    title: string, 
    content: string,
    userId?: string
  ): Promise<boolean> {
    try {
      // Get user's sequential ID for URL generation
      let userSequentialId: number | null = null;
      if (userId) {
        userSequentialId = await this.getUserSequentialId(userId);
      }

      // Generate a clean slug for the URL
      const slug = this.generateSlug(title);
      const storageFileName = this.getStorageFileName(projectId, userId);
      
      // Create the HTML content with proper structure
      const htmlContent = this.processHtmlContent(content, title);

      // Store in Supabase storage with user-specific path
      const storagePath = userId 
        ? `users/${userId}/projects/${storageFileName}`
        : `projects/${storageFileName}`;

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('project-files')
        .upload(storagePath, new Blob([htmlContent], { type: 'text/html' }), {
          contentType: 'text/html',
          upsert: true,
          cacheControl: '3600'
        });

      if (uploadError) {
        console.error('Storage upload error:', uploadError);
        // Fallback to localStorage
        localStorage.setItem(`project_file_${projectId}`, JSON.stringify({
          id: projectId,
          title,
          content: htmlContent,
          fileName: storageFileName,
          slug,
          userId,
          userSequentialId,
          createdAt: new Date().toISOString()
        }));
        
        console.log('Stored in localStorage as fallback');
        return true;
      }

      // Store metadata including sequential ID and slug
      localStorage.setItem(`project_file_${projectId}`, JSON.stringify({
        id: projectId,
        title,
        content: htmlContent,
        fileName: storageFileName,
        slug,
        userId,
        userSequentialId,
        storagePath,
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

  static async updateProjectFile(
    projectId: string, 
    title: string, 
    content: string,
    userId?: string
  ): Promise<boolean> {
    try {
      // Get existing file data to check if we need to update storage
      const existingData = localStorage.getItem(`project_file_${projectId}`);
      let oldStoragePath: string | null = null;
      
      if (existingData) {
        const parsed = JSON.parse(existingData);
        oldStoragePath = parsed.storagePath;
        
        // If title changed, we need to update the slug but keep the same storage file
        if (parsed.title !== title && oldStoragePath) {
          // Just update the metadata, no need to move the file
          // The URL will change but the storage location remains the same
        }
      }
      
      // Create/update with potentially new slug
      return this.createProjectFile(projectId, title, content, userId);
    } catch (error) {
      console.error('Error updating project file:', error);
      return false;
    }
  }

  static async renameProject(
    projectId: string,
    oldTitle: string,
    newTitle: string,
    content: string,
    userId?: string
  ): Promise<boolean> {
    try {
      // Update the project with new title (which updates the slug for URL)
      return this.updateProjectFile(projectId, newTitle, content, userId);
    } catch (error) {
      console.error('Error renaming project:', error);
      toast.error('Failed to rename project');
      return false;
    }
  }

  static async deleteProjectFile(projectId: string, userId?: string): Promise<boolean> {
    try {
      const existingData = localStorage.getItem(`project_file_${projectId}`);
      
      if (existingData) {
        const fileData = JSON.parse(existingData);
        
        // Delete from Supabase storage
        if (fileData.storagePath) {
          const { error } = await supabase.storage
            .from('project-files')
            .remove([fileData.storagePath]);
          
          if (error) {
            console.error('Error deleting from storage:', error);
          }
        }
      }

      // Remove from localStorage
      localStorage.removeItem(`project_file_${projectId}`);
      
      toast.success('Project file deleted');
      return true;
    } catch (error) {
      console.error('Error deleting project file:', error);
      toast.error('Failed to delete project file');
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
        content: fileData.content,
        slug: fileData.slug,
        userSequentialId: fileData.userSequentialId
      };
    } catch (error) {
      console.error('Error getting project file:', error);
      return null;
    }
  }

  static async getProjectFileUrl(projectId: string): Promise<string | null> {
    try {
      const data = localStorage.getItem(`project_file_${projectId}`);
      
      if (!data) return null;
      
      const fileData = JSON.parse(data);
      
      // Try to get public URL from Supabase storage
      if (fileData.storagePath) {
        const { data: urlData } = supabase.storage
          .from('project-files')
          .getPublicUrl(fileData.storagePath);
        
        if (urlData && urlData.publicUrl) {
          return urlData.publicUrl;
        }
      }
      
      // Fallback to creating a data URL from localStorage
      if (fileData.content) {
        const blob = new Blob([fileData.content], { type: 'text/html' });
        return URL.createObjectURL(blob);
      }
      
      return null;
    } catch (error) {
      console.error('Error getting project file URL:', error);
      return null;
    }
  }

  // Get user-friendly URL in format: /user_sequential_id/preview/project-slug
  static getProjectFriendlyUrl(projectId: string): string | null {
    try {
      const data = localStorage.getItem(`project_file_${projectId}`);
      if (!data) return null;
      
      const fileData = JSON.parse(data);
      
      // Use sequential ID if available, otherwise use first 8 chars of project ID
      const userIdentifier = fileData.userSequentialId || projectId.substring(0, 8);
      const slug = fileData.slug || 'project';
      
      // Return URL in format: /sequential_id/preview/project-name
      return `/${userIdentifier}/preview/${slug}`;
    } catch (error) {
      console.error('Error getting project friendly URL:', error);
      return null;
    }
  }

  static async openPreview(projectId: string): Promise<void> {
    try {
      const url = await this.getProjectFileUrl(projectId);
      
      if (!url) {
        toast.error('No file found for this project. Please save first.');
        return;
      }
      
      // Get the friendly URL for display
      const friendlyUrl = this.getProjectFriendlyUrl(projectId);
      if (friendlyUrl) {
        // In production, this would open the friendly URL
        // For now, we'll show it to the user
        console.log('Friendly URL:', window.location.origin + friendlyUrl);
      }
      
      // Open the actual file URL in new tab
      const previewWindow = window.open(url, '_blank');
      
      if (previewWindow) {
        toast.success(`Preview opened! URL: ${friendlyUrl || url}`);
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
    
    const data = localStorage.getItem(`project_file_${projectId}`);
    const parsed = data ? JSON.parse(data) : null;
    const fileName = parsed?.slug ? `${parsed.slug}.html` : `${projectId}.html`;
    
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

  static listAllProjectFiles(): Array<{
    id: string, 
    title: string, 
    fileName: string, 
    slug?: string,
    userSequentialId?: number,
    friendlyUrl?: string,
    createdAt: string
  }> {
    const files = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith('project_file_')) {
        try {
          const data = JSON.parse(localStorage.getItem(key) || '');
          const userIdentifier = data.userSequentialId || data.id.substring(0, 8);
          files.push({
            id: data.id,
            title: data.title,
            fileName: data.fileName,
            slug: data.slug,
            userSequentialId: data.userSequentialId,
            friendlyUrl: `/${userIdentifier}/preview/${data.slug || 'project'}`,
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