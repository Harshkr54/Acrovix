import React, { useRef, useEffect } from 'react';
import { AIChatHeader } from './AIChatHeader';
import { AIMessage } from './AIMessage';
import { AIQuickActions } from './AIQuickActions';
import { AIInput } from './AIInput';

export function AIChatWindow({
  messages,
  isTyping,
  onSendMessage,
  onSelectQuickAction,
  onNavigate,
  onMinimize,
  onClose
}) {
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  return (
    <div
      role="dialog"
      aria-label="ACROVIX Assistant Chat Window"
      className="fixed bottom-24 right-4 sm:right-6 z-50 w-[92vw] sm:w-[380px] h-[550px] max-h-[calc(100vh-7rem)] flex flex-col bg-white/95 dark:bg-[#102936]/95 backdrop-blur-xl border border-acrovix-teal-primary/20 dark:border-acrovix-teal-bright/30 rounded-2xl shadow-2xl shadow-acrovix-teal-primary/10 animate-chat-slide-up overflow-hidden"
    >
      {/* Header */}
      <AIChatHeader onMinimize={onMinimize} onClose={onClose} />

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto p-4 ai-message-scrollbar bg-acrovix-bg dark:bg-[#07151F]">
        {messages.map((msg) => (
          <AIMessage key={msg.id} message={msg} onNavigate={onNavigate} />
        ))}

        {/* Quick Actions if welcome message is shown */}
        {messages.length <= 1 && (
          <AIQuickActions onSelectAction={onSelectQuickAction} />
        )}

        {/* Typing Indicator */}
        {isTyping && (
          <div className="flex items-center space-x-2 mb-3.5 pl-1">
            <div className="bg-white dark:bg-[#142F3D] border border-acrovix-teal-primary/20 rounded-2xl rounded-tl-xs px-4 py-2.5 shadow-xs flex items-center space-x-1.5">
              <span className="typing-dot"></span>
              <span className="typing-dot"></span>
              <span className="typing-dot"></span>
            </div>
            <span className="text-[11px] text-acrovix-muted italic">Assistant is typing...</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <AIInput onSendMessage={onSendMessage} disabled={isTyping} />
    </div>
  );
}
