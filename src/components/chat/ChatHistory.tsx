import { useEffect, useRef } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import ChatMessage, { ChatMessageData } from './ChatMessage';

interface ChatHistoryProps {
  messages: ChatMessageData[];
  onRevert?: (messageId: string) => void;
  onRegenerateFromHere?: (messageId: string) => void;
  onPreviewToggle?: (messageId: string) => void;
}

const ChatHistory = ({ 
  messages, 
  onRevert, 
  onRegenerateFromHere,
  onPreviewToggle 
}: ChatHistoryProps) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Auto-scroll to bottom when new messages are added
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  if (messages.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center text-muted-foreground">
          <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl">💬</span>
          </div>
          <h3 className="text-lg font-medium mb-2">Start a conversation</h3>
          <p className="text-sm">
            Ask me to build something, modify your code, or help with your project.
          </p>
        </div>
      </div>
    );
  }

  return (
    <ScrollArea className="flex-1">
      <div ref={scrollRef} className="p-4 space-y-4">
        {messages.map((message) => (
          <ChatMessage
            key={message.id}
            message={message}
            onRevert={onRevert}
            onRegenerateFromHere={onRegenerateFromHere}
            onPreviewToggle={onPreviewToggle}
          />
        ))}
      </div>
    </ScrollArea>
  );
};

export default ChatHistory;