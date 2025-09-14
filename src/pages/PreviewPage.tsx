import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
const PreviewPage = () => {
  const { userId, slug } = useParams(); // Now expecting /userId/preview/slug
  const [htmlContent, setHtmlContent] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadPreview = async () => {
      if (!userId || !slug) {
        setError('Invalid preview URL');
        setLoading(false);
        return;
      }

      try {
        // First, try to find the project by matching the slug and user sequential ID
        let foundContent = false;
        
        // Check localStorage for matching project
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key?.startsWith('project_file_')) {
            try {
              const fileData = JSON.parse(localStorage.getItem(key) || '');
              
              // Match by sequential ID and slug
              const userIdMatch = fileData.userSequentialId?.toString() === userId || 
                                 fileData.id.substring(0, 8) === userId;
              const slugMatch = fileData.slug === slug;              
              if (userIdMatch && slugMatch) {
                // Found matching project
                if (fileData.storagePath) {
                  // Try to load from Supabase
                  const { data: urlData } = supabase.storage
                    .from('project-files')
                    .getPublicUrl(fileData.storagePath);
                  
                  if (urlData?.publicUrl) {
                    // Fetch the content
                    const response = await fetch(urlData.publicUrl);
                    if (response.ok) {
                      const text = await response.text();
                      setHtmlContent(text);
                      foundContent = true;
                      break;
                    }
                  }
                }
                
                // Fallback to localStorage content
                if (!foundContent && fileData.content) {
                  setHtmlContent(fileData.content);
                  foundContent = true;
                  break;
                }
              }
            } catch (e) {
              console.error('Error parsing file data:', e);
            }
          }
        }        
        if (!foundContent) {
          // Try direct Supabase search as fallback
          // Convert sequential ID back to UUID if needed
          const { data: userData } = await supabase
            .from('user_sequences')
            .select('user_id')
            .eq('sequential_id', parseInt(userId))
            .single();
          
          if (userData?.user_id) {
            // Search for files in user's directory
            const { data: files } = await supabase.storage
              .from('project-files')
              .list(`users/${userData.user_id}/projects`);
            
            if (files && files.length > 0) {
              // Try to find a file that might match the slug
              for (const file of files) {
                if (file.name.includes(slug) || file.name.includes(userData.user_id)) {
                  const { data: fileData } = await supabase.storage
                    .from('project-files')
                    .download(`users/${userData.user_id}/projects/${file.name}`);
                  
                  if (fileData) {
                    const text = await fileData.text();
                    setHtmlContent(text);
                    foundContent = true;
                    break;
                  }
                }
              }
            }
          }
        }        
        if (!foundContent) {
          setError('Preview not found. Make sure the project has been saved.');
        }
      } catch (err) {
        console.error('Error loading preview:', err);
        setError('Failed to load preview');
      } finally {
        setLoading(false);
      }
    };

    loadPreview();
  }, [userId, slug]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4">Loading preview...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2">Error</h1>
          <p className="text-muted-foreground">{error}</p>
          <p className="text-sm mt-2">URL Format: /{userId}/preview/{project-name}</p>
        </div>
      </div>
    );
  }

  // Render the HTML content in an iframe for isolation
  return (
    <div className="w-full h-screen">
      <iframe
        srcDoc={htmlContent}
        className="w-full h-full border-0"
        title="Preview"
        sandbox="allow-scripts allow-same-origin"
      />
    </div>
  );
};

export default PreviewPage;