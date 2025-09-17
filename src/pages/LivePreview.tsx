import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from 'lucide-react';

const LivePreview = () => {
  const { userId, projectId, projectName } = useParams();
  const [htmlContent, setHtmlContent] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadLivePreview = async () => {
      if (!userId || !projectId) {
        setError('Invalid preview URL');
        setLoading(false);
        return;
      }

      try {
        console.log('Loading live preview:', { userId, projectId, projectName });
        
        // First, check if projectId is a sequential ID (integer)
        let actualProjectId = projectId;
        
        if (/^\d+$/.test(projectId)) {
          // It's a sequential project ID, get the actual UUID
          const { data: projectSeq } = await supabase
            .from('project_sequences')
            .select('project_id')
            .eq('sequential_id', parseInt(projectId))
            .maybeSingle();
            
          if (projectSeq?.project_id) {
            actualProjectId = projectSeq.project_id;
            console.log('Found project by sequential ID:', actualProjectId);
          }
        }
        
        // First, try to fetch directly from storage (public access)
        // Try different file name patterns
        let htmlContent = null;
        
        // Pattern 1: actualProjectId/index.html
        let fileName = `${actualProjectId}/index.html`;
        let { data: urlData } = supabase.storage
          .from('websites')
          .getPublicUrl(fileName);
          
        if (urlData?.publicUrl) {
          const timestamp = Date.now();
          const random = Math.random().toString(36).substring(7);
          const cacheBustedUrl = `${urlData.publicUrl}?t=${timestamp}&r=${random}&nocache=true`;
          
          const response = await fetch(cacheBustedUrl, {
            cache: 'no-store',
            headers: {
              'Cache-Control': 'no-cache, no-store, must-revalidate',
              'Pragma': 'no-cache'
            }
          });
          
          if (response.ok) {
            htmlContent = await response.text();
            setHtmlContent(htmlContent);
            setLoading(false);
            return;
          }
        }
        
        // Pattern 2: userId/index.html (if userId is sequential ID)
        if (/^\d+$/.test(userId)) {
          fileName = `${userId}/index.html`;
          urlData = supabase.storage
            .from('websites')
            .getPublicUrl(fileName);
            
          if (urlData?.publicUrl) {
            const timestamp = Date.now();
            const random = Math.random().toString(36).substring(7);
            const cacheBustedUrl = `${urlData.publicUrl}?t=${timestamp}&r=${random}&nocache=true`;
            
            const response = await fetch(cacheBustedUrl, {
              cache: 'no-store',
              headers: {
                'Cache-Control': 'no-cache, no-store, must-revalidate',
                'Pragma': 'no-cache'
              }
            });
            
            if (response.ok) {
              htmlContent = await response.text();
              setHtmlContent(htmlContent);
              setLoading(false);
              return;
            }
          }
        }
        
        // If still no content, try database (public projects only)
        if (!htmlContent) {
          // No need to check auth - just get public projects
          const { data: project } = await supabase
            .from('projects')
            .select('code_content, title, is_public')
            .eq('id', actualProjectId)
            .eq('is_public', true) // Only public projects
            .maybeSingle();

          if (project?.code_content) {
            setHtmlContent(project.code_content);
          } else {
            setError('Project not found or is private');
          }
        }
      } catch (err) {
        console.error('Error loading live preview:', err);
        setError('Failed to load preview');
      } finally {
        setLoading(false);
      }
    };

    loadLivePreview();
  }, [userId, projectId, projectName]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2">Error</h1>
          <p className="text-muted-foreground">{error}</p>
        </div>
      </div>
    );
  }

  // Render the HTML content directly
  return (
    <iframe
      srcDoc={htmlContent}
      className="w-full h-screen border-0"
      title="Live Preview"
      sandbox="allow-scripts allow-same-origin allow-forms allow-modals allow-popups allow-popups-to-escape-sandbox"
      style={{ width: '100vw', height: '100vh', position: 'fixed', top: 0, left: 0 }}
    />
  );
};

export default LivePreview;