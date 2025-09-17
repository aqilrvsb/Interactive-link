import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

export class FileManager {
  // Save HTML to Supabase Storage with proper content type for rendering
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

      // ALWAYS DELETE OLD FILE FIRST (if it exists)
      try {
        console.log('Attempting to delete old file:', fileName);
        const { error: deleteError } = await supabase.storage
          .from('websites')
          .remove([fileName]);
        
        if (deleteError) {
          console.log('Delete error (file might not exist):', deleteError.message);
        } else {
          console.log('Old file deleted successfully');
        }
      } catch (err) {
        // Ignore delete errors - file might not exist
        console.log('Delete skipped:', err);
      }

      // Small delay to ensure delete completes
      await new Promise(resolve => setTimeout(resolve, 100));

      // NOW CREATE NEW FILE - Upload as plain text with HTML content type
      console.log('Uploading new file:', fileName);
      const { error: uploadError } = await supabase.storage
        .from('websites')
        .upload(fileName, htmlContent, {
          contentType: 'text/html; charset=utf-8',
          cacheControl: 'no-cache, no-store, must-revalidate',
          upsert: false // False because we already deleted
        });

      if (uploadError) {
        console.error('Storage upload error:', uploadError);
        
        // Check if bucket doesn't exist
        if (uploadError.message?.includes('not found')) {
          // Try to create the bucket
          console.log('Creating websites bucket...');
          const { error: createError } = await supabase.storage.createBucket('websites', {
            public: true,
            fileSizeLimit: 10485760, // 10MB
            allowedMimeTypes: ['text/html', 'text/css', 'text/javascript', 'application/javascript']
          });
          
          if (createError && !createError.message?.includes('already exists')) {
            console.error('Failed to create storage bucket:', createError);
            return false;
          }
          
          // Retry upload after creating bucket
          console.log('Retrying upload after bucket creation...');
          const { error: retryError } = await supabase.storage
            .from('websites')
            .upload(fileName, htmlContent, {
              contentType: 'text/html; charset=utf-8',
              cacheControl: 'no-cache, no-store, must-revalidate',
              upsert: false
            });
            
          if (retryError) {
            console.error('Retry upload failed:', retryError);
            return false;
          }
        } else {
          return false;
        }
      }

      // Get the public URL
      const publicUrl = supabase.storage
        .from('websites')
        .getPublicUrl(fileName).data.publicUrl;
      
      // Add timestamp to URL to force fresh content
      const freshUrl = `${publicUrl}?v=${Date.now()}`;
      
      // Store in localStorage for quick access
      localStorage.setItem(`project_file_${projectId}`, JSON.stringify({
        id: projectId,
        title,
        fileName,
        publicUrl: freshUrl,
        lastUpdated: new Date().toISOString()
      }));
      
      console.log('File saved successfully:', freshUrl);
      return true;
    } catch (error) {
      console.error('Error creating project file:', error);
      return false;
    }
  }

  // Open preview using the Supabase Storage public URL
  static async openPreview(projectId: string): Promise<void> {
    try {
      // First check with project ID
      let fileName = `${projectId}/index.html`;
      let { data: publicUrlData } = supabase.storage
        .from('websites')
        .getPublicUrl(fileName);
      
      if (publicUrlData?.publicUrl) {
        // Add timestamp to bypass browser cache
        const freshUrl = `${publicUrlData.publicUrl}?v=${Date.now()}`;
        window.open(freshUrl, '_blank');
        toast.success('Preview opened with latest changes');
        return;
      }
      
      // If not found, try to get user's sequential ID and use that path
      const { data: userData } = await supabase.auth.getUser();
      if (userData?.user?.id) {
        const { data: seqData } = await supabase
          .from('user_sequences')
          .select('sequential_id')
          .eq('user_id', userData.user.id)
          .maybeSingle();
        
        if (seqData?.sequential_id) {
          fileName = `${seqData.sequential_id}/index.html`;
          const { data: seqUrlData } = supabase.storage
            .from('websites')
            .getPublicUrl(fileName);
          
          if (seqUrlData?.publicUrl) {
            const freshUrl = `${seqUrlData.publicUrl}?v=${Date.now()}`;
            window.open(freshUrl, '_blank');
            toast.success('Preview opened with latest changes');
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

  // Get project file URL for test mode
  static getProjectFileUrl(projectId: string): string {
    const fileData = this.getProjectFile(projectId);
    if (fileData?.publicUrl) {
      return fileData.publicUrl;
    }
    
    // Fallback to creating a blob URL from localStorage
    const testCode = localStorage.getItem('test-project-code');
    if (testCode) {
      const blob = new Blob([testCode], { type: 'text/html' });
      return URL.createObjectURL(blob);
    }
    
    return 'about:blank';
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

  // Alias for compatibility
  static updateProjectFile = FileManager.createProjectFile;
}