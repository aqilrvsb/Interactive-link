import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';

const PreviewPage = () => {
  const { slug } = useParams();
  const [htmlContent, setHtmlContent] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadPreview = async () => {
      if (!slug) {
        setError('No preview slug provided');
        setLoading(false);
        return;
      }

      try {
        // Try to fetch from Supabase storage
        // The slug format is: project-name-shortid
        const { data } = await supabase.storage
          .from('project-files')
          .list('users', {
            search: slug
          });

        if (data && data.length > 0) {
          // Found file, download it
          const { data: fileData, error: downloadError } = await supabase.storage
            .from('project-files')
            .download(data[0].name);

          if (downloadError) {
            throw downloadError;
          }

          const text = await fileData.text();
          setHtmlContent(text);
        } else {
          // Try localStorage fallback
          for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key?.startsWith('project_file_')) {
              const fileData = JSON.parse(localStorage.getItem(key) || '');
              if (fileData.slug === slug) {
                setHtmlContent(fileData.content);
                break;
              }
            }
          }
          
          if (!htmlContent) {
            setError('Preview not found');
          }
        }
      } catch (err) {
        console.error('Error loading preview:', err);
        setError('Failed to load preview');
      } finally {
        setLoading(false);
      }
    };

    loadPreview();
  }, [slug]);

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