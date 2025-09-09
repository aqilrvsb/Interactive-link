import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Send, Settings } from 'lucide-react';

interface ChatInputProps {
  onSendMessage: (message: string) => void;
  onToggleSettings?: () => void;
  disabled?: boolean;
  placeholder?: string;
}

const ChatInput = ({ 
  onSendMessage, 
  onToggleSettings,
  disabled = false,
  placeholder = "Ask Lovable..."
}: ChatInputProps) => {
  const [message, setMessage] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim() && !disabled) {
      onSendMessage(message.trim());
      setMessage('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <div className="border-t bg-background p-4">
      <form onSubmit={handleSubmit} className="flex gap-3">
        <div className="flex-1 relative">
          <Textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={disabled}
            className="min-h-[44px] max-h-32 resize-none pr-12"
            rows={1}
          />
          <div className="absolute right-2 bottom-2 flex gap-1">
            {onToggleSettings && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={onToggleSettings}
                className="h-8 w-8 p-0"
              >
                <Settings className="h-4 w-4" />
              </Button>
            )}
            <Button
              type="submit"
              size="sm"
              disabled={!message.trim() || disabled}
              className="h-8 w-8 p-0"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </form>
      <div className="flex justify-between items-center mt-2 text-xs text-muted-foreground">
        <span>Press Enter to send, Shift+Enter for new line</span>
        <div className="flex gap-2">
          <span>Chat</span>
          <span>•</span>
          <span>Edit</span>
        </div>
      </div>
    </div>
  );
};

export default ChatInput;