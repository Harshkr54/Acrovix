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
  onClose,
  onClearHistory,
  geminiAvailable
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
      className="fixed bottom-24 right-4 sm:right-6 z-50 w-[92vw] sm:w-[380px] h-[560px] max-h-[calc(100vh-7rem)] flex flex-col bg-white/95 dark:bg-[#102936]/95 backdrop-blur-xl border border-acrovix-teal-primary/20 dark:border-acrovix-teal-bright/30 rounded-2xl shadow-2xl shadow-acrovix-teal-primary/10 animate-chat-slide-up overflow-hidden"
    >
      {/* Header */}
      <AIChatHeader
        onMinimize={onMinimize}
        onClose={onClose}
        onClearHistory={onClearHistory}
        geminiAvailable={geminiAvailable}
      />

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto p-4 ai-message-scrollbar bg-acrovix-bg dark:bg-[#07151F]">
        {messages.map((msg) => (
          <React.Fragment key={msg.id}>
            <AIMessage message={msg} onNavigate={onNavigate} />
            {/* Show Quick Actions after AI messages that have showQuickActions=true */}
            {msg.sender === 'ai' && msg.showQuickActions && (
              <AIQuickActions onSelectAction={onSelectQuickAction} />
            )}
          </React.Fragment>
        ))}

        {/* Typing Indicator */}
        {isTyping && (
          <div className="flex items-center space-x-2 mb-3.5 pl-1">
            <div className="bg-white dark:bg-[#142F3D] border border-acrovix-teal-primary/20 rounded-2xl rounded-tl-xs px-4 py-2.5 shadow-xs flex items-center space-x-1.5">
              <span className="typing-dot" />
              <span className="typing-dot" />
              <span className="typing-dot" />
            </div>
            <span className="text-[11px] text-acrovix-muted italic">
              {geminiAvailable ? 'AI is thinking...' : 'Assistant is typing...'}
            </span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Gemini status badge */}
      {geminiAvailable && (
        <div className="px-4 py-1.5 bg-emerald-50 dark:bg-emerald-900/20 border-t border-emerald-200/50 dark:border-emerald-700/30 flex items-center space-x-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">Powered by Gemini AI</span>
        </div>
      )}

      {/* Input */}
      <AIInput onSendMessage={onSendMessage} disabled={isTyping} />
    </div>
  );
}
