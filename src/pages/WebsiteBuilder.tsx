import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, Save, Settings, Files, Globe, Code2, Maximize, ExternalLink, X } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { useProjects } from '@/hooks/useProjects';
import { useSiteVersions, SiteVersion } from '@/hooks/useSiteVersions';
import { useAuth } from '@/contexts/AuthContext';
import { ProjectFilesView } from '@/components/website-builder/ProjectFilesView';
import { SupabaseSettings } from '@/components/website-builder/SupabaseSettings';
import { DomainManagement } from '@/components/website-builder/DomainManagement';
import { toast } from 'sonner';

const WebsiteBuilder = () => {
  const navigate = useNavigate();
  const { projectId } = useParams();
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const { user } = useAuth();
  const { projects, createProject, updateProject } = useProjects();
  const { createVersion } = useSiteVersions(projectId);

  const [htmlCode, setHtmlCode] = useState(`<!DOCTYPE html>
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
        <p>This is your starting template. Edit the HTML, CSS, and JavaScript to build your perfect website.</p>
        <button class="button" onclick="alert('Hello World!')">Click Me!</button>
    </div>
    
    <script>
        console.log('Website loaded successfully!');
    </script>
</body>
</html>`);
  
  const [cssCode, setCssCode] = useState('/* Additional CSS styles go here */');
  const [jsCode, setJsCode] = useState('// Additional JavaScript code goes here\nconsole.log("JavaScript is ready!");');
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
        // Try to parse the code content if it's structured
        try {
          const parsed = JSON.parse(project.code_content);
          if (parsed.html) setHtmlCode(parsed.html);
          if (parsed.css) setCssCode(parsed.css);
          if (parsed.js) setJsCode(parsed.js);
        } catch {
          // If not JSON, treat as HTML
          setHtmlCode(project.code_content);
        }
      }
    }
  }, [projectId, projects]);

  const buildFullHTML = () => {
    // If HTML already includes CSS and JS, return as is
    if (htmlCode.includes('<style>') || htmlCode.includes('<script>')) {
      return htmlCode;
    }

    // Otherwise, inject CSS and JS
    let fullHTML = htmlCode;
    
    if (cssCode.trim() && cssCode.trim() !== '/* Additional CSS styles go here */') {
      const cssTag = `
    <style>
${cssCode}
    </style>`;
      if (fullHTML.includes('</head>')) {
        fullHTML = fullHTML.replace('</head>', `${cssTag}
</head>`);
      } else {
        fullHTML = `<head>${cssTag}
</head>
${fullHTML}`;
      }
    }

    if (jsCode.trim() && jsCode.trim() !== '// Additional JavaScript code goes here\nconsole.log("JavaScript is ready!");') {
      const jsTag = `
    <script>
${jsCode}
    </script>`;
      if (fullHTML.includes('</body>')) {
        fullHTML = fullHTML.replace('</body>', `${jsTag}
</body>`);
      } else {
        fullHTML = `${fullHTML}
<script>${jsCode}</script>`;
      }
    }

    return fullHTML;
  };

  const updatePreview = () => {
    const fullHTML = buildFullHTML();
    
    // Update main iframe
    if (iframeRef.current) {
      iframeRef.current.srcdoc = fullHTML;
    }
    
    // Update full preview iframe if it exists
    if (fullPreviewIframeRef.current) {
      fullPreviewIframeRef.current.srcdoc = fullHTML;
    }
  };

  const openInNewTab = () => {
    const fullHTML = buildFullHTML();
    const blob = new Blob([fullHTML], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank');
    // Clean up the URL object after a short delay
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  // Update preview when code changes
  useEffect(() => {
    const timeoutId = setTimeout(updatePreview, 300);
    return () => clearTimeout(timeoutId);
  }, [htmlCode, cssCode, jsCode]);

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
    if (!user) {
      toast.error('Please log in to save your project');
      return;
    }

    if (!htmlCode.trim() && !cssCode.trim() && !jsCode.trim()) {
      toast.error('Please add some code before saving');
      return;
    }

    setIsSaving(true);
    try {
      const fullHTML = buildFullHTML();
      const codeContent = JSON.stringify({
        html: htmlCode,
        css: cssCode,
        js: jsCode
      });

      let project = currentProject;

      if (!project) {
        // Create new project
        const title = `Website - ${new Date().toLocaleDateString()}`;
        project = await createProject({
          title,
          description: 'A website built with the website builder',
          code_content: codeContent,
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
          code_content: codeContent,
          updated_at: new Date().toISOString()
        });
      }

      // Create a new version
      if (project) {
        await createVersion({
          project_id: project.id,
          html_content: fullHTML,
          css_content: cssCode.trim() || null,
          js_content: jsCode.trim() || null,
          assets: []
        });

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
    setHtmlCode(version.html_content);
    setCssCode(version.css_content || '/* Additional CSS styles go here */');
    setJsCode(version.js_content || '// Additional JavaScript code goes here\nconsole.log("JavaScript is ready!");');
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
            Website Builder
          </h1>
        </div>
        <div className="flex items-center gap-2">
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
              <Tabs defaultValue="html" className="flex-1 flex flex-col">
                <div className="border-b px-4 py-2">
                  <TabsList className="grid w-full max-w-md grid-cols-3">
                    <TabsTrigger value="html">HTML</TabsTrigger>
                    <TabsTrigger value="css">CSS</TabsTrigger>
                    <TabsTrigger value="js">JavaScript</TabsTrigger>
                  </TabsList>
                </div>

                <TabsContent value="html" className="flex-1 p-4 m-0">
                  <Textarea
                    placeholder="Enter your HTML code here..."
                    value={htmlCode}
                    onChange={(e) => setHtmlCode(e.target.value)}
                    className="h-full resize-none font-mono text-sm"
                  />
                </TabsContent>

                <TabsContent value="css" className="flex-1 p-4 m-0">
                  <Textarea
                    placeholder="Enter your CSS code here..."
                    value={cssCode}
                    onChange={(e) => setCssCode(e.target.value)}
                    className="h-full resize-none font-mono text-sm"
                  />
                </TabsContent>

                <TabsContent value="js" className="flex-1 p-4 m-0">
                  <Textarea
                    placeholder="Enter your JavaScript code here..."
                    value={jsCode}
                    onChange={(e) => setJsCode(e.target.value)}
                    className="h-full resize-none font-mono text-sm"
                  />
                </TabsContent>
              </Tabs>
            </div>
          </ResizablePanel>

          <ResizableHandle />

          {/* Preview & Management Panel */}
          <ResizablePanel defaultSize={70} minSize={30}>
            <Tabs defaultValue="preview" className="h-full flex flex-col">
              <div className="border-b px-4 py-2">
                <TabsList className="grid w-full max-w-lg grid-cols-4">
                  <TabsTrigger value="preview">Preview</TabsTrigger>
                  <TabsTrigger value="files">Files</TabsTrigger>
                  <TabsTrigger value="domains">Domains</TabsTrigger>
                  <TabsTrigger value="settings">Settings</TabsTrigger>
                </TabsList>
              </div>

              <TabsContent value="preview" className="flex-1 p-0 m-0 h-full">
                <Card className="h-full flex flex-col">
                  <CardHeader className="flex-none pb-2 px-3 py-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <Globe className="h-3 w-3" />
                        Preview
                      </CardTitle>
                      <div className="flex items-center gap-1">
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
                        title="Website Preview"
                        sandbox="allow-scripts allow-same-origin allow-forms"
                      />
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="files" className="flex-1 p-4 m-0 overflow-auto">
                {currentProject ? (
                  <ProjectFilesView 
                    projectId={currentProject.id} 
                    onEditVersion={handleEditVersion}
                  />
                ) : (
                  <div className="flex items-center justify-center h-full text-center">
                    <div className="text-muted-foreground">
                      <Files className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <div>Save your project first to see versions</div>
                    </div>
                  </div>
                )}
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

              <TabsContent value="settings" className="flex-1 p-4 m-0 overflow-auto">
                <SupabaseSettings />
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
