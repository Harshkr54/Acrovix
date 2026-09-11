import React, { useRef, useEffect, useState } from 'react';
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
  const [showClearPopup, setShowClearPopup] = useState(false);

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
        onClearRequest={() => setShowClearPopup(true)}
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

      {/* Clear Confirmation Popup */}
      {showClearPopup && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm rounded-2xl">
          <div className="bg-white dark:bg-[#102A43] p-6 rounded-xl shadow-xl border border-acrovix-teal-primary/20 w-3/4 max-w-sm mx-4 transform animate-scale-in">
            <h4 className="text-lg font-semibold text-gray-800 dark:text-white mb-2 text-center">
              Clear Chat?
            </h4>
            <p className="text-sm text-gray-600 dark:text-gray-300 text-center mb-6">
              Are you sure you want to delete the whole chat?
            </p>
            <div className="flex space-x-3 justify-center">
              <button
                onClick={() => setShowClearPopup(false)}
                className="px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-white/10 hover:bg-gray-200 dark:hover:bg-white/20 rounded-lg transition-colors"
              >
                No, Keep
              </button>
              <button
                onClick={() => {
                  onClearHistory?.();
                  setShowClearPopup(false);
                }}
                className="px-4 py-2 text-sm font-medium text-white bg-rose-500 hover:bg-rose-600 rounded-lg transition-colors shadow-sm"
              >
                Yes, Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
