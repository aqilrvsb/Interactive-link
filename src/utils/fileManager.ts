import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

export interface ProjectFile {
  id: string;
  title: string;
  content: string;
  slug?: string;
}

export class FileManager {
  // Generate unique filename using user_id and project_id to avoid conflicts
  private static getFileName(projectId: string, userId?: string, slug?: string): string {
    // If slug is provided, use it for user-friendly URLs
    if (slug) {
      // Sanitize slug to be URL-safe
      const safeSlug = slug.toLowerCase()
        .replace(/[^a-z0-9-]/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '');
      return `${safeSlug}.html`;
    }
    
    // Fallback to unique ID-based naming for guaranteed uniqueness
    if (userId) {
      return `${userId}_${projectId}.html`;
    }
    return `${projectId}.html`;
  }

  // Generate a slug from project title
  static generateSlug(title: string, projectId: string): string {
    const baseSlug = title.toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
    
    // Add first 8 chars of project ID to ensure uniqueness
    const shortId = projectId.substring(0, 8);
    return `${baseSlug}-${shortId}`;
  }

  static async createProjectFile(
    projectId: string, 
    title: string, 
    content: string,
    userId?: string
  ): Promise<boolean> {
    try {
      // Generate a unique slug for this project
      const slug = this.generateSlug(title, projectId);
      const fileName = this.getFileName(projectId, userId, slug);
      
      // Create the HTML content with proper structure
      const htmlContent = this.processHtmlContent(content, title);

      // Store in Supabase storage with user-specific path for organization
      const storagePath = userId 
        ? `users/${userId}/projects/${fileName}`
        : `projects/${fileName}`;

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
          fileName,
          slug,
          userId,
          createdAt: new Date().toISOString()
        }));
        
        console.log('Stored in localStorage as fallback');
        return true;
      }

      // Store metadata including slug for URL generation
      localStorage.setItem(`project_file_${projectId}`, JSON.stringify({
        id: projectId,
        title,
        content: htmlContent,
        fileName,
        slug,
        userId,
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
      // Get existing file data to check if we need to rename
      const existingData = localStorage.getItem(`project_file_${projectId}`);
      let oldStoragePath: string | null = null;
      
      if (existingData) {
        const parsed = JSON.parse(existingData);
        oldStoragePath = parsed.storagePath;
        
        // If title changed, we need to update the slug and filename
        if (parsed.title !== title && oldStoragePath) {
          // Delete old file
          await supabase.storage
            .from('project-files')
            .remove([oldStoragePath]);
        }
      }
      
      // Create/update with new filename
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
      // This will handle renaming by creating new file and deleting old
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
        slug: fileData.slug
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

  // Get user-friendly URL with slug
  static getProjectSlugUrl(projectId: string): string | null {
    try {
      const data = localStorage.getItem(`project_file_${projectId}`);
      if (!data) return null;
      
      const fileData = JSON.parse(data);
      if (fileData.slug) {
        // Return a user-friendly URL path
        return `/preview/${fileData.slug}`;
      }
      
      return `/preview/${projectId}`;
    } catch (error) {
      console.error('Error getting project slug URL:', error);
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
    
    const data = localStorage.getItem(`project_file_${projectId}`);
    const parsed = data ? JSON.parse(data) : null;
    const fileName = parsed?.fileName || `${projectId}.html`;
    
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
    createdAt: string
  }> {
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
            slug: data.slug,
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