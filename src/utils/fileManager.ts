import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

export class FileManager {
  // Direct save to Supabase Storage ONLY (no database)
  static async createProjectFile(
    projectId: string, 
    title: string, 
    htmlContent: string,
    userId?: string,
    sequentialId?: number | null
  ): Promise<boolean> {
    try {
      // Ensure we have a valid project ID
      if (!projectId || projectId === 'test-project') {
        console.warn('Invalid project ID for file creation');
        return false;
      }

      // Create the file path - use sequential ID if available
      const fileName = sequentialId 
        ? `${sequentialId}/index.html`
        : `${projectId}/index.html`;

      // Convert HTML string to Blob with proper MIME type
      const htmlBlob = new Blob([htmlContent], { 
        type: 'text/html; charset=utf-8' 
      });

      // Upload directly to Supabase Storage (this is our ONLY storage)
      const { error: uploadError } = await supabase.storage
        .from('websites')
        .upload(fileName, htmlBlob, {
          upsert: true, // This will create new or update existing
          contentType: 'text/html; charset=utf-8',
          cacheControl: '3600'
        });

      if (uploadError) {
        console.error('Storage upload error:', uploadError);
        
        // Check if bucket exists
        if (uploadError.message?.includes('not found')) {
          // Try to create the bucket
          const { error: createError } = await supabase.storage.createBucket('websites', {
            public: true,
            fileSizeLimit: 10485760, // 10MB
            allowedMimeTypes: ['text/html', 'text/css', 'text/javascript', 'application/javascript']
          });
          
          if (createError && !createError.message?.includes('already exists')) {
            console.error('Failed to create storage bucket:', createError);
            return false;
          }
          
          // Retry upload after creating bucket with Blob
          const { error: retryError } = await supabase.storage
            .from('websites')
            .upload(fileName, htmlBlob, {
              upsert: true,
              contentType: 'text/html; charset=utf-8',
              cacheControl: '3600'
            });
            
          if (retryError) {
            console.error('Retry upload failed:', retryError);
            return false;
          }
        } else {
          return false;
        }
      }

      // Store the file info in localStorage for quick access
      const publicUrl = supabase.storage
        .from('websites')
        .getPublicUrl(fileName).data.publicUrl;
      
      localStorage.setItem(`project_file_${projectId}`, JSON.stringify({
        id: projectId,
        title,
        fileName,
        publicUrl,
        lastModified: new Date().toISOString()
      }));
      
      console.log('File saved successfully to storage:', publicUrl);
      return true;
    } catch (error) {
      console.error('Error creating project file:', error);
      return false;
    }
  }

  // Load HTML content directly from Supabase Storage for editing
  static async loadProjectFile(projectId: string, sequentialId?: number | null): Promise<string | null> {
    try {
      // Determine file path
      const fileName = sequentialId 
        ? `${sequentialId}/index.html`
        : `${projectId}/index.html`;

      // Download the file from storage
      const { data, error } = await supabase.storage
        .from('websites')
        .download(fileName);

      if (error) {
        console.error('Error loading file from storage:', error);
        return null;
      }

      // Convert blob to text
      const htmlContent = await data.text();
      return htmlContent;
    } catch (error) {
      console.error('Error loading project file:', error);
      return null;
    }
  }

  // Check if file exists in storage
  static async fileExists(projectId: string, sequentialId?: number | null): Promise<boolean> {
    try {
      const fileName = sequentialId 
        ? `${sequentialId}/index.html`
        : `${projectId}/index.html`;

      const { data, error } = await supabase.storage
        .from('websites')
        .list(sequentialId ? sequentialId.toString() : projectId, {
          limit: 1,
          search: 'index.html'
        });

      return !error && data && data.length > 0;
    } catch (error) {
      console.error('Error checking file existence:', error);
      return false;
    }
  }

  // Open preview using the Supabase Storage public URL
  static async openPreview(projectId: string): Promise<void> {
    try {
      // First try to get from localStorage
      const storedData = localStorage.getItem(`project_file_${projectId}`);
      
      if (storedData) {
        const fileData = JSON.parse(storedData);
        if (fileData.publicUrl) {
          window.open(fileData.publicUrl, '_blank');
          toast.success('Preview opened');
          return;
        }
      }
      
      // If not in localStorage, try to get from Supabase directly
      // First check with project ID
      let fileName = `${projectId}/index.html`;
      let { data: publicUrlData } = supabase.storage
        .from('websites')
        .getPublicUrl(fileName);
      
      if (publicUrlData?.publicUrl) {
        // Check if file actually exists
        const response = await fetch(publicUrlData.publicUrl, { method: 'HEAD' });
        if (response.ok) {
          window.open(publicUrlData.publicUrl, '_blank');
          toast.success('Preview opened');
          return;
        }
      }
      
      // If not found, try to get user's sequential ID and use that path
      const { data: userData } = await supabase.auth.getUser();
      if (userData?.user?.id) {
        const { data: seqData } = await supabase
          .from('user_sequences')
          .select('sequential_id')
          .eq('user_id', userData.user.id)
          .single();
        
        if (seqData?.sequential_id) {
          fileName = `${seqData.sequential_id}/index.html`;
          const { data: seqUrlData } = supabase.storage
            .from('websites')
            .getPublicUrl(fileName);
          
          if (seqUrlData?.publicUrl) {
            window.open(seqUrlData.publicUrl, '_blank');
            toast.success('Preview opened');
            return;
          }
        }
      }
      
      toast.error('No preview available. Please save the project first.');
    } catch (error) {
      console.error('Error opening preview:', error);
      toast.error('Failed to open preview');
    }
  }

  // Delete project file from storage
  static async deleteProjectFile(projectId: string, sequentialId?: number | null): Promise<boolean> {
    try {
      const fileName = sequentialId 
        ? `${sequentialId}/index.html`
        : `${projectId}/index.html`;

      const { error } = await supabase.storage
        .from('websites')
        .remove([fileName]);

      if (error) {
        console.error('Error deleting file:', error);
        return false;
      }

      // Remove from localStorage
      localStorage.removeItem(`project_file_${projectId}`);
      
      return true;
    } catch (error) {
      console.error('Error deleting project file:', error);
      return false;
    }
  }

  // Get the project file info
  static getProjectFile(projectId: string) {
    try {
      const data = localStorage.getItem(`project_file_${projectId}`);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      return null;
    }
  }

  // Get friendly URL for display
  static getProjectFriendlyUrl(projectId: string): string | null {
    const fileData = this.getProjectFile(projectId);
    return fileData?.publicUrl || null;
  }

  // Alias for compatibility
  static updateProjectFile = FileManager.createProjectFile;
}