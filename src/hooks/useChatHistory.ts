import { useState, useCallback } from 'react';
import { ChatMessageData } from '@/components/chat/ChatMessage';

export const useChatHistory = () => {
  const [messages, setMessages] = useState<ChatMessageData[]>([]);

  const addMessage = useCallback((message: Omit<ChatMessageData, 'id' | 'timestamp'>) => {
    const newMessage: ChatMessageData = {
      ...message,
      id: Date.now().toString(),
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, newMessage]);
    return newMessage.id;
  }, []);

  const updateMessage = useCallback((id: string, updates: Partial<ChatMessageData>) => {
    setMessages(prev => prev.map(msg => 
      msg.id === id ? { ...msg, ...updates } : msg
    ));
  }, []);

  const removeMessage = useCallback((id: string) => {
    setMessages(prev => prev.filter(msg => msg.id !== id));
  }, []);

  const revertToMessage = useCallback((messageId: string) => {
    const messageIndex = messages.findIndex(msg => msg.id === messageId);
    if (messageIndex !== -1) {
      setMessages(prev => prev.slice(0, messageIndex + 1));
    }
  }, [messages]);

  const clearHistory = useCallback(() => {
    setMessages([]);
  }, []);

  return {
    messages,
    addMessage,
    updateMessage,
    removeMessage,
    revertToMessage,
    clearHistory,
  };
};