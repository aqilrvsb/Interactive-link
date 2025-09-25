import { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from 'lucide-react';

const PreviewPage = () => {
  const { userId, slug } = useParams();
  const [searchParams] = useSearchParams();
  const [htmlContent, setHtmlContent] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadPreview = async () => {
      try {
        // Check if we have a direct storage URL in query params
        const storageUrl = searchParams.get('url');
        
        if (storageUrl) {
          // Fetch the HTML content from the storage URL
          const response = await fetch(storageUrl);
          if (response.ok) {
            const content = await response.text();
            setHtmlContent(content);
          } else {
            setError('Failed to load preview content');
          }
        } else if (userId && slug) {
          // Original logic for loading by userId and slug
          
          // First try to find by sequential ID
          if (/^\d+$/.test(userId)) {
            const { data: userData } = await supabase
              .from('user_sequences')
              .select('user_id')
              .eq('sequential_id', parseInt(userId))
              .maybeSingle();
              
            if (userData?.user_id) {
              // Get project from database
              const { data: project } = await supabase
                .from('projects')
                .select('code_content, is_public')
                .eq('user_id', userData.user_id)
                .ilike('title', slug.replace(/-/g, ' '))
                .maybeSingle();
                
              if (project?.code_content) {
                setHtmlContent(project.code_content);
              } else {
                // Try to fetch from storage
                const fileName = `${userId}/index.html`;
                const { data: urlData } = supabase.storage
                  .from('websites')
                  .getPublicUrl(fileName);
                  
                if (urlData?.publicUrl) {
                  const response = await fetch(urlData.publicUrl);
                  if (response.ok) {
                    const content = await response.text();
                    setHtmlContent(content);
                  }
                }
              }
            }
          } else {
            // Try by partial UUID
            const fileName = `${userId}/index.html`;
            const { data: urlData } = supabase.storage
              .from('websites')
              .getPublicUrl(fileName);
              
            if (urlData?.publicUrl) {
              const response = await fetch(urlData.publicUrl);
              if (response.ok) {
                const content = await response.text();
                setHtmlContent(content);
              }
            }
          }
        }
        
        if (!htmlContent && !storageUrl) {
          setError('Preview not found');
        }
      } catch (err) {
        console.error('Error loading preview:', err);
        setError('Failed to load preview');
      } finally {
        setLoading(false);
      }
    };

    loadPreview();
  }, [userId, slug, searchParams, htmlContent]);

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

  // Render the HTML content in an iframe using srcdoc
  return (
    <iframe
      srcdoc={htmlContent}
      className="w-full h-screen border-0"
      title="Preview"
      sandbox="allow-scripts allow-same-origin allow-forms allow-modals allow-popups allow-popups-to-escape-sandbox"
      style={{ width: '100vw', height: '100vh', position: 'fixed', top: 0, left: 0 }}
    />
  );
};

export default PreviewPage;