import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from 'lucide-react';

const LivePreview = () => {
  const { userId, projectId } = useParams();
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
        console.log('Loading live preview:', { userId, projectId });
        
        // Get the actual user ID from sequential ID if needed
        let actualUserId = userId;
        
        // If userId is a number (sequential ID)
        if (/^\d+$/.test(userId)) {
          const { data: userData } = await supabase
            .from('user_sequences')
            .select('user_id')
            .eq('sequential_id', parseInt(userId))
            .maybeSingle();
            
          if (userData?.user_id) {
            actualUserId = userData.user_id;
          }
        }

        // Get the project directly by ID
        const { data: project } = await supabase
          .from('projects')
          .select('code_content, title, is_public, user_id')
          .eq('id', projectId)
          .maybeSingle();

        if (!project) {
          // Try fetching from storage as fallback
          const fileName = `${projectId}/index.html`;
          const { data: urlData } = supabase.storage
            .from('websites')
            .getPublicUrl(fileName);
            
          if (urlData?.publicUrl) {
            // Add cache-busting
            const cacheBustedUrl = `${urlData.publicUrl}?t=${Date.now()}&r=${Math.random().toString(36).substring(7)}`;
            
            const response = await fetch(cacheBustedUrl, {
              cache: 'no-store',
              headers: {
                'Cache-Control': 'no-cache, no-store, must-revalidate',
                'Pragma': 'no-cache'
              }
            });
            
            if (response.ok) {
              const content = await response.text();
              setHtmlContent(content);
            } else {
              setError('Project not found');
            }
          } else {
            setError('Project not found');
          }
        } else {
          // Check if public or owner
          if (!project.is_public) {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user || user.id !== project.user_id) {
              setError('This project is private');
              setLoading(false);
              return;
            }
          }
          
          // Use project content
          if (project.code_content) {
            setHtmlContent(project.code_content);
          } else {
            setError('Project has no content');
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
  }, [userId, projectId]);

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