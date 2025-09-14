import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { 
  Copy, 
  ThumbsUp, 
  ThumbsDown, 
  Eye, 
  Code2, 
  RotateCcw, 
  ChevronDown,
  ChevronUp,
  Loader2,
  Heart
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import Monaco from '@monaco-editor/react';

export interface ChatMessageData {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  code?: string;
  language?: string;
  preview?: string;
  thinking?: boolean;
  thinkingDuration?: number;
  editsCount?: number;
  canRevert?: boolean;
  isGenerating?: boolean;
}

interface ChatMessageProps {
  message: ChatMessageData;
  onRevert?: (messageId: string) => void;
  onRegenerateFromHere?: (messageId: string) => void;
  onPreviewToggle?: (messageId: string) => void;
}

const ChatMessage = ({ 
  message, 
  onRevert, 
  onRegenerateFromHere,
  onPreviewToggle 
}: ChatMessageProps) => {
  const [showCode, setShowCode] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [isCodeExpanded, setIsCodeExpanded] = useState(false);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
  };

  const handleThumbsUp = () => {
    toast.success('Feedback recorded');
  };

  const handleThumbsDown = () => {
    toast.success('Feedback recorded');
  };

  if (message.role === 'user') {
    return (
      <div className="flex justify-end mb-6">
        <div className="max-w-[80%] bg-primary text-primary-foreground rounded-lg px-4 py-3">
          <p className="whitespace-pre-wrap">{message.content}</p>
          <div className="text-xs opacity-70 mt-2">
            {message.timestamp.toLocaleTimeString()}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-start gap-3 mb-6">
      <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center flex-shrink-0 mt-1">
        <Heart className="w-4 h-4 text-primary-foreground" />
      </div>
      
      <div className="flex-1 min-w-0">
        {message.thinking && (
          <div className="flex items-center gap-2 text-muted-foreground text-sm mb-2">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>
              {message.isGenerating 
                ? 'Thinking...' 
                : `Thought for ${message.thinkingDuration || 0} seconds`
              }
            </span>
          </div>
        )}

        <div className="bg-card border rounded-lg p-4">
          <div className="prose prose-sm max-w-none">
            <p className="whitespace-pre-wrap mb-3">{message.content}</p>
          </div>

          {message.editsCount && (
            <div className="flex items-center gap-2 mb-3">
              <Badge variant="secondary" className="text-xs">
                {message.editsCount} edit{message.editsCount > 1 ? 's' : ''} made
              </Badge>
            </div>
          )}

          {message.code && (
            <div className="mt-4">
              <Collapsible open={isCodeExpanded} onOpenChange={setIsCodeExpanded}>
                <CollapsibleTrigger asChild>
                  <Button variant="outline" size="sm" className="mb-2">
                    <Code2 className="w-4 h-4 mr-2" />
                    {isCodeExpanded ? 'Hide' : 'Show'} Code
                    {isCodeExpanded ? 
                      <ChevronUp className="w-4 h-4 ml-2" /> : 
                      <ChevronDown className="w-4 h-4 ml-2" />
                    }
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="border rounded-md overflow-hidden bg-background">
                    <div className="flex items-center justify-between px-3 py-2 border-b bg-muted/50">
                      <span className="text-xs font-medium text-muted-foreground">
                        {message.language || 'code'}
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyToClipboard(message.code || '')}
                        className="h-6 px-2"
                      >
                        <Copy className="w-3 h-3" />
                      </Button>
                    </div>
                    <div className="h-48">
                      <Monaco
                        height="100%"
                        language={message.language === 'react' ? 'javascript' : message.language}
                        value={message.code}
                        theme="vs-dark"
                        options={{
                          readOnly: true,
                          minimap: { enabled: false },
                          fontSize: 12,
                          wordWrap: 'on',
                          automaticLayout: true,
                          scrollBeyondLastLine: false,
                        }}
                      />
                    </div>
                  </div>
                </CollapsibleContent>
              </Collapsible>
            </div>
          )}

          {message.preview && (
            <div className="mt-4">
              <Collapsible open={showPreview} onOpenChange={setShowPreview}>
                <CollapsibleTrigger asChild>
                  <Button variant="outline" size="sm" className="mb-2">
                    <Eye className="w-4 h-4 mr-2" />
                    {showPreview ? 'Hide' : 'Show'} Preview
                    {showPreview ? 
                      <ChevronUp className="w-4 h-4 ml-2" /> : 
                      <ChevronDown className="w-4 h-4 ml-2" />
                    }
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="border rounded-md overflow-hidden">
                    <iframe
                      srcDoc={message.preview}
                      className="w-full h-64 border-0"
                      title="Code Preview"
                      sandbox="allow-scripts allow-same-origin"
                    />
                  </div>
                </CollapsibleContent>
              </Collapsible>
            </div>
          )}

          <div className="flex items-center gap-2 mt-4 pt-3 border-t">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleThumbsUp}
              className="h-8 px-2"
            >
              <ThumbsUp className="w-3 h-3" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleThumbsDown}
              className="h-8 px-2"
            >
              <ThumbsDown className="w-3 h-3" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => copyToClipboard(message.content)}
              className="h-8 px-2"
            >
              <Copy className="w-3 h-3" />
            </Button>
            {message.canRevert && onRevert && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onRevert(message.id)}
                className="h-8 px-2"
              >
                <RotateCcw className="w-3 h-3 mr-1" />
                Revert
              </Button>
            )}
            {onRegenerateFromHere && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onRegenerateFromHere(message.id)}
                className="h-8 px-2 text-xs"
              >
                Regenerate from here
              </Button>
            )}
          </div>
        </div>
        
        <div className="text-xs text-muted-foreground mt-2">
          {message.timestamp.toLocaleTimeString()}
        </div>
      </div>
    </div>
  );
};

export default ChatMessage;