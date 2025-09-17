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

      // FORCE DELETE OLD FILE FIRST - Multiple attempts to ensure deletion
      console.log('Step 1: Force deleting old file:', fileName);
      
      // Try multiple delete methods to ensure file is removed
      try {
        // Method 1: Direct delete
        const { error: deleteError1 } = await supabase.storage
          .from('websites')
          .remove([fileName]);
        
        if (!deleteError1) {
          console.log('File deleted successfully (method 1)');
        } else {
          console.log('Delete attempt 1 result:', deleteError1.message);
        }
      } catch (err) {
        console.log('Delete attempt 1 failed:', err);
      }

      // Method 2: Try with different path format
      try {
        const altFileName = fileName.startsWith('/') ? fileName.slice(1) : `/${fileName}`;
        const { error: deleteError2 } = await supabase.storage
          .from('websites')
          .remove([altFileName]);
          
        if (!deleteError2) {
          console.log('File deleted successfully (method 2)');
        }
      } catch (err) {
        // Silent fail for alt method
      }

      // Wait longer to ensure delete is processed
      console.log('Waiting for delete to complete...');
      await new Promise(resolve => setTimeout(resolve, 500));

      // Create a proper File object with HTML mime type
      const file = new File([htmlContent], 'index.html', { 
        type: 'text/html',
        lastModified: Date.now()
      });

      // NOW CREATE COMPLETELY NEW FILE - Never use upsert
      console.log('Step 2: Creating brand new file:', fileName);
      const { error: uploadError } = await supabase.storage
        .from('websites')
        .upload(fileName, file, {
          contentType: 'text/html',
          cacheControl: 'no-cache, no-store, must-revalidate, max-age=0',
          upsert: false // NEVER upsert - always create new
        });

      if (uploadError) {
        console.error('Storage upload error:', uploadError);
        
        // If upload fails because file exists, force delete and retry
        if (uploadError.message?.includes('already exists')) {
          console.log('File still exists, forcing complete removal and retry...');
          
          // Force remove with multiple attempts
          for (let i = 0; i < 3; i++) {
            try {
              await supabase.storage.from('websites').remove([fileName]);
              await new Promise(resolve => setTimeout(resolve, 300));
            } catch (e) {
              // Continue trying
            }
          }
          
          // Final retry after aggressive deletion
          const { error: retryError } = await supabase.storage
            .from('websites')
            .upload(fileName, file, {
              contentType: 'text/html',
              cacheControl: 'no-cache, no-store, must-revalidate',
              upsert: false
            });
            
          if (retryError) {
            console.error('Retry after delete failed:', retryError);
            // Last resort - use upsert
            const { error: finalError } = await supabase.storage
              .from('websites')
              .upload(fileName, file, {
                contentType: 'text/html',
                cacheControl: 'no-cache, no-store, must-revalidate',
                upsert: true // Last resort - force overwrite
              });
              
            if (finalError) {
              console.error('Final upload attempt failed:', finalError);
              return false;
            }
          }
        }
        
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
            .upload(fileName, file, {
              contentType: 'text/html',
              cacheControl: 'no-cache, max-age=0',
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

      // Get the public URL with aggressive cache busting
      const publicUrl = supabase.storage
        .from('websites')
        .getPublicUrl(fileName).data.publicUrl;
      
      // Add multiple cache-busting parameters
      const timestamp = Date.now();
      const random = Math.random().toString(36).substring(7);
      const freshUrl = `${publicUrl}?t=${timestamp}&r=${random}&nocache=true`;
      
      // Store in localStorage for quick access
      localStorage.setItem(`project_file_${projectId}`, JSON.stringify({
        id: projectId,
        title,
        fileName,
        publicUrl: freshUrl,
        timestamp,
        lastUpdated: new Date().toISOString()
      }));
      
      console.log('File saved successfully with cache bust:', freshUrl);
      return true;
    } catch (error) {
      console.error('Error creating project file:', error);
      return false;
    }
  }

  // Open preview using clean live URL format (public access)
  static async openPreview(projectId: string): Promise<void> {
    try {
      // Get the project to get its title for the URL
      const { data: project } = await supabase
        .from('projects')
        .select('title, user_id')
        .eq('id', projectId)
        .maybeSingle();
      
      if (!project) {
        toast.error('Project not found');
        return;
      }
      
      // Generate slug from project title
      const projectSlug = project.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
      
      // Try to get user's sequential ID if logged in
      let userIdentifier: string = '';
      
      const { data: userData } = await supabase.auth.getUser();
      if (userData?.user?.id) {
        const { data: seqData } = await supabase
          .from('user_sequences')
          .select('sequential_id')
          .eq('user_id', userData.user.id)
          .maybeSingle();
        
        if (seqData?.sequential_id) {
          userIdentifier = seqData.sequential_id.toString();
        } else {
          userIdentifier = userData.user.id.substring(0, 8);
        }
      } else if (project.user_id) {
        // If not logged in, try to get sequential ID from project's user
        const { data: seqData } = await supabase
          .from('user_sequences')
          .select('sequential_id')
          .eq('user_id', project.user_id)
          .maybeSingle();
        
        if (seqData?.sequential_id) {
          userIdentifier = seqData.sequential_id.toString();
        } else {
          userIdentifier = project.user_id.substring(0, 8);
        }
      }
      
      // If still no user identifier, use first 8 chars of project user_id
      if (!userIdentifier && project.user_id) {
        userIdentifier = project.user_id.substring(0, 8);
      }
      
      // Open clean URL format: /userId/projectId/project-name
      const cleanUrl = `/${userIdentifier}/${projectId}/${projectSlug}`;
      window.open(cleanUrl, '_blank');
      toast.success('Preview opened');
      
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