import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, Save, Settings, Files, Globe, Code2, Maximize, ExternalLink, X, Eye } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { useProjects } from '@/hooks/useProjects';
import { useSiteVersions, SiteVersion } from '@/hooks/useSiteVersions';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { ProjectFilesView } from '@/components/website-builder/ProjectFilesView';
import { SupabaseSettings } from '@/components/website-builder/SupabaseSettings';
import { DomainManagement } from '@/components/website-builder/DomainManagement';
import { FileManager } from '@/utils/fileManager';
import { toast } from 'sonner';

const WebsiteBuilder = () => {
  const navigate = useNavigate();
  const { projectId } = useParams();
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const { user } = useAuth();
  const { projects, createProject, updateProject } = useProjects();
  const { createVersion } = useSiteVersions(projectId);

  const [code, setCode] = useState(`<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>My Website</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            margin: 0;
            padding: 20px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        .container {
            background: white;
            padding: 2rem;
            border-radius: 10px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.2);
            text-align: center;
            max-width: 500px;
        }
        h1 {
            color: #333;
            margin-bottom: 1rem;
        }
        p {
            color: #666;
            line-height: 1.6;
        }
        .button {
            background: #667eea;
            color: white;
            padding: 12px 24px;
            border: none;
            border-radius: 5px;
            cursor: pointer;
            font-size: 16px;
            margin-top: 1rem;
        }
        .button:hover {
            background: #5a6fd8;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>Welcome to Your Website!</h1>
        <p>Paste any HTML, CSS, JavaScript, React JSX, or other web code here and see it run instantly!</p>
        <button class="button" onclick="alert('Hello World!')">Click Me!</button>
    </div>
    
    <script>
        console.log('Website loaded successfully!');
    </script>
</body>
</html>`);
  const [isSaving, setIsSaving] = useState(false);
  const [currentProject, setCurrentProject] = useState<any>(null);
  const [isFullPreview, setIsFullPreview] = useState(false);
  const fullPreviewIframeRef = useRef<HTMLIFrameElement>(null);

  // Load project if projectId is provided
  useEffect(() => {
    if (projectId && projects.length > 0) {
      const project = projects.find(p => p.id === projectId);
      if (project && project.code_content) {
        setCurrentProject(project);
        setCode(project.code_content);
      }
    } else if (!user) {
      // Load test project from localStorage if not logged in
      const testCode = localStorage.getItem('test-project-code');
      if (testCode) {
        setCode(testCode);
        setCurrentProject({
          id: 'test-project',
          title: 'Test Project',
          code_content: testCode,
          created_at: new Date().toISOString()
        });
      }
    }
  }, [projectId, projects, user]);

  const processCode = () => {
    // Return the code as-is - it can be any format (HTML, React JSX, etc.)
    return code;
  };

  const updatePreview = () => {
    const processedCode = processCode();
    
    // Update main iframe
    if (iframeRef.current) {
      iframeRef.current.srcdoc = processedCode;
    }
    
    // Update full preview iframe if it exists
    if (fullPreviewIframeRef.current) {
      fullPreviewIframeRef.current.srcdoc = processedCode;
    }
  };

  const openInNewTab = () => {
    const processedCode = processCode();
    const blob = new Blob([processedCode], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank');
    // Clean up the URL object after a short delay
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const openInWebsiteMode = async () => {
    if (!currentProject || !currentProject.id) {
      toast.error('Please save your project first to use Website Mode');
      return;
    }

    if (currentProject.id === 'test-project') {
      // Test mode - use direct file URL that FileManager creates
      const fileUrl = FileManager.getProjectFileUrl(currentProject.id);
      const websiteWindow = window.open(fileUrl, '_blank', 'toolbar=yes,scrollbars=yes,resizable=yes,width=1200,height=800');
      
      if (websiteWindow) {
        toast.success('Website opened! Login and save for permanent URLs.');
      } else {
        toast.error('Please allow pop-ups to use Website Mode');
      }
    } else {
      try {
        // For real projects, use the Supabase public URL
        const { data: publicData } = supabase.storage
          .from('websites')
          .getPublicUrl(`${currentProject.id}/index.html`);

        const publicUrl = publicData?.publicUrl;
        if (!publicUrl) {
          toast.error('Failed to resolve public website URL');
          return;
        }

        const websiteWindow = window.open(publicUrl, '_blank', 'toolbar=yes,scrollbars=yes,resizable=yes,width=1200,height=800');
        if (websiteWindow) {
          toast.success('Website opened from Supabase Storage!');
        } else {
          toast.error('Please allow pop-ups to use Website Mode');
        }
      } catch (error) {
        console.error('Error opening website mode:', error);
        toast.error('Failed to open website mode');
      }
    }
  };

  // Update preview when code changes
  useEffect(() => {
    const timeoutId = setTimeout(updatePreview, 300);
    return () => clearTimeout(timeoutId);
  }, [code]);

  // Handle ESC key for full preview mode
  useEffect(() => {
    const handleEscKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isFullPreview) {
        setIsFullPreview(false);
      }
    };

    if (isFullPreview) {
      document.addEventListener('keydown', handleEscKey);
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.removeEventListener('keydown', handleEscKey);
      document.body.style.overflow = 'unset';
    };
  }, [isFullPreview]);

  const handleSave = async () => {
    if (!code.trim()) {
      toast.error('Please add some code before saving');
      return;
    }

    setIsSaving(true);
    try {
      const processedCode = processCode();

      if (!user) {
        // Test mode - just save to localStorage and show success
        const testProject = {
          id: 'test-project',
          title: `Test Project - ${new Date().toLocaleDateString()}`,
          code_content: code,
          created_at: new Date().toISOString()
        };
        localStorage.setItem('test-project-code', code);
        setCurrentProject(testProject);
        toast.success('Code saved locally for testing! Login to save permanently and use Website Mode.');
        updatePreview();
        setIsSaving(false);
        return;
      }

      let project = currentProject;

      if (!project || project.id === 'test-project') {
        // Create new project
        const title = `Website - ${new Date().toLocaleDateString()}`;
        project = await createProject({
          title,
          description: 'A website built with the code editor',
          code_content: code,
          language: 'html',
          is_public: false,
        });
        
        if (!project) {
          throw new Error('Failed to create project');
        }
        
        setCurrentProject(project);
      } else {
        // Update existing project
        project = await updateProject(project.id, {
          code_content: code,
          updated_at: new Date().toISOString()
        });
      }

        // Save HTML file using FileManager for proper file creation and preview
        if (project && user) {
          // First get the user's sequential ID from Supabase
          let sequentialId = null;
          try {
            const { data: seqData } = await supabase
              .from('user_sequences')
              .select('sequential_id')
              .eq('user_id', user.id)
              .single();
            
            if (seqData) {
              sequentialId = seqData.sequential_id;
              console.log('User sequential ID:', sequentialId);
            }
          } catch (err) {
            console.log('Could not fetch sequential ID:', err);
          }

          // Save with sequential ID
          const saveSuccess = await FileManager.createProjectFile(
            project.id, 
            project.title, 
            processedCode,
            user.id,
            sequentialId // Pass sequential ID
          );
          
          if (!saveSuccess) {
            console.error('Failed to create project file');
          }
        }

        // Also save to Supabase storage for backup
        if (project) {
          try {
            // Create blob with proper MIME type and upload as buffer
            const htmlBlob = new Blob([processedCode], { type: 'text/html; charset=utf-8' });
            const arrayBuffer = await htmlBlob.arrayBuffer();
            
            const { error: uploadError } = await supabase.storage
              .from('websites')
              .upload(`${project.id}/index.html`, arrayBuffer, {
                upsert: true,
                contentType: 'text/html; charset=utf-8',
                cacheControl: '3600'
              });

          if (uploadError) {
            console.error('Storage upload error:', uploadError);
          }
        } catch (storageError) {
          console.error('Failed to save HTML file:', storageError);
        }

        // Save the public URL for publish redirect and quick access
        try {
          const { data: publicData } = supabase.storage
            .from('websites')
            .getPublicUrl(`${project.id}/index.html`);
          if (publicData?.publicUrl) {
            localStorage.setItem('publicWebsiteUrl', publicData.publicUrl);
          }
        } catch (_) {}

        // Create a new version
        await createVersion({
          project_id: project.id,
          html_content: processedCode,
          css_content: null,
          js_content: null,
          assets: []
        });

        toast.success('Project saved successfully! Use Website Mode to view your live site.');
        // Auto-run the saved HTML in preview
        updatePreview();
      }

    } catch (error) {
      console.error('Error saving:', error);
      toast.error('Failed to save project. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleEditVersion = (version: SiteVersion) => {
    // Load version content into editor
    setCode(version.html_content);
    toast.success(`Loaded version ${version.version_number} for editing`);
  };

  return (
    <div className="h-screen flex flex-col bg-background">
      <header className="border-b bg-card px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => navigate('/dashboard')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Dashboard
          </Button>
          <h1 className="text-lg font-semibold flex items-center gap-2">
            <Code2 className="h-5 w-5" />
            Code Editor
          </h1>
        </div>
        <div className="flex items-center gap-2">
          {currentProject && (
            <Button 
              variant="outline" 
              onClick={async () => await FileManager.openPreview(currentProject.id)} 
              className="flex items-center gap-2"
            >
              <Eye className="h-4 w-4" />
              Preview
            </Button>
          )}
          <Button onClick={handleSave} disabled={isSaving} className="flex items-center gap-2">
            <Save className="h-4 w-4" />
            {isSaving ? 'Saving...' : user ? 'Save & Version' : 'Save (Test Mode)'}
          </Button>
        </div>
      </header>

      <div className="flex-1 flex">
        <ResizablePanelGroup direction="horizontal" className="flex-1">
          {/* Code Editor Panel */}
          <ResizablePanel defaultSize={30} minSize={20}>
            <div className="h-full flex flex-col">
              <div className="border-b px-4 py-3">
                <h3 className="text-sm font-medium">Code Editor</h3>
                <p className="text-xs text-muted-foreground mt-1">
                  Paste any HTML, CSS, JavaScript, React JSX, or other web code
                </p>
              </div>
              <div className="flex-1 p-4">
                <Textarea
                  placeholder="Paste your code here... HTML, CSS, JavaScript, React JSX, or any web code will work!"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  className="h-full resize-none font-mono text-sm"
                />
              </div>
            </div>
          </ResizablePanel>

          <ResizableHandle />

          {/* Preview Panel */}
          <ResizablePanel defaultSize={70} minSize={30}>
            <Tabs defaultValue="preview" className="h-full flex flex-col">
              <div className="border-b px-4 py-2">
                <TabsList className="grid w-full max-w-md grid-cols-2">
                  <TabsTrigger value="preview">Preview</TabsTrigger>
                  <TabsTrigger value="domains">Domains</TabsTrigger>
                </TabsList>
              </div>

              <TabsContent value="preview" className="flex-1 p-0 m-0 h-full">
                <Card className="h-full flex flex-col">
                  <CardHeader className="flex-none pb-2 px-3 py-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <Globe className="h-3 w-3" />
                        Live Preview
                      </CardTitle>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={openInWebsiteMode}
                          className="h-7 px-2 text-xs"
                          title="Open as Website"
                        >
                          <Globe className="h-3 w-3 mr-1" />
                          Website
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={openInNewTab}
                          className="h-7 w-7 p-0"
                          title="Open in new tab"
                        >
                          <ExternalLink className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setIsFullPreview(true)}
                          className="h-7 w-7 p-0"
                          title="Full Preview"
                        >
                          <Maximize className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="flex-1 min-h-0 overflow-hidden p-2">
                    <div className="h-full border rounded-lg overflow-hidden">
                      <iframe
                        ref={iframeRef}
                        className="w-full h-full block border-0"
                        title="Code Preview"
                        sandbox="allow-scripts allow-same-origin allow-forms"
                      />
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="domains" className="flex-1 p-4 m-0 overflow-auto">
                {currentProject ? (
                  <DomainManagement projectId={currentProject.id} />
                ) : (
                  <div className="flex items-center justify-center h-full text-center">
                    <div className="text-muted-foreground">
                      <Globe className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <div>Save your project first to manage domains</div>
                    </div>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>

      {/* Full Preview Overlay */}
      {isFullPreview && (
        <div className="fixed inset-0 z-50 bg-black">
          <div className="absolute top-4 right-4 z-10">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setIsFullPreview(false)}
              className="flex items-center gap-2"
            >
              <X className="h-4 w-4" />
              Exit Full Preview (Esc)
            </Button>
          </div>
          <iframe
            ref={fullPreviewIframeRef}
            className="w-full h-full"
            title="Full Website Preview"
            sandbox="allow-scripts allow-same-origin allow-forms"
          />
        </div>
      )}
    </div>
  );
};

export default WebsiteBuilder;
