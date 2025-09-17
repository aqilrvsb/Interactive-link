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
  const [sequentialId, setSequentialId] = useState<number | null>(null);
  const fullPreviewIframeRef = useRef<HTMLIFrameElement>(null);

  // Load project from storage on mount
  useEffect(() => {
    const loadProject = async () => {
      if (!projectId) return;

      try {
        // First, get the project metadata from database (for title, etc)
        if (projects.length > 0) {
          const project = projects.find(p => p.id === projectId);
          if (project) {
            setCurrentProject(project);
          }
        }

        // Get user's sequential ID if available
        if (user?.id) {
          const { data: seqData } = await supabase
            .from('user_sequences')
            .select('sequential_id')
            .eq('user_id', user.id)
            .single();
          
          if (seqData?.sequential_id) {
            setSequentialId(seqData.sequential_id);
          }
        }

        // Load the HTML content directly from storage
        const htmlContent = await FileManager.loadProjectFile(projectId, sequentialId);
        if (htmlContent) {
          setCode(htmlContent);
        } else if (currentProject?.code_content) {
          // Fallback to database content if storage doesn't have it yet
          setCode(currentProject.code_content);
        }
      } catch (error) {
        console.error('Error loading project:', error);
        toast.error('Failed to load project');
      }
    };

    loadProject();
  }, [projectId, projects, user, sequentialId]);

  const updatePreview = () => {
    // Update main iframe
    if (iframeRef.current) {
      iframeRef.current.srcdoc = code;
    }
    
    // Update full preview iframe if it exists
    if (fullPreviewIframeRef.current) {
      fullPreviewIframeRef.current.srcdoc = code;
    }
  };

  // Update preview when code changes
  useEffect(() => {
    const timeoutId = setTimeout(() => updatePreview(), 500);
    return () => clearTimeout(timeoutId);
  }, [code]);

  // Handle ESC key for full preview mode
  useEffect(() => {
    const handleEscKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isFullPreview) {
        setIsFullPreview(false);
      }
    };

    if (isFullPreview) {
      document.addEventListener('keydown', handleEscKey);
      document.body.style.overflow = 'hidden';
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
      let project = currentProject;

      // If no project exists, create one in database (for metadata only)
      if (!project || project.id === 'test-project') {
        const title = `Website - ${new Date().toLocaleDateString()}`;
        
        // Check if user is logged in
        const { data: userData } = await supabase.auth.getUser();
        const userId = user?.id || userData?.user?.id;
        
        if (!userId) {
          // Test mode - save locally
          const testProject = {
            id: 'test-project-' + Date.now(),
            title,
            created_at: new Date().toISOString()
          };
          localStorage.setItem('test-project-code', code);
          setCurrentProject(testProject);
          toast.success('Code saved locally for testing! Please login to save permanently.');
          updatePreview();
          setIsSaving(false);
          return;
        }

        // Create project in database (for metadata)
        project = await createProject({
          title,
          description: 'A website built with the code editor',
          code_content: '', // We don't store code in DB anymore
          language: 'html',
          is_public: false,
        });
        
        if (!project) {
          throw new Error('Failed to create project');
        }
        setCurrentProject(project);
      }

      // Get user's sequential ID
      let userSequentialId = sequentialId;
      if (!userSequentialId && user?.id) {
        const { data: seqData } = await supabase
          .from('user_sequences')
          .select('sequential_id')
          .eq('user_id', user.id)
          .single();
        
        if (seqData?.sequential_id) {
          userSequentialId = seqData.sequential_id;
          setSequentialId(userSequentialId);
        }
      }

      // Save directly to Supabase Storage (this is our primary storage)
      const saveSuccess = await FileManager.createProjectFile(
        project.id,
        project.title,
        code,
        user?.id,
        userSequentialId
      );

      if (saveSuccess) {
        toast.success('Project saved successfully!');
        
        // Create a version record (optional, for history)
        try {
          await createVersion({
            project_id: project.id,
            html_content: code,
            css_content: null,
            js_content: null,
            assets: []
          });
        } catch (versionError) {
          console.log('Version creation skipped:', versionError);
        }
      } else {
        throw new Error('Failed to save to storage');
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
          <h1 className="text-xl font-semibold flex items-center gap-2">
            <Code2 className="h-5 w-5" />
            Code Editor
          </h1>
        </div>
        <div className="flex items-center gap-2">
          {currentProject && currentProject.id !== 'test-project' && (
            <Button 
              variant="outline" 
              onClick={() => FileManager.openPreview(currentProject.id)} 
              className="flex items-center gap-2"
            >
              <Eye className="h-4 w-4" />
              Preview
            </Button>
          )}
          <Button onClick={handleSave} disabled={isSaving} className="flex items-center gap-2">
            <Save className="h-4 w-4" />
            {isSaving ? 'Saving...' : 'Save & Version'}
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
                <TabsList className="h-9">
                  <TabsTrigger value="preview" className="text-xs">
                    <Eye className="h-3 w-3 mr-1" />
                    Live Preview
                  </TabsTrigger>
                  <TabsTrigger value="files" className="text-xs">
                    <Files className="h-3 w-3 mr-1" />
                    Files
                  </TabsTrigger>
                  <TabsTrigger value="domains" className="text-xs">
                    <Globe className="h-3 w-3 mr-1" />
                    Domains
                  </TabsTrigger>
                  <TabsTrigger value="settings" className="text-xs">
                    <Settings className="h-3 w-3 mr-1" />
                    Settings
                  </TabsTrigger>
                </TabsList>
              </div>

              <TabsContent value="preview" className="flex-1 relative overflow-hidden m-0">
                <div className="absolute top-2 right-2 z-10 flex gap-2">
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => setIsFullPreview(true)}
                    className="shadow-md"
                  >
                    <Maximize className="h-4 w-4" />
                  </Button>
                </div>
                <iframe
                  ref={iframeRef}
                  className="w-full h-full border-0"
                  title="Preview"
                  sandbox="allow-scripts allow-forms allow-popups allow-same-origin"
                />
              </TabsContent>

              <TabsContent value="files" className="flex-1 p-4 overflow-auto m-0">
                {currentProject && currentProject.id !== 'test-project' ? (
                  <ProjectFilesView projectId={currentProject.id} />
                ) : (
                  <Card>
                    <CardContent className="pt-6">
                      <p className="text-sm text-muted-foreground text-center">
                        Save your project to manage files
                      </p>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              <TabsContent value="domains" className="flex-1 p-4 overflow-auto m-0">
                {currentProject && currentProject.id !== 'test-project' ? (
                  <DomainManagement projectId={currentProject.id} />
                ) : (
                  <Card>
                    <CardContent className="pt-6">
                      <p className="text-sm text-muted-foreground text-center">
                        Save your project to manage domains
                      </p>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              <TabsContent value="settings" className="flex-1 p-4 overflow-auto m-0">
                <SupabaseSettings />
              </TabsContent>
            </Tabs>
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>

      {/* Full Screen Preview Modal */}
      {isFullPreview && (
        <div className="fixed inset-0 z-50 bg-background">
          <div className="absolute top-4 right-4 z-10 flex gap-2">
            <Button
              size="sm"
              variant="secondary"
              onClick={() => setIsFullPreview(false)}
            >
              <X className="h-4 w-4 mr-2" />
              Exit Preview
            </Button>
          </div>
          <iframe
            ref={fullPreviewIframeRef}
            className="w-full h-full border-0"
            title="Full Preview"
            sandbox="allow-scripts allow-forms allow-popups allow-same-origin"
            srcDoc={code}
          />
        </div>
      )}
    </div>
  );
};

export default WebsiteBuilder;