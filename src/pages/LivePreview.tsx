import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from 'lucide-react';
import { processFrameworkCode } from '@/utils/frameworks';

const LivePreview = () => {
  const { projectId, projectName, userId } = useParams();
  const [htmlContent, setHtmlContent] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadLivePreview = async () => {
      // Get the actual project ID (could be just projectId for /p/1/name format)
      const actualProjectId = projectId || userId;
      
      if (!actualProjectId) {
        setError('Invalid preview URL');
        setLoading(false);
        return;
      }

      try {
        console.log('Loading preview for project:', actualProjectId);
        
        // Try fetching from Supabase storage
        let fileName = `${actualProjectId}/index.html`;
        let { data: urlData } = supabase.storage
          .from('websites')
          .getPublicUrl(fileName);
          
        if (urlData?.publicUrl) {
          const timestamp = Date.now();
          const random = Math.random().toString(36).substring(7);
          const cacheBustedUrl = `${urlData.publicUrl}?t=${timestamp}&r=${random}`;
          
          try {
            const response = await fetch(cacheBustedUrl, {
              cache: 'no-store',
              headers: {
                'Cache-Control': 'no-cache, no-store, must-revalidate',
                'Pragma': 'no-cache'
              }
            });
            
            if (response.ok) {
              const content = await response.text();
              setHtmlContent(processFrameworkCode(content));
              setLoading(false);
              return;
            }
          } catch (err) {
            console.error('Error fetching from storage:', err);
          }
        }
        
        // Try database as fallback
        const { data: project } = await supabase
          .from('projects')
          .select('code_content, title, is_public')
          .eq('id', parseInt(actualProjectId))
          .eq('is_public', true)
          .maybeSingle();

        if (project?.code_content) {
          setHtmlContent(processFrameworkCode(project.code_content));
        } else {
          setError('Project not found or is private');
        }
      } catch (err) {
        console.error('Error loading preview:', err);
        setError('Failed to load preview');
      } finally {
        setLoading(false);
      }
    };

    loadLivePreview();
  }, [projectId, projectName, userId]);

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