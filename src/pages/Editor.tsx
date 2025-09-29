import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable';
import { ArrowLeft, Code2, Save } from 'lucide-react';
import { useProjects } from '@/hooks/useProjects';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

const LANGUAGES = [
  { value: 'html', label: 'HTML' },
  { value: 'css', label: 'CSS' },
  { value: 'javascript', label: 'JavaScript' },
  { value: 'react', label: 'React JSX' },
  { value: 'php', label: 'PHP' },
  { value: 'python', label: 'Python' },
  { value: 'c', label: 'C' },
  { value: 'cpp', label: 'C++' },
  { value: 'java', label: 'Java' },
  { value: 'typescript', label: 'TypeScript' },
  { value: 'json', label: 'JSON' },
  { value: 'xml', label: 'XML' },
];

const Editor = () => {
  const navigate = useNavigate();
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const { user } = useAuth();
  const { createProject } = useProjects();

  const [language, setLanguage] = useState('html');
  const [code, setCode] = useState('<!-- Paste your code here and see the preview -->');
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    if (!user) {
      toast.error('Please log in to save your project');
      return;
    }

    if (!code.trim()) {
      toast.error('Please add some code before saving');
      return;
    }

    setIsSaving(true);
    try {
      const title = `${language.toUpperCase()} Project - ${new Date().toLocaleDateString()}`;
      const result = await createProject({
        title,
        description: `A ${language} project created in the code editor`,
        code_content: code,
        language,
        is_public: false,
      });
      
      if (result) {
        toast.success('Project saved successfully!');
      } else {
        toast.error('Failed to save project. Please try again.');
      }
    } catch (error) {
      console.error('Error saving project:', error);
      toast.error('Failed to save project. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };


  const updatePreview = () => {
    if (!iframeRef.current) return;
    
    const iframe = iframeRef.current;
    const doc = iframe.contentDocument || iframe.contentWindow?.document;
    
    if (!doc) return;

    try {
      if (language === 'html' || language === 'react') {
        let content = code;
        
        if (language === 'react') {
          // Enhanced React to HTML conversion for preview
          content = `
            <!DOCTYPE html>
            <html>
            <head>
              <meta charset="UTF-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <title>React Preview</title>
              <script crossorigin src="https://unpkg.com/react@18/umd/react.development.js"></script>
              <script crossorigin src="https://unpkg.com/react-dom@18/umd/react-dom.development.js"></script>
              <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
              <style>
                body { margin: 0; padding: 20px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }
                .error { color: #dc3545; background: #f8d7da; padding: 15px; border-radius: 5px; margin: 10px 0; }
              </style>
            </head>
            <body>
              <div id="root"></div>
              <script type="text/babel">
                const { createElement, useState, useEffect } = React;
                const { render } = ReactDOM;
                
                try {
                  // Execute the user's code
                  ${code}
                  
                  // Try to find and render a component
                  const rootElement = document.getElementById('root');
                  
                  // Look for common component names or default export
                  let ComponentToRender = null;
                  
                  if (typeof App !== 'undefined') {
                    ComponentToRender = App;
                  } else if (typeof Component !== 'undefined') {
                    ComponentToRender = Component;
                  } else if (typeof MyComponent !== 'undefined') {
                    ComponentToRender = MyComponent;
                  } else {
                    // Try to find any function that looks like a component
                    const globalVars = Object.keys(window);
                    for (let varName of globalVars) {
                      const variable = window[varName];
                      if (typeof variable === 'function' && 
                          varName[0] === varName[0].toUpperCase() && 
                          varName !== 'React' && varName !== 'ReactDOM') {
                        ComponentToRender = variable;
                        break;
                      }
                    }
                  }
                  
                  if (ComponentToRender) {
                    render(createElement(ComponentToRender), rootElement);
                  } else {
                    rootElement.innerHTML = '<div style="padding: 20px; color: #666;">No component found to render. Make sure your component is named App, Component, or starts with a capital letter.</div>';
                  }
                  
                } catch (error) {
                  console.error('React preview error:', error);
                  document.getElementById('root').innerHTML = '<div class="error"><strong>Error:</strong> ' + error.message + '</div>';
                }
              </script>
            </body>
            </html>
          `;
        } else if (language === 'html') {
          // For HTML, add some basic styling if no CSS is present
          if (!content.includes('<style>') && !content.includes('</head>')) {
            content = content.replace('<head>', '<head>\n<style>body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; margin: 20px; }</style>');
          }
        }
        
        doc.open();
        doc.write(content);
        doc.close();
      } else if (language === 'css') {
        // CSS preview with sample HTML
        doc.open();
        doc.write(`
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="UTF-8">
            <title>CSS Preview</title>
            <style>
              ${code}
            </style>
          </head>
          <body>
            <div class="preview-container">
              <h1>CSS Preview</h1>
              <p>This is a sample paragraph to demonstrate your CSS styles.</p>
              <button>Sample Button</button>
              <div class="box">Sample Box</div>
            </div>
          </body>
          </html>
        `);
        doc.close();
      } else if (language === 'javascript') {
        // JavaScript preview with console output
        doc.open();
        doc.write(`
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="UTF-8">
            <title>JavaScript Preview</title>
            <style>
              body { font-family: monospace; padding: 20px; background: #1e1e1e; color: #d4d4d4; }
              .console { background: #000; color: #00ff00; padding: 15px; border-radius: 5px; margin-top: 20px; }
              .error { color: #ff6b6b; }
            </style>
          </head>
          <body>
            <h3>JavaScript Output:</h3>
            <div id="output" class="console"></div>
            <script>
              const originalConsole = console.log;
              const outputDiv = document.getElementById('output');
              
              console.log = function(...args) {
                outputDiv.innerHTML += args.join(' ') + '\\n';
                originalConsole(...args);
              };
              
              try {
                ${code}
              } catch (error) {
                outputDiv.innerHTML += '<span class="error">Error: ' + error.message + '</span>\\n';
              }
            </script>
          </body>
          </html>
        `);
        doc.close();
      } else if (language === 'php') {
        // PHP preview with explanation
        doc.open();
        doc.write(`
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="UTF-8">
            <title>PHP Code Preview</title>
            <style>
              body { font-family: -apple-system, BlinkMacSystemFont, sans-serif; margin: 0; background: #f8f9fa; }
              .header { background: #4f46e5; color: white; padding: 15px 20px; }
              .content { padding: 20px; }
              .code-block { background: #1e1e1e; color: #d4d4d4; padding: 20px; border-radius: 8px; overflow-x: auto; font-family: 'Fira Code', monospace; line-height: 1.6; }
              .info { background: #e0f2fe; border-left: 4px solid #0288d1; padding: 15px; margin: 20px 0; border-radius: 4px; }
            </style>
          </head>
          <body>
            <div class="header">
              <h2 style="margin: 0;">PHP Code Preview</h2>
            </div>
            <div class="content">
              <div class="info">
                <strong>Note:</strong> PHP is a server-side language and cannot be executed in the browser. This is a preview of your PHP code.
              </div>
              <div class="code-block">
                <pre><code>${code.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</code></pre>
              </div>
            </div>
          </body>
          </html>
        `);
        doc.close();
      } else if (language === 'python') {
        // Python preview with explanation
        doc.open();
        doc.write(`
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="UTF-8">
            <title>Python Code Preview</title>
            <style>
              body { font-family: -apple-system, BlinkMacSystemFont, sans-serif; margin: 0; background: #f8f9fa; }
              .header { background: #306998; color: white; padding: 15px 20px; }
              .content { padding: 20px; }
              .code-block { background: #1e1e1e; color: #d4d4d4; padding: 20px; border-radius: 8px; overflow-x: auto; font-family: 'Fira Code', monospace; line-height: 1.6; }
              .info { background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; border-radius: 4px; }
            </style>
          </head>
          <body>
            <div class="header">
              <h2 style="margin: 0;">Python Code Preview</h2>
            </div>
            <div class="content">
              <div class="info">
                <strong>Note:</strong> Python is a server-side language and cannot be executed in the browser. This is a preview of your Python code.
              </div>
              <div class="code-block">
                <pre><code>${code.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</code></pre>
              </div>
            </div>
          </body>
          </html>
        `);
        doc.close();
      } else if (language === 'java') {
        // Java preview with explanation
        doc.open();
        doc.write(`
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="UTF-8">
            <title>Java Code Preview</title>
            <style>
              body { font-family: -apple-system, BlinkMacSystemFont, sans-serif; margin: 0; background: #f8f9fa; }
              .header { background: #ed8b00; color: white; padding: 15px 20px; }
              .content { padding: 20px; }
              .code-block { background: #1e1e1e; color: #d4d4d4; padding: 20px; border-radius: 8px; overflow-x: auto; font-family: 'Fira Code', monospace; line-height: 1.6; }
              .info { background: #d1ecf1; border-left: 4px solid #17a2b8; padding: 15px; margin: 20px 0; border-radius: 4px; }
            </style>
          </head>
          <body>
            <div class="header">
              <h2 style="margin: 0;">Java Code Preview</h2>
            </div>
            <div class="content">
              <div class="info">
                <strong>Note:</strong> Java is a compiled language and cannot be executed in the browser. This is a preview of your Java code.
              </div>
              <div class="code-block">
                <pre><code>${code.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</code></pre>
              </div>
            </div>
          </body>
          </html>
        `);
        doc.close();
      } else if (language === 'c' || language === 'cpp') {
        // C/C++ preview with explanation
        const langName = language === 'cpp' ? 'C++' : 'C';
        const color = language === 'cpp' ? '#004482' : '#a8b9cc';
        doc.open();
        doc.write(`
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="UTF-8">
            <title>${langName} Code Preview</title>
            <style>
              body { font-family: -apple-system, BlinkMacSystemFont, sans-serif; margin: 0; background: #f8f9fa; }
              .header { background: ${color}; color: white; padding: 15px 20px; }
              .content { padding: 20px; }
              .code-block { background: #1e1e1e; color: #d4d4d4; padding: 20px; border-radius: 8px; overflow-x: auto; font-family: 'Fira Code', monospace; line-height: 1.6; }
              .info { background: #f8d7da; border-left: 4px solid #dc3545; padding: 15px; margin: 20px 0; border-radius: 4px; }
            </style>
          </head>
          <body>
            <div class="header">
              <h2 style="margin: 0;">${langName} Code Preview</h2>
            </div>
            <div class="content">
              <div class="info">
                <strong>Note:</strong> ${langName} is a compiled language and cannot be executed in the browser. This is a preview of your ${langName} code.
              </div>
              <div class="code-block">
                <pre><code>${code.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</code></pre>
              </div>
            </div>
          </body>
          </html>
        `);
        doc.close();
      } else {
        // Generic syntax-highlighted code display for other languages
        const languageColors = {
          typescript: '#3178c6',
          json: '#000000',
          xml: '#e34c26'
        };
        const bgColor = languageColors[language] || '#6366f1';
        
        doc.open();
        doc.write(`
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="UTF-8">
            <title>${language.toUpperCase()} Code Preview</title>
            <style>
              body { font-family: -apple-system, BlinkMacSystemFont, sans-serif; margin: 0; background: #f8f9fa; }
              .header { background: ${bgColor}; color: white; padding: 15px 20px; }
              .content { padding: 20px; }
              .code-block { background: #1e1e1e; color: #d4d4d4; padding: 20px; border-radius: 8px; overflow-x: auto; font-family: 'Fira Code', monospace; line-height: 1.6; }
              .info { background: #e3f2fd; border-left: 4px solid #2196f3; padding: 15px; margin: 20px 0; border-radius: 4px; }
            </style>
          </head>
          <body>
            <div class="header">
              <h2 style="margin: 0;">${language.toUpperCase()} Code Preview</h2>
            </div>
            <div class="content">
              <div class="info">
                <strong>Info:</strong> This is a preview of your ${language.toUpperCase()} code with syntax highlighting.
              </div>
              <div class="code-block">
                <pre><code>${code.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</code></pre>
              </div>
            </div>
          </body>
          </html>
        `);
        doc.close();
      }
    } catch (error) {
      console.error('Preview update error:', error);
      doc.open();
      doc.write(`
        <!DOCTYPE html>
        <html>
        <head><title>Preview Error</title></head>
        <body style="padding: 20px; font-family: sans-serif;">
          <div style="color: #dc3545; background: #f8d7da; padding: 15px; border-radius: 5px;">
            <strong>Preview Error:</strong> ${error.message || 'Unknown error occurred'}
          </div>
        </body>
        </html>
      `);
      doc.close();
    }
  };

  // Debounced preview update for better performance
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      updatePreview();
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [code, language]);

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
            Code Preview
          </h1>
        </div>
      </header>

      <ResizablePanelGroup direction="horizontal" className="flex-1">
        <ResizablePanel defaultSize={50} minSize={30}>
          <div className="h-full flex flex-col bg-card border-r">
            <div className="p-4 border-b">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold">Code Input</h2>
                <div className="flex items-center gap-3">
                  <Button 
                    onClick={handleSave} 
                    disabled={isSaving || !user}
                    size="sm"
                    className="flex items-center gap-2"
                    title={!user ? "Please log in to save" : "Save project"}
                  >
                    <Save className="h-4 w-4" />
                    {isSaving ? 'Saving...' : 'Save'}
                  </Button>
                  <Select value={language} onValueChange={setLanguage}>
                    <SelectTrigger className="w-40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {LANGUAGES.map((lang) => (
                        <SelectItem key={lang.value} value={lang.value}>
                          {lang.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
            
            <div className="flex-1 p-4">
              <Label htmlFor="code-input" className="mb-2 block">
                Paste your {LANGUAGES.find(l => l.value === language)?.label} code:
              </Label>
              <Textarea
                id="code-input"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="h-full min-h-[400px] font-mono text-sm"
                placeholder={`Paste your ${language.toUpperCase()} code here...`}
              />
            </div>
          </div>
        </ResizablePanel>

        <ResizableHandle />

        <ResizablePanel defaultSize={50}>
          <div className="h-full flex flex-col">
            <div className="border-b bg-card px-4 py-3 flex items-center justify-between">
              <h2 className="font-semibold">Live Preview</h2>
            </div>
            <div className="flex-1">
              <iframe
                ref={iframeRef}
                className="w-full h-full border-0"
                title="Code Preview"
                sandbox="allow-scripts allow-same-origin"
              />
            </div>
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
};

export default Editor;