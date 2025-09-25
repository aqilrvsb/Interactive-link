import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useProjects, Project } from '@/hooks/useProjects';
import { useChatHistory } from '@/hooks/useChatHistory';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'react-hot-toast';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import ChatHistory from '@/components/chat/ChatHistory';
import ChatInput from '@/components/chat/ChatInput';
import ProjectSettings from '@/components/chat/ProjectSettings';
import { ChatMessageData } from '@/components/chat/ChatMessage';

const LANGUAGES = [
  { value: 'javascript', label: 'JavaScript', extension: 'js' },
  { value: 'typescript', label: 'TypeScript', extension: 'ts' },
  { value: 'python', label: 'Python', extension: 'py' },
  { value: 'html', label: 'HTML', extension: 'html' },
  { value: 'css', label: 'CSS', extension: 'css' },
  { value: 'react', label: 'React', extension: 'jsx' },
];

const ChatEditor = () => {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { projects, createProject, updateProject } = useProjects();
  const { messages, addMessage, updateMessage, revertToMessage } = useChatHistory();
  
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(!!projectId);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [currentCode, setCurrentCode] = useState('// Start coding here...');
  
  const [settings, setSettings] = useState({
    title: '',
    description: '',
    language: 'javascript',
    ai_model: 'gpt-4',
  });

  const currentThinkingMessageId = useRef<string | null>(null);

  useEffect(() => {
    if (projectId && projects.length > 0) {
      const foundProject = projects.find(p => p.id === projectId);
      if (foundProject) {
        setProject(foundProject);
        setSettings({
          title: foundProject.title,
          description: foundProject.description || '',
          language: foundProject.language,
          ai_model: foundProject.ai_model || 'gpt-4',
        });
        setCurrentCode(foundProject.code_content || '// Start coding here...');
      }
      setLoading(false);
    } else if (!projectId) {
      setLoading(false);
    }
  }, [projectId, projects]);

  const generatePreview = (code: string, language: string): string => {
    if (language === 'html' || language === 'react') {
      let content = code;
      
      if (language === 'react') {
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
            </style>
          </head>
          <body>
            <div id="root"></div>
            <script type="text/babel">
              try {
                ${content}
                if (typeof App !== 'undefined') {
                  ReactDOM.render(React.createElement(App), document.getElementById('root'));
                }
              } catch (error) {
                document.getElementById('root').innerHTML = '<div style="color: red; padding: 20px;">Error: ' + error.message + '</div>';
              }
            </script>
          </body>
          </html>
        `;
      } else if (language === 'html') {
        if (!content.includes('<style>') && !content.includes('</head>')) {
          content = content.replace('<head>', '<head>\n<style>body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; margin: 20px; }</style>');
        }
      }
      return content;
    } else if (language === 'css') {
      return `
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
      `;
    } else if (language === 'javascript') {
      return `
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
      `;
    }
    
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Code Preview</title>
        <style>
          body { font-family: 'Fira Code', 'SF Mono', Consolas, monospace; margin: 0; background: #1e1e1e; }
          .code-container { padding: 20px; color: #d4d4d4; line-height: 1.6; }
          .language-label { background: #007acc; color: white; padding: 5px 15px; margin: 0; font-size: 12px; text-transform: uppercase; }
        </style>
      </head>
      <body>
        <div class="language-label">${language}</div>
        <div class="code-container">
          <pre><code>${code.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</code></pre>
        </div>
      </body>
      </html>
    `;
  };

  const handleSendMessage = async (message: string) => {
    // Add user message
    addMessage({
      role: 'user',
      content: message,
    });

    // Add thinking message
    const thinkingStartTime = Date.now();
    const thinkingMessageId = addMessage({
      role: 'assistant',
      content: 'Let me help you with that...',
      thinking: true,
      isGenerating: true,
    });
    
    currentThinkingMessageId.current = thinkingMessageId;
    setGenerating(true);

    try {
      const { data, error } = await supabase.functions.invoke('generate-code', {
        body: {
          prompt: message,
          model: settings.ai_model,
          language: settings.language,
          existingCode: currentCode,
          chatHistory: messages.slice(-5).map(msg => ({
            role: msg.role,
            content: msg.content
          })),
        },
      });

      if (error) throw error;

      const thinkingDuration = Math.ceil((Date.now() - thinkingStartTime) / 1000);
      
      if (data?.generatedCode) {
        setCurrentCode(data.generatedCode);
        
        // Update thinking message to show completion
        updateMessage(thinkingMessageId, {
          content: data.explanation || 'Code generated successfully!',
          code: data.generatedCode,
          language: settings.language,
          preview: generatePreview(data.generatedCode, settings.language),
          thinking: false,
          thinkingDuration,
          editsCount: 1,
          canRevert: true,
          isGenerating: false,
        });
        
        toast.success('Code generated successfully!');
      } else {
        updateMessage(thinkingMessageId, {
          content: 'I apologize, but I encountered an issue generating the code. Please try again.',
          thinking: false,
          thinkingDuration,
          isGenerating: false,
        });
      }
    } catch (error: any) {
      console.error('Generation error:', error);
      const thinkingDuration = Math.ceil((Date.now() - thinkingStartTime) / 1000);
      
      updateMessage(thinkingMessageId, {
        content: 'I apologize, but I encountered an error while processing your request. Please try again.',
        thinking: false,
        thinkingDuration,
        isGenerating: false,
      });
      
      toast.error('Failed to generate code. Please try again.');
    } finally {
      setGenerating(false);
      currentThinkingMessageId.current = null;
    }
  };

  const handleSave = async () => {
    if (!settings.title.trim()) {
      toast.error('Please enter a project title');
      return;
    }

    setSaving(true);
    try {
      const projectData = {
        title: settings.title,
        description: settings.description,
        code_content: currentCode,
        language: settings.language,
        ai_model: settings.ai_model,
        prompt: messages.filter(m => m.role === 'user').pop()?.content || '',
        is_public: false,
      };

      if (project) {
        await updateProject(project.id, projectData);
        toast.success('Project saved successfully!');
      } else {
        const newProject = await createProject(projectData);
        if (newProject) {
          navigate(`/chat-editor/${newProject.id}`, { replace: true });
          toast.success('Project created successfully!');
        }
      }
    } catch (error) {
      console.error('Save error:', error);
      toast.error('Failed to save project. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleDownload = async () => {
    const zip = new JSZip();
    const selectedLang = LANGUAGES.find(l => l.value === settings.language);
    const extension = selectedLang?.extension || 'txt';
    
    zip.file(`${settings.title || 'project'}.${extension}`, currentCode);
    zip.file('README.md', `# ${settings.title}\n\n${settings.description}\n\nGenerated with AI using ${settings.ai_model}`);
    
    const blob = await zip.generateAsync({ type: 'blob' });
    saveAs(blob, `${settings.title || 'project'}.zip`);
  };

  const handleRevert = (messageId: string) => {
    revertToMessage(messageId);
    // You might want to revert the code to a previous state here
    toast.success('Reverted to previous state');
  };

  if (loading) {
    return (
      <div className="h-screen flex flex-col">
        <header className="border-b bg-card px-4 py-3">
          <Skeleton className="h-6 w-48" />
        </header>
        <div className="flex-1 p-4">
          <Skeleton className="h-full w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-background">
      <header className="border-b bg-card px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => navigate('/dashboard')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Dashboard
          </Button>
          <h1 className="text-lg font-semibold">
            {settings.title || (project ? 'Edit Project' : 'New Project')}
          </h1>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        <ProjectSettings
          settings={settings}
          onSettingsChange={setSettings}
          onSave={handleSave}
          onDownload={handleDownload}
          saving={saving}
        />
        
        <div className="flex-1 flex flex-col">
          <ChatHistory
            messages={messages}
            onRevert={handleRevert}
            onRegenerateFromHere={(messageId) => {
              // Find the message and regenerate from that point
              const message = messages.find(m => m.id === messageId);
              if (message && message.role === 'user') {
                handleSendMessage(message.content);
              }
            }}
          />
          
          <ChatInput
            onSendMessage={handleSendMessage}
            disabled={generating}
            placeholder="Ask me to build something, modify your code, or help with your project..."
          />
        </div>
      </div>
    </div>
  );
};

export default ChatEditor;